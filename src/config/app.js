import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'dotenv/config'

import authRoutes from '../routes/auth.routes.js'
import userRoutes from '../routes/user.routes.js'
import paymentRoutes from '../routes/payment.routes.js'
import transactionRoutes from '../routes/transaction.routes.js'
import adminRoutes from '../routes/admin.routes.js'
import { globalLimiter, authLimiter } from '../middleware/rateLimiter.middleware.js'

const app = express()

app.set('trust proxy', 1)
app.use(helmet())

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true)
            } else {
                callback(new Error(`CORS policy: Origin ${origin} is not allowed`))
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
)

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())
app.use('/api', globalLimiter)

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'BlessPay API is up and running 🙏',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    })
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/admin', adminRoutes)

app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` })
})

app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${err.stack}`)
    if (err.message && err.message.startsWith('CORS policy')) {
        return res.status(403).json({ message: err.message })
    }
    const statusCode = err.statusCode || 500
    const message =
        process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'An internal server error occurred'
            : err.message
    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
})

export default app