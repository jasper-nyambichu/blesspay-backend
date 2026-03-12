import mongoose from 'mongoose'

let isConnected = false

const connectDB = async () => {
    if (isConnected) return

    const MONGO_URI = process.env.MONGO_URI
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is not defined in .env file')
    }

    try {
        const connection = await mongoose.connect(MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        })

        isConnected = true
        console.log(`✅  MongoDB Connected: ${connection.connection.host}`)
    } catch (error) {
        console.error('❌  MongoDB connection failed:', error.message)
        throw error
    }
}

mongoose.connection.on('disconnected', () => {
    isConnected = false
    console.warn('⚠️  MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
    isConnected = true
    console.log('✅  MongoDB reconnected')
})

process.on('SIGINT', async () => {
    await mongoose.connection.close()
    console.log('🔒  MongoDB connection closed')
    process.exit(0)
})

export default connectDB
// import mongoose from 'mongoose'

// const connectDB = async () => {
//     try {
//         const conn = await mongoose.connect(process.env.MONGO_URI)

//         console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
//     } catch (error) {
//         console.error('❌ MongoDB connection failed:', error.message)
//         process.exit(1)
//     }
// }

// export default connectDB