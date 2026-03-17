// src/controllers/payment.controller.js
import { Transaction } from '../models/transaction.model.js'
import { getAccessToken, stkPush } from '../utils/mpesa.js'

// ── Initiate Mpesa STK push ───────────────────────────────────────────
const initiatePayment = async (req, res) => {
    try {
        const { amount, phone, type } = req.body
        const userId = req.user.id

        // ── Validation ────────────────────────────────────────────────
        if (!amount || !phone || !type) {
            return res.status(400).json({ message: 'Amount, phone and type are required' })
        }
        if (!['tithe', 'offering'].includes(type)) {
            return res.status(400).json({ message: 'Type must be tithe or offering' })
        }
        if (Number(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' })
        }

        // ── Duplicate guard ───────────────────────────────────────────
        // Prevent accidental double-tap submissions — check for a pending
        // transaction for this user in the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
        const existingPending = await Transaction.findOne({
            user: userId,
            status: 'pending',
            createdAt: { $gte: twoMinutesAgo },
        })
        if (existingPending) {
            return res.status(409).json({
                message: 'You have a payment in progress. Please wait for it to complete.',
                transactionId: existingPending._id,
            })
        }

        // ── Get cached token and fire STK push ────────────────────────
        const accessToken = await getAccessToken()
        const mpesaResponse = await stkPush({ accessToken, phone, amount })

        if (!mpesaResponse.CheckoutRequestID) {
            return res.status(502).json({ message: 'Failed to initiate payment. Try again.' })
        }

        // ── Save transaction as pending ───────────────────────────────
        const transaction = await Transaction.create({
            user: userId,
            amount: Number(amount),
            phone,
            type,
            status: 'pending',
            checkoutRequestId: mpesaResponse.CheckoutRequestID,
        })

        // ── Schedule auto-expiry after 3 minutes ─────────────────────
        // If Safaricom never fires the callback (network issue, user ignored prompt)
        // we mark the transaction as failed so it does not stay pending forever.
        // This runs async — does not block the response.
        setTimeout(async () => {
            try {
                const tx = await Transaction.findById(transaction._id)
                if (tx && tx.status === 'pending') {
                    tx.status = 'failed'
                    tx.failureReason = 'Payment request expired — no response from Safaricom'
                    await tx.save()
                }
            } catch (_) {
                // silent — best effort cleanup
            }
        }, 3 * 60 * 1000) // 3 minutes

        res.status(200).json({
            message: 'STK push sent successfully. Enter your Mpesa PIN to complete payment.',
            transactionId: transaction._id,
            checkoutRequestId: mpesaResponse.CheckoutRequestID,
        })

    } catch (error) {
        // Surface meaningful errors to the client
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
        const isSafaricomDown = error.response?.status >= 500

        if (isTimeout) {
            return res.status(504).json({
                message: 'Safaricom is taking too long to respond. Please try again in a moment.',
            })
        }
        if (isSafaricomDown) {
            return res.status(502).json({
                message: 'M-Pesa service is temporarily unavailable. Please try again shortly.',
            })
        }

        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Mpesa callback — called by Safaricom after user enters PIN ────────
const mpesaCallback = async (req, res) => {
    try {
        // Always respond 200 immediately — Safaricom retries if we don't
        // respond quickly. We process asynchronously.
        res.status(200).json({ message: 'Callback received' })

        const { Body } = req.body
        if (!Body?.stkCallback) return

        const { CheckoutRequestID, ResultCode, CallbackMetadata } = Body.stkCallback

        const transaction = await Transaction.findOne({ checkoutRequestId: CheckoutRequestID })
        if (!transaction) return

        // ── Idempotency guard ─────────────────────────────────────────
        // If callback fires twice (Safaricom retries), don't process again
        if (transaction.status !== 'pending') return

        if (ResultCode !== 0) {
            // Map Safaricom result codes to human-readable reasons
            const failureReasons = {
                1: 'Insufficient M-Pesa balance',
                17: 'M-Pesa system error — please retry',
                1032: 'Payment cancelled by user',
                1037: 'Transaction timed out — user did not respond',
                2001: 'Wrong PIN entered',
            }
            transaction.status = 'failed'
            transaction.failureReason = failureReasons[ResultCode] ?? `Payment declined (code ${ResultCode})`
            await transaction.save()
            return
        }

        // ── Extract receipt details ────────────────────────────────────
        const items = CallbackMetadata?.Item ?? []
        const getValue = (name) => items.find(i => i.Name === name)?.Value ?? null

        transaction.status = 'success'
        transaction.mpesaReceiptNumber = getValue('MpesaReceiptNumber')
        transaction.mpesaTransactionDate = getValue('TransactionDate')
        transaction.mpesaPhoneNumber = getValue('PhoneNumber')
        await transaction.save()

    } catch (error) {
        // Do not re-throw — we already sent 200 to Safaricom
        console.error('Mpesa callback processing error:', error.message)
    }
}

// ── Poll transaction status ───────────────────────────────────────────
const getTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params

        const transaction = await Transaction.findOne({ _id: id, user: req.user.id })
            .select('status mpesaReceiptNumber amount type checkoutRequestId failureReason createdAt')

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' })
        }

        res.status(200).json({
            message: 'Transaction status retrieved',
            status: transaction.status,
            transaction,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { initiatePayment, mpesaCallback, getTransactionStatus }