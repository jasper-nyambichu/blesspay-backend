// src/config/db.js
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

let pool = null

const connectDB = async () => {
    const connectionString = process.env.SUPABASE_DB_URL

    if (!connectionString) {
        throw new Error('SUPABASE_DB_URL is not defined in environment variables')
    }

    pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    })

    pool.on('error', (err) => {
        console.error('❌ Unexpected pool error:', err.message)
    })

    // test the connection
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()

    console.log(`✅  PostgreSQL Connected: ${result.rows[0].now}`)
}

const query = async (text, params) => {
    if (!pool) throw new Error('Database not initialized. Call connectDB first.')
    return pool.query(text, params)
}

const getClient = async () => {
    if (!pool) throw new Error('Database not initialized. Call connectDB first.')
    return pool.connect()
}

export { connectDB, query, getClient }
