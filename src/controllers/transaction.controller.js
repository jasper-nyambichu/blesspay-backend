import { Transaction } from '../models/transaction.model.js'
import { User } from '../models/user.model.js'
import { generateReceipt } from '../utils/receiptGenerator.js'

// get single transaction detail
const getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id })
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' })
        }

        res.status(200).json({ message: 'Transaction retrieved successfully', transaction })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// download PDF receipt for a successful transaction
const downloadReceipt = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id })
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' })
        }

        if (transaction.status !== 'success') {
            return res.status(400).json({ message: 'Receipt is only available for successful transactions' })
        }

        const user = await User.findById(req.user.id).select('-password')

        const pdfBuffer = await generateReceipt(transaction, user)

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=receipt-${transaction.mpesaReceiptNumber || transaction._id}.pdf`,
            'Content-Length': pdfBuffer.length,
        })

        res.status(200).end(pdfBuffer)
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { getTransactionById, downloadReceipt }