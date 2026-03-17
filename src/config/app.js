// src/config/app.js
import express      from 'express'
import helmet       from 'helmet'
import cors         from 'cors'
import cookieParser from 'cookie-parser'
import compression  from 'compression'
import 'dotenv/config'

import authRoutes        from '../routes/auth.routes.js'
import userRoutes        from '../routes/user.routes.js'
import paymentRoutes     from '../routes/payment.routes.js'
import transactionRoutes from '../routes/transaction.routes.js'
import adminRoutes       from '../routes/admin.routes.js'
import { globalLimiter, authLimiter } from '../middleware/rateLimiter.middleware.js'

const app = express()

// ── Trust proxy — required on Render for accurate IP detection ────────
app.set('trust proxy', 1)

// ── Compression — MUST be first middleware ────────────────────────────
// Gzip all responses. Reduces payload size by 60–80%.
// Login response, dashboard data, transaction lists — all compressed.
// This directly reduces time-to-first-byte on slow Kenyan mobile connections.
app.use(compression({
    // Only compress responses larger than 1kb — no point compressing tiny responses
    threshold: 1024,
    // Compression level 6 is the sweet spot — good compression, low CPU cost
    // Level 9 = max compression but 3x more CPU. Level 1 = fast but poor compression.
    level: 6,
    // Skip compression for already-compressed formats
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false
        return compression.filter(req, res)
    },
}))

// ── Security headers via Helmet ───────────────────────────────────────
app.use(helmet({
    // Allow cross-origin requests needed for Vercel frontend → Render backend
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ── CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, mobile apps, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        callback(new Error(`CORS policy: Origin ${origin} is not allowed`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Handle OPTIONS preflight for all routes ───────────────────────────
// Without this, browsers send a preflight OPTIONS request before every
// POST/PUT — and if it's slow or fails, the actual request never fires.
// This is a common hidden cause of slow login on first attempt.
app.options('/{*path}', cors())

// ── Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// ── Global rate limiter ───────────────────────────────────────────────
app.use('/api', globalLimiter)

// ── Health check ──────────────────────────────────────────────────────
// Kept OUTSIDE /api so UptimeRobot pings don't consume rate limit slots.
// Returns quickly — no DB query, no auth — pure uptime signal.
app.get('/health', (req, res) => {
    res.status(200).json({
        success:     true,
        message:     'BlessPay API is up and running 🙏',
        environment: process.env.NODE_ENV || 'development',
        timestamp:   new Date().toISOString(),
        uptime:      `${Math.floor(process.uptime())}s`,
    })
})

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter, authRoutes)
app.use('/api/user',         userRoutes)
app.use('/api/payment',      paymentRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/admin',        adminRoutes)

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` })
})

// ── Global error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
    const isProd = process.env.NODE_ENV === 'production'

    // Log full error in all environments for debugging on Render logs
    console.error(`[${new Date().toISOString()}] ${err.stack}`)

    if (err.message?.startsWith('CORS policy')) {
        return res.status(403).json({ message: err.message })
    }

    // Mongoose validation errors — return field-level errors, not a 500
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message)
        return res.status(400).json({ message: messages[0] ?? 'Validation failed' })
    }

    // Mongoose duplicate key error (e.g. username/email already taken)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] ?? 'field'
        return res.status(409).json({ message: `${field} already exists` })
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token. Please log in again.' })
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }

    const statusCode = err.statusCode || 500
    res.status(statusCode).json({
        message: isProd && statusCode === 500
            ? 'An internal server error occurred'
            : err.message,
        // Only expose stack trace in development
        ...((!isProd) && { stack: err.stack }),
    })
})

export default app
