// src/controllers/user.controller.js
import { User } from '../models/user.model.js'
import { Transaction } from '../models/transaction.model.js'

// ── Get logged in member profile ──────────────────────────────
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        res.status(200).json({ message: 'Profile retrieved successfully', user })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Update member profile ─────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body

        const updates = {}
        if (firstName) updates.first_name = firstName
        if (lastName)  updates.last_name  = lastName
        if (phone)     updates.phone      = phone

        const user = await User.updateById(req.user.id, updates)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({ message: 'Profile updated successfully', user })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Change password ───────────────────────────────────────────
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

        if (!user.password_hash) {
            return res.status(400).json({ message: 'Google sign-in accounts cannot change password here.' })
        }

        const isMatch = await User.comparePassword(currentPassword, user.password_hash)
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' })
        }

        await User.updatePassword(req.user.id, newPassword)
        res.status(200).json({ message: 'Password changed successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Get member dashboard summary ──────────────────────────────
const getDashboard = async (req, res) => {
    try {
        const transactions = await Transaction.findSuccessByUserId(req.user.id)

        const totalTithe = transactions
            .filter(t => t.type === 'tithe')
            .reduce((sum, t) => sum + Number(t.amount), 0)

        const totalOffering = transactions
            .filter(t => t.type === 'offering')
            .reduce((sum, t) => sum + Number(t.amount), 0)

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

// ── Get full transaction history ──────────────────────────────
const getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction.findByUserId(req.user.id)
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
