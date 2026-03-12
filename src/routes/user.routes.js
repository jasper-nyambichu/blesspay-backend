import express from 'express'
import { getProfile, updateProfile, changePassword, getDashboard, getTransactionHistory } from '../controllers/user.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { restrictTo } from '../middleware/role.middleware.js'

const router = express.Router()

// all user routes require authentication and member role
router.use(protect, restrictTo('member'))

router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.put('/change-password', changePassword)
router.get('/dashboard', getDashboard)
router.get('/transactions', getTransactionHistory)

export default router