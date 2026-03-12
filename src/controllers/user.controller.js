import { User } from '../models/user.model.js'
import { Transaction } from '../models/transaction.model.js'

// Get logged in member profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password')
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({ message: 'Profile retrieved successfully', user })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Update member profile
const updateProfile = async (req, res) => {
    try {
        const { username, phone } = req.body

        if (username) {
            const existingUsername = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user.id } })
            if (existingUsername) {
                return res.status(409).json({ message: 'Username is already taken' })
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { ...(username && { username: username.toLowerCase() }), ...(phone && { phone }) },
            { new: true, runValidators: true }
        ).select('-password')

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({ message: 'Profile updated successfully', user })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new password are required' })
        }

        const user = await User.findById(req.user.id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        const isMatch = await user.comparePassword(currentPassword)
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' })
        }

        user.password = newPassword
        await user.save()

        res.status(200).json({ message: 'Password changed successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Get member dashboard summary — total tithe, offering and recent transactions
const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id

        const transactions = await Transaction.find({ user: userId, status: 'success' })
            .sort({ createdAt: -1 })

        const totalTithe = transactions
            .filter(t => t.type === 'tithe')
            .reduce((sum, t) => sum + t.amount, 0)

        const totalOffering = transactions
            .filter(t => t.type === 'offering')
            .reduce((sum, t) => sum + t.amount, 0)

        // show only the 5 most recent on dashboard
        const recentTransactions = transactions.slice(0, 5)

        res.status(200).json({
            message: 'Dashboard data retrieved successfully',
            summary: {
                totalTithe,
                totalOffering,
                totalGiven: totalTithe + totalOffering,
                transactionCount: transactions.length,
            },
            recentTransactions,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Get full transaction history for logged in member
const getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id })
            .sort({ createdAt: -1 })

        res.status(200).json({
            message: 'Transaction history retrieved successfully',
            total: transactions.length,
            transactions,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { getProfile, updateProfile, changePassword, getDashboard, getTransactionHistory }