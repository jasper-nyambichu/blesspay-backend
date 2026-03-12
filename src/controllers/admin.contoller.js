import { User } from '../models/user.model.js'
import { Transaction } from '../models/transaction.model.js'

// Get all members
const getAllMembers = async (req, res) => {
    try {
        const members = await User.find().select('-password')

        res.status(200).json({
            message: 'Members retrieved successfully',
            total: members.length,
            members,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Get single member by id
const getMemberById = async (req, res) => {
    try {
        const { id } = req.params

        const member = await User.findById(id).select('-password')
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }

        res.status(200).json({ message: 'Member retrieved successfully', member })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Suspend a member account
const suspendMember = async (req, res) => {
    try {
        const { id } = req.params

        const member = await User.findById(id)
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }

        if (member.status === 'suspended') {
            return res.status(400).json({ message: 'Member is already suspended' })
        }

        member.status = 'suspended'
        await member.save()

        res.status(200).json({ message: 'Member suspended successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Reactivate a suspended member
const activateMember = async (req, res) => {
    try {
        const { id } = req.params

        const member = await User.findById(id)
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }

        if (member.status === 'active') {
            return res.status(400).json({ message: 'Member is already active' })
        }

        member.status = 'active'
        await member.save()

        res.status(200).json({ message: 'Member activated successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Delete a member
const deleteMember = async (req, res) => {
    try {
        const { id } = req.params

        const member = await User.findByIdAndDelete(id)
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }

        res.status(200).json({ message: 'Member deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Get all transactions across all members
const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('user', 'fullName email phone')
            .sort({ createdAt: -1 })

        res.status(200).json({
            message: 'Transactions retrieved successfully',
            total: transactions.length,
            transactions,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Summary report — total tithe, offering and overall collections
const getReport = async (req, res) => {
    try {
        const report = await Transaction.aggregate([
            { $match: { status: 'success' } },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
        ])

        const totalCollected = report.reduce((sum, item) => sum + item.totalAmount, 0)

        res.status(200).json({
            message: 'Report generated successfully',
            totalCollected,
            breakdown: report,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export {
    getAllMembers,
    getMemberById,
    suspendMember,
    activateMember,
    deleteMember,
    getAllTransactions,
    getReport,
}