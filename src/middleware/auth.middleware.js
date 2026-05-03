// src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model.js'
import { Admin } from '../models/admin.model.js'

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided.' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

        let user = null

        if (decoded.role === 'admin' || decoded.role === 'treasurer') {
            user = await Admin.findById(decoded.id)
        } else {
            user = await User.findById(decoded.id)
        }

        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' })
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Contact admin.' })
        }

        req.user = { id: user.id, role: user.role, status: user.status }
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please login again.' })
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token.' })
        }
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { protect }
