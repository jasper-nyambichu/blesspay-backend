import express from 'express'
import {
    getAllMembers,
    getMemberById,
    suspendMember,
    activateMember,
    deleteMember,
    getAllTransactions,
    getReport,
} from '../controllers/admin.contoller.js'
import { protect } from '../middleware/auth.middleware.js'
import { restrictTo } from '../middleware/role.middleware.js'

const router = express.Router()

// all admin routes require authentication and admin role
router.use(protect, restrictTo('admin'))

router.get('/members', getAllMembers)
router.get('/members/:id', getMemberById)
router.patch('/members/:id/suspend', suspendMember)
router.patch('/members/:id/activate', activateMember)
router.delete('/members/:id', deleteMember)

router.get('/transactions', getAllTransactions)
router.get('/report', getReport)

export default router