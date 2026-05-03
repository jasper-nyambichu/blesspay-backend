// src/controllers/notification.controller.js
import { Notification } from '../models/notification.model.js'

// ── Get all notifications for logged in user ──────────────────
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findByUserId(req.user.id)
        const unreadCount   = notifications.filter(n => !n.read).length

        res.status(200).json({
            message: 'Notifications retrieved successfully',
            total: notifications.length,
            unreadCount,
            notifications,
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Mark single notification as read ─────────────────────────
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.markAsRead(req.params.id, req.user.id)
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' })
        }
        res.status(200).json({ message: 'Notification marked as read', notification })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Mark all notifications as read ───────────────────────────
const markAllAsRead = async (req, res) => {
    try {
        await Notification.markAllAsRead(req.user.id)
        res.status(200).json({ message: 'All notifications marked as read' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Delete single notification ────────────────────────────────
const deleteNotification = async (req, res) => {
    try {
        await Notification.deleteById(req.params.id, req.user.id)
        res.status(200).json({ message: 'Notification deleted' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

// ── Clear all notifications ───────────────────────────────────
const clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteAllByUserId(req.user.id)
        res.status(200).json({ message: 'All notifications cleared' })
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

export { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications }
