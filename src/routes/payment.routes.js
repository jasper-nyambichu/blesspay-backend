import express from 'express'
import { initiatePayment, mpesaCallback, getTransactionStatus } from '../controllers/payment.contoller.js'
import { protect } from '../middleware/auth.middleware.js'
import { restrictTo } from '../middleware/role.middleware.js'
import { paymentLimiter } from '../middleware/rateLimiter.middleware.js'

const router = express.Router()

// mpesa callback is called by Safaricom servers — no auth required on this one
router.post('/mpesa/callback', mpesaCallback)

// all other payment routes require authentication and member role
router.use(protect, restrictTo('member'))

router.post('/initiate', paymentLimiter, initiatePayment)
router.get('/status/:id', getTransactionStatus)

export default router