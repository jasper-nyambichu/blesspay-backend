// src/models/notification.model.js
import { query } from '../config/db.js'

const Notification = {
    async create({ userId, type, title, message }) {
        const result = await query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, type, title, message]
        )
        return result.rows[0]
    },

    async findByUserId(userId) {
        const result = await query(
            `SELECT * FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        )
        return result.rows
    },

    async markAsRead(id, userId) {
        const result = await query(
            `UPDATE notifications SET read = TRUE
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        )
        return result.rows[0] || null
    },

    async markAllAsRead(userId) {
        await query(
            `UPDATE notifications SET read = TRUE
             WHERE user_id = $1 AND read = FALSE`,
            [userId]
        )
    },

    async deleteById(id, userId) {
        await query(
            `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )
    },

    async deleteAllByUserId(userId) {
        await query(
            `DELETE FROM notifications WHERE user_id = $1`,
            [userId]
        )
    },

    async countUnread(userId) {
        const result = await query(
            `SELECT COUNT(*) FROM notifications
             WHERE user_id = $1 AND read = FALSE`,
            [userId]
        )
        return parseInt(result.rows[0].count)
    },
}

export { Notification }
