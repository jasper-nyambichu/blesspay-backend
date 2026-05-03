// src/routes/treasurer.routes.js
import express from 'express'
import { getFinancialReport, getAllTransactions, getTreasurerDashboard } from '../controllers/treasurer.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { restrictTo } from '../middleware/role.middleware.js'

const router = express.Router()

// all treasurer routes require authentication and treasurer role
router.use(protect, restrictTo('treasurer'))

router.get('/dashboard',     getTreasurerDashboard)
router.get('/report',        getFinancialReport)
router.get('/transactions',  getAllTransactions)

export default router
