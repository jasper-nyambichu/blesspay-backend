import { Transaction } from '../models/transaction.model.js'
import { getAccessToken, stkPush } from '../utils/mpesa.js'

// Initiate Mpesa STK push
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

        if (amount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than 0' })
        }

        // get Mpesa access token then trigger STK push
        const accessToken = await getAccessToken()
        const mpesaResponse = await stkPush({ accessToken, phone, amount })

        if (!mpesaResponse.CheckoutRequestID) {
            return res.status(502).json({ message: 'Failed to initiate payment. Try again.' })
        }

        // save transaction as pending until Mpesa callback confirms it
        const transaction = await Transaction.create({
            user: userId,
            amount,
            phone,
            type,
            status: 'pending',
            checkoutRequestId: mpesaResponse.CheckoutRequestID,
        })

        res.status(200).json({
            message: 'STK push sent. Enter your Mpesa PIN to complete payment.',
            transactionId: transaction._id,
            checkoutRequestId: mpesaResponse.CheckoutRequestID,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Mpesa callback — called by Safaricom after user enters PIN
const mpesaCallback = async (req, res) => {
    try {
        const { Body } = req.body
        const { stkCallback } = Body

        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback

        const transaction = await Transaction.findOne({ checkoutRequestId: CheckoutRequestID })
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' })
        }

        // ResultCode 0 means success, anything else is a failure
        if (ResultCode !== 0) {
            transaction.status = 'failed'
            await transaction.save()
            return res.status(200).json({ message: 'Payment failed or was cancelled' })
        }

        // extract Mpesa receipt number from callback metadata
        const mpesaReceiptItem = CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber')
        const mpesaReceiptNumber = mpesaReceiptItem?.Value || null

        transaction.status = 'success'
        transaction.mpesaReceiptNumber = mpesaReceiptNumber
        await transaction.save()

        res.status(200).json({ message: 'Payment confirmed successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Check status of a specific transaction
const getTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params

        const transaction = await Transaction.findOne({ _id: id, user: req.user.id })
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