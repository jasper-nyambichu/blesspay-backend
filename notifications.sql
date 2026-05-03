-- ============================================================
-- BlessPay — Notifications Table
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('success', 'info', 'warning', 'error')),
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications (created_at DESC);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
