import { User } from '../models/user.model.js'
import { Admin } from '../models/admin.model.js'
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js'
import jwt from 'jsonwebtoken'

// Register new member
const registerUser = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body

        if (!username || !email || !phone || !password) {
            return res.status(400).json({ message: 'All fields are required' })
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase() })
        if (existingEmail) {
            return res.status(409).json({ message: 'Email is already registered' })
        }

        const existingUsername = await User.findOne({ username: username.toLowerCase() })
        if (existingUsername) {
            return res.status(409).json({ message: 'Username is already taken' })
        }

        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            phone,
            password,
            loggedIn: false,
        })

        const accessToken = generateAccessToken({ id: user._id, role: user.role })
        const refreshToken = generateRefreshToken({ id: user._id, role: user.role })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.status(201).json({
            message: 'Account created successfully',
            accessToken,
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Login member
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' })
        }

        const user = await User.findOne({ username: username.toLowerCase() })
        if (!user) {
            return res.status(404).json({ message: 'Account not found' })
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Contact admin.' })
        }

        // ✅ compare FIRST before saving
        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        // ✅ then mark logged in
        user.loggedIn = true
        await user.save()

        const accessToken = generateAccessToken({ id: user._id, role: user.role })
        const refreshToken = generateRefreshToken({ id: user._id, role: user.role })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.status(200).json({
            message: 'Login successful',
            accessToken,
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Logout member
const logoutUser = async (req, res) => {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        })

        res.status(200).json({ message: 'Logged out successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// Issue new access token using refresh token from cookie
const refreshAccessToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken
        if (!token) {
            return res.status(401).json({ message: 'No refresh token provided' })
        }

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)

        const user = await User.findById(decoded.id)
        if (!user || user.status === 'suspended') {
            return res.status(403).json({ message: 'Access denied' })
        }

        const newAccessToken = generateAccessToken({ id: user._id, role: user.role })

        res.status(200).json({ accessToken: newAccessToken })
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token expired. Please login again.' })
        }
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}
// Admin Login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' })
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() })
        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found' })
        }

        if (admin.status === 'suspended') {
            return res.status(403).json({ message: 'This admin account has been suspended.' })
        }

        const isMatch = await admin.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        const accessToken = generateAccessToken({ id: admin._id, role: admin.role })
        const refreshToken = generateRefreshToken({ id: admin._id, role: admin.role })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.status(200).json({
            message: 'Admin login successful',
            accessToken,
            admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { registerUser, loginUser, logoutUser, refreshAccessToken, loginAdmin }