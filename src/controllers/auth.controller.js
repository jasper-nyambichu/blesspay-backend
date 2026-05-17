// src/controllers/auth.controller.js
import { User } from "../models/user.model.js";
import { Admin } from "../models/admin.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import { Notification } from "../models/notification.model.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ── Register new member ───────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
    });

    // welcome notification — non-blocking, never fails the registration
    try {
      await Notification.create({
        userId: user.id,
        type: "info",
        title: "Welcome to BlessPay! 🙏",
        message: `Hi ${firstName}, your account has been created successfully. Start your giving journey today.`,
      });
    } catch (notifError) {
      console.warn(
        "⚠️  Welcome notification failed (non-critical):",
        notifError.message,
      );
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(201).json({
      message: "Account created successfully",
      accessToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// ── Login member ──────────────────────────────────────────────
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (user.status === "suspended") {
      return res
        .status(403)
        .json({ message: "Your account has been suspended. Contact admin." });
    }

    if (!user.password_hash) {
      return res
        .status(400)
        .json({
          message:
            "This account uses Google sign-in. Please login with Google.",
        });
    }

    const isMatch = await User.comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await User.updateById(user.id, { logged_in: true });

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// ── Logout member ─────────────────────────────────────────────
const logoutUser = async (req, res) => {
  try {
    await User.updateById(req.user.id, { logged_in: false });
    res.clearCookie("refreshToken", cookieOptions);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// ── Refresh access token ──────────────────────────────────────
const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    let user = null;
    if (decoded.role === "admin" || decoded.role === "treasurer") {
      user = await Admin.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user || user.status === "suspended") {
      return res.status(403).json({ message: "Access denied" });
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      role: user.role,
    });
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Refresh token expired. Please login again." });
    }
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// ── Admin login ───────────────────────────────────────────────
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const admin = await Admin.findByEmail(email);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin account not found" });
    }

    if (admin.status === "suspended") {
      return res
        .status(403)
        .json({ message: "This admin account has been suspended." });
    }

    const isMatch = await Admin.comparePassword(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken({ id: admin.id, role: admin.role });
    const refreshToken = generateRefreshToken({
      id: admin.id,
      role: admin.role,
    });

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(200).json({
      message: "Admin login successful",
      accessToken,
      admin: {
        id: admin.id,
        firstName: admin.first_name,
        lastName: admin.last_name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// ── Treasurer login ───────────────────────────────────────────
const loginTreasurer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const treasurer = await Admin.findByEmail(email);
    if (!treasurer || treasurer.role !== "treasurer") {
      return res.status(404).json({ message: "Treasurer account not found" });
    }

    if (treasurer.status === "suspended") {
      return res
        .status(403)
        .json({ message: "This treasurer account has been suspended." });
    }

    const isMatch = await Admin.comparePassword(
      password,
      treasurer.password_hash,
    );
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken({
      id: treasurer.id,
      role: treasurer.role,
    });
    const refreshToken = generateRefreshToken({
      id: treasurer.id,
      role: treasurer.role,
    });

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(200).json({
      message: "Treasurer login successful",
      accessToken,
      treasurer: {
        id: treasurer.id,
        firstName: treasurer.first_name,
        lastName: treasurer.last_name,
        email: treasurer.email,
        role: treasurer.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// ── Google OAuth callback handler ─────────────────────────────
const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

    res.cookie("refreshToken", refreshToken, cookieOptions);

    // redirect to frontend with access token as query param
    // frontend reads it once, stores in memory, then removes from URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  loginAdmin,
  loginTreasurer,
  googleAuthCallback,
};
