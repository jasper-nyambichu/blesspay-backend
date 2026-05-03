// src/models/admin.model.js
import { query } from '../config/db.js'
import bcrypt from 'bcryptjs'
import { BCRYPT } from '../config/constants.js'

const Admin = {
    async findById(id) {
        const result = await query(
            `SELECT id, first_name, last_name, email, role, status, created_at
             FROM admins WHERE id = $1`,
            [id]
        )
        return result.rows[0] || null
    },

    async findByEmail(email) {
        const result = await query(
            `SELECT * FROM admins WHERE email = $1`,
            [email.toLowerCase()]
        )
        return result.rows[0] || null
    },

    async create({ firstName, lastName, email, password, role = 'admin' }) {
        const passwordHash = await bcrypt.hash(password, BCRYPT.SALT_ROUNDS)
        const result = await query(
            `INSERT INTO admins (first_name, last_name, email, password_hash, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, first_name, last_name, email, role, status, created_at`,
            [firstName, lastName, email.toLowerCase(), passwordHash, role]
        )
        return result.rows[0]
    },

    async comparePassword(enteredPassword, passwordHash) {
        return bcrypt.compare(enteredPassword, passwordHash)
    },
}

export { Admin }
