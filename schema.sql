-- ============================================================
-- BlessPay Database Schema - CLEAN RESET
-- Drop existing tables and recreate from scratch
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ── Drop existing tables (order matters due to foreign keys) ─
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ── Drop existing trigger function if exists ─────────────────
DROP FUNCTION IF EXISTS update_updated_at CASCADE;


-- ── 1. USERS TABLE ───────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255),
    google_id       VARCHAR(255) UNIQUE,
    avatar_url      VARCHAR(500),
    role            VARCHAR(20) NOT NULL DEFAULT 'member'
                        CHECK (role = 'member'),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended')),
    logged_in       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_auth_check CHECK (
        password_hash IS NOT NULL OR google_id IS NOT NULL
    )
);

CREATE INDEX idx_users_email     ON users (email);
CREATE INDEX idx_users_google_id ON users (google_id);
CREATE INDEX idx_users_status    ON users (status);


-- ── 2. ADMINS TABLE ──────────────────────────────────────────
CREATE TABLE admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'admin'
                        CHECK (role IN ('admin', 'treasurer')),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admins_email  ON admins (email);
CREATE INDEX idx_admins_role   ON admins (role);
CREATE INDEX idx_admins_status ON admins (status);


-- ── 3. TRANSACTIONS TABLE ────────────────────────────────────
CREATE TABLE transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount                  NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    phone                   VARCHAR(20) NOT NULL,
    type                    VARCHAR(20) NOT NULL
                                CHECK (type IN ('tithe', 'offering')),
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    checkout_request_id     VARCHAR(255),
    mpesa_receipt_number    VARCHAR(100),
    mpesa_transaction_date  VARCHAR(50),
    mpesa_phone_number      VARCHAR(20),
    failure_reason          TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id  ON transactions (user_id);
CREATE INDEX idx_transactions_status   ON transactions (status);
CREATE INDEX idx_transactions_type     ON transactions (type);
CREATE INDEX idx_transactions_checkout ON transactions (checkout_request_id);
CREATE INDEX idx_transactions_created  ON transactions (created_at DESC);


-- ── 4. AUTO-UPDATE updated_at TRIGGER ───────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 5. DISABLE ROW LEVEL SECURITY ───────────────────────────
ALTER TABLE users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins       DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
