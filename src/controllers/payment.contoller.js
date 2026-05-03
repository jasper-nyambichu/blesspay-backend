// src/controllers/payment.contoller.js
import { Transaction } from '../models/transaction.model.js'
import { Notification } from '../models/notification.model.js'
import { getAccessToken, stkPush } from '../utils/mpesa.js'

// ── Initiate M-Pesa STK push ──────────────────────────────────
const initiatePayment = async (req, res) => {
    try {
        const { amount, phone, type } = req.body
        const userId = req.user.id

        if (!amount || !phone || !type) {
            return res.status(400).json({ message: 'Amount, phone and type are required' })
        }
        if (!['tithe', 'offering'].includes(type)) {
            return res.status(400).json({ message: 'Type must be tithe or offering' })
        }
        if (Number(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' })
        }

        // duplicate guard — pending transaction in last 2 minutes
        const existingPending = await Transaction.findRecentPending(userId)
        if (existingPending) {
            return res.status(409).json({
                message: 'You have a payment in progress. Please wait for it to complete.',
                transactionId: existingPending.id,
            })
        }

        const accessToken   = await getAccessToken()
        const mpesaResponse = await stkPush({ accessToken, phone, amount })

        if (!mpesaResponse.CheckoutRequestID) {
            return res.status(502).json({ message: 'Failed to initiate payment. Try again.' })
        }

        const transaction = await Transaction.create({
            userId,
            amount: Number(amount),
            phone,
            type,
            checkoutRequestId: mpesaResponse.CheckoutRequestID,
        })

        // auto-expire after 3 minutes if Safaricom never fires callback
        setTimeout(async () => {
            try {
                await Transaction.expirePending(transaction.id)
            } catch (_) {}
        }, 3 * 60 * 1000)

        res.status(200).json({
            message: 'STK push sent successfully. Enter your M-Pesa PIN to complete payment.',
            transactionId: transaction.id,
            checkoutRequestId: mpesaResponse.CheckoutRequestID,
        })
    } catch (error) {
        const isTimeout      = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
        const isSafaricomDown = error.response?.status >= 500

        if (isTimeout) {
            return res.status(504).json({ message: 'Safaricom is taking too long to respond. Please try again.' })
        }
        if (isSafaricomDown) {
            return res.status(502).json({ message: 'M-Pesa service is temporarily unavailable. Please try again shortly.' })
        }
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── M-Pesa callback — called by Safaricom ────────────────────
const mpesaCallback = async (req, res) => {
    try {
        res.status(200).json({ message: 'Callback received' })

        const { Body } = req.body
        if (!Body?.stkCallback) return

        const { CheckoutRequestID, ResultCode, CallbackMetadata } = Body.stkCallback

        const transaction = await Transaction.findByCheckoutRequestId(CheckoutRequestID)
        if (!transaction || transaction.status !== 'pending') return

        if (ResultCode !== 0) {
            const failureReasons = {
                1:    'Insufficient M-Pesa balance',
                17:   'M-Pesa system error — please retry',
                1032: 'Payment cancelled by user',
                1037: 'Transaction timed out — user did not respond',
                2001: 'Wrong PIN entered',
            }
            await Transaction.updateStatus(transaction.id, {
                status: 'failed',
                failureReason: failureReasons[ResultCode] ?? `Payment declined (code ${ResultCode})`,
            })

            // notify user of failed payment
            await Notification.create({
                userId:  transaction.user_id,
                type:    'error',
                title:   'Payment Failed',
                message: `Your ${transaction.type} payment of KES ${Number(transaction.amount).toLocaleString()} failed. ${failureReasons[ResultCode] ?? `Reason: code ${ResultCode}`}`,
            })
            return
        }

        const items    = CallbackMetadata?.Item ?? []
        const getValue = (name) => items.find(i => i.Name === name)?.Value ?? null

        await Transaction.updateStatus(transaction.id, {
            status:               'success',
            mpesaReceiptNumber:   getValue('MpesaReceiptNumber'),
            mpesaTransactionDate: getValue('TransactionDate'),
            mpesaPhoneNumber:     getValue('PhoneNumber'),
        })

        // notify user of successful payment
        await Notification.create({
            userId:  transaction.user_id,
            type:    'success',
            title:   'Payment Successful',
            message: `Your ${transaction.type} payment of KES ${Number(transaction.amount).toLocaleString()} was received. Receipt: ${getValue('MpesaReceiptNumber') || 'N/A'}`,
        })
    } catch (error) {
        console.error('M-Pesa callback processing error:', error.message)
    }
}

// ── Poll transaction status ───────────────────────────────────
const getTransactionStatus = async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUserId(req.params.id, req.user.id)
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
