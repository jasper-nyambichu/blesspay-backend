import rateLimit from 'express-rate-limit'
import { RATE_LIMIT } from '../config/constants.js'

// applied to all /api routes
const globalLimiter = rateLimit({
    windowMs: RATE_LIMIT.GLOBAL.WINDOW_MS,
    max: RATE_LIMIT.GLOBAL.MAX_REQUESTS,
    message: { message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
})

// stricter limiter for login and register routes
const authLimiter = rateLimit({
    windowMs: RATE_LIMIT.AUTH.WINDOW_MS,
    max: RATE_LIMIT.AUTH.MAX_REQUESTS,
    message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
})

// limits STK push spam on payment routes
const paymentLimiter = rateLimit({
    windowMs: RATE_LIMIT.PAYMENT.WINDOW_MS,
    max: RATE_LIMIT.PAYMENT.MAX_REQUESTS,
    message: { message: 'Too many payment requests. Please wait a moment and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
})

export { globalLimiter, authLimiter, paymentLimiter }