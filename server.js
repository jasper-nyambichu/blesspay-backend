import app from './src/config/app.js'
import connectDB from './src/config/db.js'
import 'dotenv/config'

const PORT = process.env.PORT || 5000

const startServer = async () => {
    try {
        await connectDB()

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
        process.on('SIGINT', () => shutdown('SIGINT'))

    } catch (error) {
        console.error('❌  Failed to start server:', error.message)
        process.exit(1)
    }
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