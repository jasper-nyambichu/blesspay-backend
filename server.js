import app from './src/config/app.js'
import { connectDB } from './src/config/db.js'
import 'dotenv/config'

const PORT = process.env.PORT || 5000

const connectWithRetry = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            await connectDB()
            return
        } catch (err) {
            console.error(`❌  Connection attempt ${i + 1} failed: ${err.message}`)
            if (i < retries - 1) await new Promise(r => setTimeout(r, 3000))
        }
    }
    console.error('❌  All connection attempts failed. Exiting...')
    process.exit(1)
}

const startServer = async () => {
    await connectWithRetry()

    const server = app.listen(PORT, () => {
        console.log(`🚀  Server running on http://localhost:${PORT}`)
    })

    const shutdown = (signal) => {
        console.log(`\n⚠️  ${signal} received. Shutting down...`)
        server.close(() => {
            console.log('✅  Server closed')
            process.exit(0)
        })
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))
}

process.on('unhandledRejection', (reason) => {
    console.error('❌  Unhandled Rejection:', reason)
    process.exit(1)
})

process.on('uncaughtException', (error) => {
    console.error('❌  Uncaught Exception:', error.message)
    process.exit(1)
})

startServer()
