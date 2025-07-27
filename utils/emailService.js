const nodemailer = require("nodemailer")

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendLeaveRequestNotification(managerEmail, employeeData, leaveData) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: managerEmail,
      subject: `Leave Request - ${employeeData.firstName} ${employeeData.lastName}`,
      html: `
        <h2>New Leave Request</h2>
        <p><strong>Employee:</strong> ${employeeData.firstName} ${employeeData.lastName}</p>
        <p><strong>Employee ID:</strong> ${employeeData.employeeId}</p>
        <p><strong>Leave Type:</strong> ${leaveData.leaveType}</p>
        <p><strong>Dates:</strong> ${leaveData.startDate} to ${leaveData.endDate}</p>
        <p><strong>Total Days:</strong> ${leaveData.totalDays}</p>
        <p><strong>Reason:</strong> ${leaveData.reason}</p>
        <p><strong>Applied Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <p>Please review and approve/reject this leave request in the Employee Management System.</p>
      `,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log("Leave request notification sent successfully")
    } catch (error) {
      console.error("Failed to send leave request notification:", error)
      throw error
    }
  }

  async sendLeaveApprovalNotification(employeeEmail, leaveData, status, rejectionReason = null) {
    const subject = status === "Approved" ? "Leave Request Approved" : "Leave Request Rejected"

    let html = `
      <h2>Leave Request ${status}</h2>
      <p><strong>Leave Type:</strong> ${leaveData.leaveType}</p>
      <p><strong>Dates:</strong> ${leaveData.startDate} to ${leaveData.endDate}</p>
      <p><strong>Total Days:</strong> ${leaveData.totalDays}</p>
      <p><strong>Status:</strong> ${status}</p>
    `

    if (status === "Rejected" && rejectionReason) {
      html += `<p><strong>Reason for Rejection:</strong> ${rejectionReason}</p>`
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: employeeEmail,
      subject,
      html,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log("Leave approval notification sent successfully")
    } catch (error) {
      console.error("Failed to send leave approval notification:", error)
      throw error
    }
  }

  async sendUpcomingLeaveReminder(employeeEmail, leaveData) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: employeeEmail,
      subject: "Upcoming Leave Reminder",
      html: `
        <h2>Leave Reminder</h2>
        <p>This is a reminder that your approved leave is starting soon:</p>
        <p><strong>Leave Type:</strong> ${leaveData.leaveType}</p>
        <p><strong>Start Date:</strong> ${leaveData.startDate}</p>
        <p><strong>End Date:</strong> ${leaveData.endDate}</p>
        <p><strong>Total Days:</strong> ${leaveData.totalDays}</p>
        
        <p>Please ensure all your work is properly handed over before your leave begins.</p>
      `,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log("Leave reminder sent successfully")
    } catch (error) {
      console.error("Failed to send leave reminder:", error)
      throw error
    }
  }

  async sendPerformanceReviewNotification(employeeEmail, reviewData) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: employeeEmail,
      subject: "Performance Review Available",
      html: `
        <h2>Performance Review</h2>
        <p>Your performance review for ${reviewData.reviewPeriod} is now available.</p>
        <p><strong>Overall Rating:</strong> ${reviewData.overallRating}/5</p>
        <p><strong>Review Date:</strong> ${reviewData.reviewDate}</p>
        
        <p>Please log into the Employee Management System to view your complete review.</p>
      `,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log("Performance review notification sent successfully")
    } catch (error) {
      console.error("Failed to send performance review notification:", error)
      throw error
    }
  }
}

module.exports = new EmailService()
