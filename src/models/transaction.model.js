// src/models/transaction.model.js
import { query } from '../config/db.js'

const Transaction = {
    async create({ userId, amount, phone, type, checkoutRequestId }) {
        const result = await query(
            `INSERT INTO transactions (user_id, amount, phone, type, checkout_request_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, amount, phone, type, checkoutRequestId || null]
        )
        return result.rows[0]
    },

    async findById(id) {
        const result = await query(
            `SELECT * FROM transactions WHERE id = $1`,
            [id]
        )
        return result.rows[0] || null
    },

    async findByIdAndUserId(id, userId) {
        const result = await query(
            `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )
        return result.rows[0] || null
    },

    async findByCheckoutRequestId(checkoutRequestId) {
        const result = await query(
            `SELECT * FROM transactions WHERE checkout_request_id = $1`,
            [checkoutRequestId]
        )
        return result.rows[0] || null
    },

    // find pending transaction for duplicate guard (last 2 minutes)
    async findRecentPending(userId) {
        const result = await query(
            `SELECT * FROM transactions
             WHERE user_id = $1
               AND status = 'pending'
               AND created_at >= NOW() - INTERVAL '2 minutes'
             LIMIT 1`,
            [userId]
        )
        return result.rows[0] || null
    },

    async findByUserId(userId) {
        const result = await query(
            `SELECT * FROM transactions
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        )
        return result.rows
    },

    async findSuccessByUserId(userId) {
        const result = await query(
            `SELECT * FROM transactions
             WHERE user_id = $1 AND status = 'success'
             ORDER BY created_at DESC`,
            [userId]
        )
        return result.rows
    },

    async findAll() {
        const result = await query(
            `SELECT t.*, u.first_name, u.last_name, u.email, u.phone AS user_phone
             FROM transactions t
             JOIN users u ON t.user_id = u.id
             ORDER BY t.created_at DESC`
        )
        return result.rows
    },

    async updateStatus(id, { status, mpesaReceiptNumber, mpesaTransactionDate, mpesaPhoneNumber, failureReason }) {
        const result = await query(
            `UPDATE transactions
             SET status                 = $1,
                 mpesa_receipt_number   = $2,
                 mpesa_transaction_date = $3,
                 mpesa_phone_number     = $4,
                 failure_reason         = $5
             WHERE id = $6
             RETURNING *`,
            [status, mpesaReceiptNumber || null, mpesaTransactionDate || null, mpesaPhoneNumber || null, failureReason || null, id]
        )
        return result.rows[0] || null
    },

    // expire pending transactions older than 3 minutes
    async expirePending(id) {
        await query(
            `UPDATE transactions
             SET status = 'failed',
                 failure_reason = 'Payment request expired — no response from Safaricom'
             WHERE id = $1 AND status = 'pending'`,
            [id]
        )
    },

    // summary report — total tithe and offering
    async getReport() {
        const result = await query(
            `SELECT type,
                    SUM(amount) AS total_amount,
                    COUNT(*)    AS count
             FROM transactions
             WHERE status = 'success'
             GROUP BY type`
        )
        return result.rows
    },
}

export { Transaction }
