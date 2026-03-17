// src/config/db.js
import mongoose from 'mongoose'

let isConnected = false
let retryCount  = 0
const MAX_RETRIES = 3

const connectDB = async () => {
    // ── Already connected — reuse the pool, don't reconnect ──────────
    if (isConnected && mongoose.connection.readyState === 1) return

    const MONGO_URI = process.env.MONGO_URI
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is not defined in environment variables')
    }

    try {
        const connection = await mongoose.connect(MONGO_URI, {
            // ── Connection pool ───────────────────────────────────────
            // Keep minimum 2 connections warm so requests never wait
            // for a fresh connection to be established
            maxPoolSize: 10,   // max concurrent connections
            minPoolSize: 2,    // always keep 2 alive — eliminates cold connection lag

            // ── Timeouts ──────────────────────────────────────────────
            serverSelectionTimeoutMS: 8000,  // fail fast if Atlas unreachable
            socketTimeoutMS: 45000,          // drop idle sockets after 45s
            connectTimeoutMS: 10000,         // max time to establish initial connection

            // ── Heartbeat — keeps connection alive on Render ──────────
            // Without this, Atlas closes idle connections after ~10 min
            // and the next request pays the reconnection penalty
            heartbeatFrequencyMS: 10000,     // ping Atlas every 10s

            // ── Write concern — ensures data is actually saved ────────
            w: 'majority',
            wtimeoutMS: 5000,
        })

        isConnected  = true
        retryCount   = 0
        console.log(`✅  MongoDB Connected: ${connection.connection.host}`)
    } catch (error) {
        console.error(`❌  MongoDB connection failed (attempt ${retryCount + 1}): ${error.message}`)
        isConnected = false

        // ── Auto-retry up to 3 times with exponential backoff ─────────
        // Handles transient Atlas blips without crashing the server
        if (retryCount < MAX_RETRIES) {
            retryCount++
            const delay = retryCount * 2000  // 2s, 4s, 6s
            console.log(`🔄  Retrying connection in ${delay / 1000}s...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return connectDB()
        }

        throw error
    }
}

// ── Connection event listeners ────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
    isConnected = false
    console.warn('⚠️  MongoDB disconnected — will reconnect on next request')
})

mongoose.connection.on('reconnected', () => {
    isConnected = true
    retryCount  = 0
    console.log('✅  MongoDB reconnected')
})

mongoose.connection.on('error', (error) => {
    console.error(`❌  MongoDB connection error: ${error.message}`)
    isConnected = false
})

// ── Graceful shutdown — close pool cleanly on server stop ─────────────
const gracefulShutdown = async (signal) => {
    console.log(`\n🔒  ${signal} received — closing MongoDB connection...`)
    await mongoose.connection.close()
    console.log('🔒  MongoDB connection closed gracefully')
    process.exit(0)
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))  // Render sends SIGTERM on deploy

export default connectDB