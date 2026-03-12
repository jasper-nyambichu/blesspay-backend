import express from 'express'
import { getTransactionHistory } from '../controllers/user.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { restrictTo } from '../middleware/role.middleware.js'

const router = express.Router()

// all transaction routes require authentication and member role
router.use(protect, restrictTo('member'))

router.get('/', getTransactionHistory)

export default router