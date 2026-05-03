// src/controllers/treasurer.controller.js
import { Transaction } from '../models/transaction.model.js'
import { User } from '../models/user.model.js'

// ── Get financial report — total tithe, offering, overall ─────
const getFinancialReport = async (req, res) => {
    try {
        const report = await Transaction.getReport()

        const totalCollected = report.reduce((sum, item) => sum + Number(item.total_amount), 0)

        res.status(200).json({
            message: 'Financial report retrieved successfully',
            totalCollected,
            breakdown: report,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Get all transactions — treasurer view ─────────────────────
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

// ── Get treasurer dashboard summary ──────────────────────────
const getTreasurerDashboard = async (req, res) => {
    try {
        const [report, allTransactions, members] = await Promise.all([
            Transaction.getReport(),
            Transaction.findAll(),
            User.findAll(),
        ])

        const totalCollected  = report.reduce((sum, item) => sum + Number(item.total_amount), 0)
        const totalTithe      = report.find(r => r.type === 'tithe')?.total_amount    || 0
        const totalOffering   = report.find(r => r.type === 'offering')?.total_amount || 0
        const recentTransactions = allTransactions.slice(0, 10)

        res.status(200).json({
            message: 'Treasurer dashboard retrieved successfully',
            summary: {
                totalCollected,
                totalTithe:    Number(totalTithe),
                totalOffering: Number(totalOffering),
                totalMembers:  members.length,
                totalTransactions: allTransactions.length,
            },
            recentTransactions,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { getFinancialReport, getAllTransactions, getTreasurerDashboard }
