const database = require("../config/database")
const emailService = require("./emailService")

class NotificationService {
  constructor() {
    this.notificationTypes = {
      LEAVE_REQUEST: "leave_request",
      LEAVE_APPROVED: "leave_approved",
      LEAVE_REJECTED: "leave_rejected",
      LEAVE_REMINDER: "leave_reminder",
      PERFORMANCE_REVIEW: "performance_review",
      WORK_LOG_REMINDER: "work_log_reminder",
      SYSTEM_MAINTENANCE: "system_maintenance",
      BIRTHDAY_REMINDER: "birthday_reminder",
      ANNIVERSARY_REMINDER: "anniversary_reminder",
    }

    this.priorities = {
      LOW: "low",
      MEDIUM: "medium",
      HIGH: "high",
      URGENT: "urgent",
    }
  }

  async createNotification({
    recipientId,
    senderId = null,
    type,
    title,
    message,
    data = null,
    priority = this.priorities.MEDIUM,
    sendEmail = false,
  }) {
    try {
      // Create in-app notification
      const result = await database.query(
        `
        INSERT INTO Notifications (recipientId, senderId, type, title, message, data, priority)
        OUTPUT INSERTED.id VALUES (@recipientId, @senderId, @type, @title, @message, @data, @priority)
      `,
        {
          recipientId,
          senderId,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
          priority,
        },
      )

      const notificationId = result.recordset[0].id

      // Send email notification if requested
      if (sendEmail) {
        await this.sendEmailNotification(recipientId, title, message, type)
      }

      return notificationId
    } catch (error) {
      console.error("Create notification error:", error)
      throw error
    }
  }

