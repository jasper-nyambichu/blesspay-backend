import express from 'express'
import { registerUser, loginUser, logoutUser, refreshAccessToken, loginAdmin } from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/logout', protect, logoutUser)
router.get('/refresh', refreshAccessToken)
router.post('/admin/login', loginAdmin)

console.log(typeof registerUser)
console.log(typeof loginUser)
console.log(typeof protect)

export default router