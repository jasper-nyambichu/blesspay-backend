// src/controllers/admin.contoller.js
import { User } from '../models/user.model.js'
import { Transaction } from '../models/transaction.model.js'

// ── Get all members ───────────────────────────────────────────
const getAllMembers = async (req, res) => {
    try {
        const members = await User.findAll()
        res.status(200).json({
            message: 'Members retrieved successfully',
            total: members.length,
            members,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Get single member by id ───────────────────────────────────
const getMemberById = async (req, res) => {
    try {
        const member = await User.findById(req.params.id)
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }
        res.status(200).json({ message: 'Member retrieved successfully', member })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Suspend a member ──────────────────────────────────────────
const suspendMember = async (req, res) => {
    try {
        const member = await User.findById(req.params.id)
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }
        if (member.status === 'suspended') {
            return res.status(400).json({ message: 'Member is already suspended' })
        }
        await User.updateById(req.params.id, { status: 'suspended' })
        res.status(200).json({ message: 'Member suspended successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Activate a member ─────────────────────────────────────────
const activateMember = async (req, res) => {
    try {
        const member = await User.findById(req.params.id)
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }
        if (member.status === 'active') {
            return res.status(400).json({ message: 'Member is already active' })
        }
        await User.updateById(req.params.id, { status: 'active' })
        res.status(200).json({ message: 'Member activated successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Delete a member ───────────────────────────────────────────
const deleteMember = async (req, res) => {
    try {
        const deleted = await User.deleteById(req.params.id)
        if (!deleted) {
            return res.status(404).json({ message: 'Member not found' })
        }
        res.status(200).json({ message: 'Member deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Get all transactions ──────────────────────────────────────
const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.findAll()
        res.status(200).json({
            message: 'Transactions retrieved successfully',
            total: transactions.length,
            transactions,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Summary report ────────────────────────────────────────────
const getReport = async (req, res) => {
    try {
        const report = await Transaction.getReport()
        const totalCollected = report.reduce((sum, item) => sum + Number(item.total_amount), 0)
        res.status(200).json({
            message: 'Report generated successfully',
            totalCollected,
            breakdown: report,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { getAllMembers, getMemberById, suspendMember, activateMember, deleteMember, getAllTransactions, getReport }
