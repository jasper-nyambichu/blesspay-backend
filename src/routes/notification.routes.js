// src/routes/notification.routes.js
import express from 'express'
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
} from '../controllers/notification.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { restrictTo } from '../middleware/role.middleware.js'

const router = express.Router()

router.use(protect, restrictTo('member'))

router.get('/',                  getNotifications)
router.patch('/read-all',        markAllAsRead)
router.patch('/:id/read',        markAsRead)
router.delete('/clear-all',      clearAllNotifications)
router.delete('/:id',            deleteNotification)

export default router
