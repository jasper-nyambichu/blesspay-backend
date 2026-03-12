const ROLES = Object.freeze({ MEMBER: 'member', ADMIN: 'admin' })

const ACCOUNT_STATUS = Object.freeze({ ACTIVE: 'active', SUSPENDED: 'suspended' })

const TRANSACTION_TYPES = Object.freeze({ TITHE: 'tithe', OFFERING: 'offering' })

const TRANSACTION_STATUS = Object.freeze({
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
})

const PAYMENT_METHODS = Object.freeze({ MPESA: 'mpesa' })

const JWT = Object.freeze({
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000,
})

const BCRYPT = Object.freeze({ SALT_ROUNDS: 12 })

const RATE_LIMIT = Object.freeze({
    GLOBAL: { WINDOW_MS: 15 * 60 * 1000, MAX_REQUESTS: 100 },
    AUTH: { WINDOW_MS: 15 * 60 * 1000, MAX_REQUESTS: 10 },
    PAYMENT: { WINDOW_MS: 60 * 1000, MAX_REQUESTS: 3 },
})

const HTTP_STATUS = Object.freeze({
    OK: 200, CREATED: 201, NO_CONTENT: 204,
    BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403,
    NOT_FOUND: 404, CONFLICT: 409, TOO_MANY_REQUESTS: 429, INTERNAL_ERROR: 500,
})

const PAGINATION = Object.freeze({ DEFAULT_PAGE: 1, DEFAULT_LIMIT: 10, MAX_LIMIT: 100 })

export { ROLES, ACCOUNT_STATUS, TRANSACTION_TYPES, TRANSACTION_STATUS, PAYMENT_METHODS, JWT, BCRYPT, RATE_LIMIT, HTTP_STATUS, PAGINATION }