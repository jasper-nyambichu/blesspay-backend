// src/models/user.model.js
import { query } from '../config/db.js'
import bcrypt from 'bcryptjs'
import { BCRYPT } from '../config/constants.js'

const User = {
    // create a new member via email/password
    async create({ firstName, lastName, email, phone, password }) {
        const passwordHash = await bcrypt.hash(password, BCRYPT.SALT_ROUNDS)
        const result = await query(
            `INSERT INTO users (first_name, last_name, email, phone, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, first_name, last_name, email, phone, role, status, created_at`,
            [firstName, lastName, email.toLowerCase(), phone, passwordHash]
        )
        return result.rows[0]
    },

    // create or update a member via Google OAuth
   // create or update a member via Google OAuth
async upsertGoogle({ googleId, email, firstName, lastName, avatarUrl }) {
    // First try to find existing user by googleId or email
    const existing = await query(
        `SELECT id, first_name, last_name, email, phone, role, status, avatar_url, google_id
         FROM users WHERE google_id = $1 OR email = $2
         LIMIT 1`,
        [googleId, email.toLowerCase()]
    )

    if (existing.rows.length > 0) {
        // User exists — update their Google info and return
        const result = await query(
            `UPDATE users
             SET google_id  = $1,
                 avatar_url = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING id, first_name, last_name, email, phone, role, status, avatar_url`,
            [googleId, avatarUrl, existing.rows[0].id]
        )
        return { ...result.rows[0], isNew: false }
    }

    // New user — insert fresh record
    const result = await query(
        `INSERT INTO users (first_name, last_name, email, google_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, first_name, last_name, email, phone, role, status, avatar_url`,
        [firstName, lastName, email.toLowerCase(), googleId, avatarUrl]
    )
    return { ...result.rows[0], isNew: true }
},

    async findById(id) {
        const result = await query(
            `SELECT id, first_name, last_name, email, phone, role, status, avatar_url, logged_in, created_at
             FROM users WHERE id = $1`,
            [id]
        )
        return result.rows[0] || null
    },

    async findByEmail(email) {
        const result = await query(
            `SELECT * FROM users WHERE email = $1`,
            [email.toLowerCase()]
        )
        return result.rows[0] || null
    },

    async findByGoogleId(googleId) {
        const result = await query(
            `SELECT id, first_name, last_name, email, phone, role, status, avatar_url
             FROM users WHERE google_id = $1`,
            [googleId]
        )
        return result.rows[0] || null
    },

    async findAll() {
        const result = await query(
            `SELECT id, first_name, last_name, email, phone, role, status, created_at
             FROM users ORDER BY created_at DESC`
        )
        return result.rows
    },

    async updateById(id, fields) {
        const allowed = ['first_name', 'last_name', 'phone', 'avatar_url', 'status', 'logged_in']
        const updates = []
        const values = []
        let i = 1

        for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key)) {
                updates.push(`${key} = $${i}`)
                values.push(value)
                i++
            }
        }

        if (updates.length === 0) return null

        values.push(id)
        const result = await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}
             RETURNING id, first_name, last_name, email, phone, role, status, avatar_url`,
            values
        )
        return result.rows[0] || null
    },

    async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, BCRYPT.SALT_ROUNDS)
        await query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [passwordHash, id]
        )
    },

    async deleteById(id) {
        const result = await query(
            `DELETE FROM users WHERE id = $1 RETURNING id`,
            [id]
        )
        return result.rows[0] || null
    },

    async comparePassword(enteredPassword, passwordHash) {
        return bcrypt.compare(enteredPassword, passwordHash)
    },
}

export { User }