  async sendEmailNotification(recipientId, title, message, type) {
    try {
      // Get recipient email
      const recipientResult = await database.query(
        "SELECT email, firstName, lastName FROM Employees WHERE id = @recipientId",
        { recipientId },
      )

      if (recipientResult.recordset.length === 0) {
        throw new Error("Recipient not found")
      }

      const recipient = recipientResult.recordset[0]

      // Send email based on notification type
      const emailContent = this.formatEmailContent(type, title, message, recipient)

      // Use existing email service or create a generic email
      // This is a simplified version - you might want to use templates
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: recipient.email,
        subject: title,
        html: emailContent,
      }

      // Note: This would use the emailService.transporter.sendMail method
      console.log("Email notification would be sent:", mailOptions)
    } catch (error) {
      console.error("Send email notification error:", error)
      // Don't throw error here to avoid breaking the main notification flow
    }
  }

  formatEmailContent(type, title, message, recipient) {
    const baseTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${title}</h2>
        <p>Dear ${recipient.firstName} ${recipient.lastName},</p>
        <p>${message}</p>
        <p>Please log into the Employee Management System for more details.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Employee Management System.
        </p>
      </div>
    `

    return baseTemplate
  }

  async createBulkNotifications(notifications) {
    try {
      const results = []

      for (const notification of notifications) {
        const notificationId = await this.createNotification(notification)
        results.push(notificationId)
      }

      return results
    } catch (error) {
      console.error("Create bulk notifications error:", error)
      throw error
    }
  }

  async sendLeaveRequestNotification(managerId, employeeData, leaveData) {
    return await this.createNotification({
      recipientId: managerId,
      senderId: employeeData.id,
      type: this.notificationTypes.LEAVE_REQUEST,
      title: "New Leave Request",
      message: `${employeeData.firstName} ${employeeData.lastName} has submitted a leave request for ${leaveData.startDate} to ${leaveData.endDate}`,
      data: {
        leaveApplicationId: leaveData.id,
        employeeId: employeeData.id,
        leaveType: leaveData.leaveType,
      },
      priority: this.priorities.HIGH,
      sendEmail: true,
    })
  }

  async sendLeaveApprovalNotification(employeeId, leaveData, status, approvedBy) {
    const type = status === "Approved" ? this.notificationTypes.LEAVE_APPROVED : this.notificationTypes.LEAVE_REJECTED

    return await this.createNotification({
      recipientId: employeeId,
      senderId: approvedBy,
      type,
      title: `Leave Request ${status}`,
      message: `Your leave request for ${leaveData.startDate} to ${leaveData.endDate} has been ${status.toLowerCase()}`,
      data: {
        leaveApplicationId: leaveData.id,
        status,
      },
      priority: this.priorities.MEDIUM,
      sendEmail: true,
    })
  }

  async sendPerformanceReviewNotification(employeeId, reviewData, reviewerId) {
    return await this.createNotification({
      recipientId: employeeId,
      senderId: reviewerId,
      type: this.notificationTypes.PERFORMANCE_REVIEW,
      title: "Performance Review Available",
      message: `Your performance review for ${reviewData.reviewPeriod} is now available`,
      data: {
        performanceReviewId: reviewData.id,
        reviewPeriod: reviewData.reviewPeriod,
        overallRating: reviewData.overallRating,
      },
      priority: this.priorities.MEDIUM,
      sendEmail: true,
    })
  }

  async sendBirthdayReminders() {
    try {
      const today = new Date()
      const todayMonth = today.getMonth() + 1
      const todayDay = today.getDate()

      // Get employees with birthdays today
      const result = await database.query(
        `
        SELECT id, firstName, lastName, email, managerId
        FROM Employees
        WHERE MONTH(dateOfBirth) = @month 
        AND DAY(dateOfBirth) = @day
        AND status = 'Active'
      `,
        { month: todayMonth, day: todayDay },
      )

      for (const employee of result.recordset) {
        // Send notification to manager
        if (employee.managerId) {
          await this.createNotification({
            recipientId: employee.managerId,
            type: this.notificationTypes.BIRTHDAY_REMINDER,
            title: "Employee Birthday",
            message: `Today is ${employee.firstName} ${employee.lastName}'s birthday!`,
            data: { employeeId: employee.id },
            priority: this.priorities.LOW,
          })
        }

        // Send birthday wishes to employee
        await this.createNotification({
          recipientId: employee.id,
          type: this.notificationTypes.BIRTHDAY_REMINDER,
          title: "Happy Birthday!",
          message: `Wishing you a wonderful birthday and a great year ahead!`,
          priority: this.priorities.LOW,
        })
      }

      console.log(`✅ Sent birthday reminders for ${result.recordset.length} employees`)
    } catch (error) {
      console.error("Send birthday reminders error:", error)
    }
  }

  async sendWorkAnniversaryReminders() {
    try {
      const today = new Date()
      const todayMonth = today.getMonth() + 1
      const todayDay = today.getDate()

      // Get employees with work anniversaries today
      const result = await database.query(
        `
        SELECT id, firstName, lastName, email, hireDate, managerId,
               DATEDIFF(year, hireDate, GETDATE()) as yearsOfService
        FROM Employees
        WHERE MONTH(hireDate) = @month 
        AND DAY(hireDate) = @day
        AND status = 'Active'
        AND DATEDIFF(year, hireDate, GETDATE()) > 0
      `,
        { month: todayMonth, day: todayDay },
      )

      for (const employee of result.recordset) {
        // Send notification to manager
        if (employee.managerId) {
          await this.createNotification({
            recipientId: employee.managerId,
            type: this.notificationTypes.ANNIVERSARY_REMINDER,
            title: "Employee Work Anniversary",
            message: `${employee.firstName} ${employee.lastName} is celebrating ${employee.yearsOfService} years with the company today!`,
            data: { employeeId: employee.id, yearsOfService: employee.yearsOfService },
            priority: this.priorities.LOW,
          })
        }

        // Send anniversary wishes to employee
        await this.createNotification({
          recipientId: employee.id,
          type: this.notificationTypes.ANNIVERSARY_REMINDER,
          title: "Work Anniversary!",
          message: `Congratulations on ${employee.yearsOfService} years with the company! Thank you for your dedication and hard work.`,
          data: { yearsOfService: employee.yearsOfService },
          priority: this.priorities.LOW,
        })
      }

      console.log(`✅ Sent anniversary reminders for ${result.recordset.length} employees`)
    } catch (error) {
      console.error("Send anniversary reminders error:", error)
    }
  }

  async cleanupOldNotifications(daysOld = 30) {
    try {
      const result = await database.query(
        `
        DELETE FROM Notifications 
        WHERE isRead = 1 
        AND createdAt < DATEADD(day, -@daysOld, GETDATE())
      `,
        { daysOld },
      )

      console.log(`✅ Cleaned up ${result.rowsAffected} old notifications`)
      return result.rowsAffected
    } catch (error) {
      console.error("Cleanup old notifications error:", error)
      throw error
    }
  }

  async getNotificationStats(userId) {
    try {
      const result = await database.query(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) as unread,
          SUM(CASE WHEN priority = 'high' AND isRead = 0 THEN 1 ELSE 0 END) as highPriorityUnread,
          SUM(CASE WHEN createdAt >= DATEADD(day, -1, GETDATE()) THEN 1 ELSE 0 END) as today
        FROM Notifications
        WHERE recipientId = @userId
      `,
        { userId },
      )

      return result.recordset[0]
    } catch (error) {
      console.error("Get notification stats error:", error)
      throw error
    }
  }
}

module.exports = new NotificationService()
