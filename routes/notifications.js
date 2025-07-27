const express = require("express")
const database = require("../config/database")

const router = express.Router()

// Get notifications for current user
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query

    const offset = (page - 1) * limit
    let whereClause = "WHERE n.recipientId = @userId"
    const params = { userId: req.user.id }

    if (unreadOnly === "true") {
      whereClause += " AND n.isRead = 0"
    }

    // Get total count
    const countResult = await database.query(`SELECT COUNT(*) as total FROM Notifications n ${whereClause}`, params)

    const total = countResult.recordset[0].total

    // Get notifications
    const result = await database.query(
      `
      SELECT n.*, 
             sender.firstName + ' ' + sender.lastName as senderName
      FROM Notifications n
      LEFT JOIN Employees sender ON n.senderId = sender.id
      ${whereClause}
      ORDER BY n.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
      { ...params, offset: Number.parseInt(offset), limit: Number.parseInt(limit) },
    )

    const notifications = result.recordset.map((notification) => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null,
    }))

    res.json({
      notifications,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
})

// Get unread notification count
router.get("/unread-count", async (req, res) => {
  try {
    const result = await database.query(
      "SELECT COUNT(*) as count FROM Notifications WHERE recipientId = @userId AND isRead = 0",
      { userId: req.user.id },
    )

    res.json({ count: result.recordset[0].count })
  } catch (error) {
    console.error("Get unread count error:", error)
    res.status(500).json({ error: "Failed to fetch unread count" })
  }
})

// Mark notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params

    // Verify notification belongs to user
    const checkResult = await database.query("SELECT id FROM Notifications WHERE id = @id AND recipientId = @userId", {
      id,
      userId: req.user.id,
    })

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: "Notification not found" })
    }

    // Mark as read
    await database.query("UPDATE Notifications SET isRead = 1, readAt = GETDATE() WHERE id = @id", { id })

    res.json({ message: "Notification marked as read" })
  } catch (error) {
    console.error("Mark notification as read error:", error)
    res.status(500).json({ error: "Failed to mark notification as read" })
  }
})

// Mark all notifications as read
router.patch("/mark-all-read", async (req, res) => {
  try {
    await database.query(
      "UPDATE Notifications SET isRead = 1, readAt = GETDATE() WHERE recipientId = @userId AND isRead = 0",
      { userId: req.user.id },
    )

    res.json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Mark all notifications as read error:", error)
    res.status(500).json({ error: "Failed to mark all notifications as read" })
  }
})

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Verify notification belongs to user
    const checkResult = await database.query("SELECT id FROM Notifications WHERE id = @id AND recipientId = @userId", {
      id,
      userId: req.user.id,
    })

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: "Notification not found" })
    }

    // Delete notification
    await database.query("DELETE FROM Notifications WHERE id = @id", { id })

    res.json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json({ error: "Failed to delete notification" })
  }
})

// Create notification (for system/admin use)
router.post("/", async (req, res) => {
  try {
    const { recipientId, type, title, message, data = null, priority = "medium" } = req.body

    // Validate recipient exists
    const recipientResult = await database.query("SELECT id FROM Employees WHERE id = @recipientId", { recipientId })

    if (recipientResult.recordset.length === 0) {
      return res.status(404).json({ error: "Recipient not found" })
    }

    const result = await database.query(
      `
      INSERT INTO Notifications (recipientId, senderId, type, title, message, data, priority)
      OUTPUT INSERTED.id VALUES (@recipientId, @senderId, @type, @title, @message, @data, @priority)
    `,
      {
        recipientId,
        senderId: req.user.id,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        priority,
      },
    )

    res.status(201).json({
      message: "Notification created successfully",
      notificationId: result.recordset[0].id,
    })
  } catch (error) {
    console.error("Create notification error:", error)
    res.status(500).json({ error: "Failed to create notification" })
  }
})

// Get notification statistics (for admin dashboard)
router.get("/stats", async (req, res) => {
  try {
    // Get notification statistics
    const stats = await database.query(
      `
      SELECT 
        COUNT(*) as totalNotifications,
        SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) as unreadNotifications,
        SUM(CASE WHEN createdAt >= DATEADD(day, -1, GETDATE()) THEN 1 ELSE 0 END) as todayNotifications,
        SUM(CASE WHEN createdAt >= DATEADD(day, -7, GETDATE()) THEN 1 ELSE 0 END) as weekNotifications
      FROM Notifications
      WHERE recipientId = @userId
    `,
      { userId: req.user.id },
    )

    // Get notification types breakdown
    const typeBreakdown = await database.query(
      `
      SELECT type, COUNT(*) as count
      FROM Notifications
      WHERE recipientId = @userId
      AND createdAt >= DATEADD(day, -30, GETDATE())
      GROUP BY type
      ORDER BY count DESC
    `,
      { userId: req.user.id },
    )

    res.json({
      stats: stats.recordset[0],
      typeBreakdown: typeBreakdown.recordset,
    })
  } catch (error) {
    console.error("Get notification stats error:", error)
    res.status(500).json({ error: "Failed to fetch notification statistics" })
  }
})

// Bulk operations
router.post("/bulk-action", async (req, res) => {
  try {
    const { action, notificationIds } = req.body

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: "Invalid notification IDs" })
    }

    // Verify all notifications belong to user
    const placeholders = notificationIds.map((_, index) => `@id${index}`).join(", ")
    const params = { userId: req.user.id }
    notificationIds.forEach((id, index) => {
      params[`id${index}`] = id
    })

    const checkResult = await database.query(
      `SELECT COUNT(*) as count FROM Notifications WHERE id IN (${placeholders}) AND recipientId = @userId`,
      params,
    )

    if (checkResult.recordset[0].count !== notificationIds.length) {
      return res.status(403).json({ error: "Some notifications do not belong to you" })
    }

    let query = ""
    let message = ""

    switch (action) {
      case "mark_read":
        query = `UPDATE Notifications SET isRead = 1, readAt = GETDATE() WHERE id IN (${placeholders})`
        message = "Notifications marked as read"
        break
      case "mark_unread":
        query = `UPDATE Notifications SET isRead = 0, readAt = NULL WHERE id IN (${placeholders})`
        message = "Notifications marked as unread"
        break
      case "delete":
        query = `DELETE FROM Notifications WHERE id IN (${placeholders})`
        message = "Notifications deleted"
        break
      default:
        return res.status(400).json({ error: "Invalid action" })
    }

    await database.query(query, params)

    res.json({ message })
  } catch (error) {
    console.error("Bulk notification action error:", error)
    res.status(500).json({ error: "Failed to perform bulk action" })
  }
})

module.exports = router
