import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [1, 'Amount must be at least 1'],
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['tithe', 'offering'],
            required: [true, 'Transaction type is required'],
        },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed', 'cancelled'],
            default: 'pending',
        },
        // Mpesa specific fields
        checkoutRequestId: {
            type: String,
            default: null,
        },
        mpesaReceiptNumber: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
)

export const Transaction = mongoose.model('Transaction', transactionSchema)