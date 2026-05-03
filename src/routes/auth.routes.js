// src/routes/auth.routes.js
import express from 'express'
import passport from 'passport'
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    loginAdmin,
    loginTreasurer,
    googleAuthCallback,
} from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { authLimiter } from '../middleware/rateLimiter.middleware.js'

const router = express.Router()

// ── Member auth ───────────────────────────────────────────────
router.post('/register', registerUser)
router.post('/login',    authLimiter, loginUser)
router.post('/logout',   protect, logoutUser)
router.get('/refresh',   refreshAccessToken)

// ── Admin auth ────────────────────────────────────────────────
router.post('/admin/login',     authLimiter, loginAdmin)

// ── Treasurer auth ────────────────────────────────────────────
router.post('/treasurer/login', authLimiter, loginTreasurer)

// ── Google OAuth ──────────────────────────────────────────────
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/api/auth/google/failure', session: false }),
    googleAuthCallback
)

router.get('/google/failure', (req, res) => {
    res.status(401).json({ message: 'Google authentication failed. Please try again.' })
})

export default router
