const express = require("express")
const database = require("../config/database")
const { validate, leaveSchemas } = require("../middleware/validation")
const { authorize, isManager } = require("../middleware/auth")
const emailService = require("../utils/emailService")

const router = express.Router()

// Get leave applications (with filtering and pagination)
router.get("/applications", async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "", employeeId = "", startDate = "", endDate = "" } = req.query

    const offset = (page - 1) * limit
    let whereClause = "WHERE 1=1"
    const params = {}

    // If not manager/HR, only show own applications
    const userRoleResult = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    const isManagerOrHR =
      userRoleResult.recordset[0]?.name?.includes("Manager") || userRoleResult.recordset[0]?.name?.includes("HR")

    if (!isManagerOrHR) {
      whereClause += " AND la.employeeId = @currentUserId"
      params.currentUserId = req.user.id
    }

    if (status) {
      whereClause += " AND la.status = @status"
      params.status = status
    }

    if (employeeId) {
      whereClause += " AND la.employeeId = @employeeId"
      params.employeeId = employeeId
    }

    if (startDate) {
      whereClause += " AND la.startDate >= @startDate"
      params.startDate = startDate
    }

    if (endDate) {
      whereClause += " AND la.endDate <= @endDate"
      params.endDate = endDate
    }

    // Get total count
    const countResult = await database.query(
      `
      SELECT COUNT(*) as total 
      FROM LeaveApplications la
      ${whereClause}
    `,
      params,
    )

    const total = countResult.recordset[0].total

    // Get leave applications
    const result = await database.query(
      `
      SELECT la.*, 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             lt.name as leaveType,
             approver.firstName + ' ' + approver.lastName as approvedByName
      FROM LeaveApplications la
      JOIN Employees e ON la.employeeId = e.id
      JOIN LeaveTypes lt ON la.leaveTypeId = lt.id
      LEFT JOIN Employees approver ON la.approvedBy = approver.id
      ${whereClause}
      ORDER BY la.appliedDate DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
      { ...params, offset: Number.parseInt(offset), limit: Number.parseInt(limit) },
    )

    res.json({
      applications: result.recordset.map((app) => ({
        ...app,
        attachments: app.attachments ? JSON.parse(app.attachments) : [],
      })),
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get leave applications error:", error)
    res.status(500).json({ error: "Failed to fetch leave applications" })
  }
})

// Submit leave application
router.post("/applications", validate(leaveSchemas.create), async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, reason, attachments = [] } = req.body

    // Calculate total days
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

    // Check leave balance
    const balanceResult = await database.query(
      `
      SELECT remainingDays, lt.name as leaveType
      FROM LeaveBalances lb
      JOIN LeaveTypes lt ON lb.leaveTypeId = lt.id
      WHERE lb.employeeId = @employeeId 
      AND lb.leaveTypeId = @leaveTypeId 
      AND lb.year = @year
    `,
      {
        employeeId: req.user.id,
        leaveTypeId,
        year: new Date().getFullYear(),
      },
    )

    if (balanceResult.recordset.length === 0) {
      return res.status(400).json({ error: "Leave type not found or no balance available" })
    }

    const balance = balanceResult.recordset[0]
    if (balance.remainingDays < totalDays) {
      return res.status(400).json({
        error: `Insufficient leave balance. Available: ${balance.remainingDays} days, Requested: ${totalDays} days`,
      })
    }

    // Create leave application
    const result = await database.query(
      `
      INSERT INTO LeaveApplications (
        employeeId, leaveTypeId, startDate, endDate, totalDays, reason, attachments
      ) OUTPUT INSERTED.id VALUES (
        @employeeId, @leaveTypeId, @startDate, @endDate, @totalDays, @reason, @attachments
      )
    `,
      {
        employeeId: req.user.id,
        leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason,
        attachments: JSON.stringify(attachments),
      },
    )

    const applicationId = result.recordset[0].id

    // Get manager email for notification
    const managerResult = await database.query(
      `
      SELECT m.email, m.firstName, m.lastName
      FROM Employees e
      JOIN Employees m ON e.managerId = m.id
      WHERE e.id = @employeeId
    `,
      { employeeId: req.user.id },
    )

    if (managerResult.recordset.length > 0) {
      const manager = managerResult.recordset[0]

      // Send email notification to manager
      await emailService.sendLeaveRequestNotification(
        manager.email,
        { firstName: req.user.firstName, lastName: req.user.lastName, employeeId: req.user.employeeId },
        { leaveType: balance.leaveType, startDate, endDate, totalDays, reason },
      )

      // Create in-app notification for manager
      await database.query(
        `
        INSERT INTO Notifications (recipientId, senderId, type, title, message, data, priority)
        VALUES (@managerId, @senderId, 'leave_request', @title, @message, @data, 'high')
      `,
        {
          managerId: managerResult.recordset[0].id,
          senderId: req.user.id,
          title: "New Leave Request",
          message: `${req.user.firstName} ${req.user.lastName} has submitted a leave request for ${startDate} to ${endDate}`,
          data: JSON.stringify({ leaveApplicationId: applicationId }),
        },
      )
    }

    res.status(201).json({
      message: "Leave application submitted successfully",
      applicationId,
    })
  } catch (error) {
    console.error("Submit leave application error:", error)
    res.status(500).json({ error: "Failed to submit leave application" })
  }
})

// Approve/Reject leave application
router.patch("/applications/:id/status", isManager, validate(leaveSchemas.approve), async (req, res) => {
  try {
    const { id } = req.params
    const { status, rejectionReason } = req.body

    // Get leave application details
    const appResult = await database.query(
      `
      SELECT la.*, e.email, e.firstName, e.lastName, lt.name as leaveType
      FROM LeaveApplications la
      JOIN Employees e ON la.employeeId = e.id
      JOIN LeaveTypes lt ON la.leaveTypeId = lt.id
      WHERE la.id = @id AND la.status = 'Pending'
    `,
      { id },
    )

    if (appResult.recordset.length === 0) {
      return res.status(404).json({ error: "Leave application not found or already processed" })
    }

    const application = appResult.recordset[0]

    // Update application status
    await database.query(
      `
      UPDATE LeaveApplications 
      SET status = @status, approvedBy = @approvedBy, approvedDate = GETDATE(), 
          rejectionReason = @rejectionReason, updatedAt = GETDATE()
      WHERE id = @id
    `,
      {
        id,
        status,
        approvedBy: req.user.id,
        rejectionReason: status === "Rejected" ? rejectionReason : null,
      },
    )

    // If approved, update leave balance
    if (status === "Approved") {
      await database.query(
        `
        UPDATE LeaveBalances 
        SET usedDays = usedDays + @totalDays, updatedAt = GETDATE()
        WHERE employeeId = @employeeId 
        AND leaveTypeId = @leaveTypeId 
        AND year = @year
      `,
        {
          totalDays: application.totalDays,
          employeeId: application.employeeId,
          leaveTypeId: application.leaveTypeId,
          year: new Date().getFullYear(),
        },
      )
    }

    // Send email notification to employee
    await emailService.sendLeaveApprovalNotification(
      application.email,
      {
        leaveType: application.leaveType,
        startDate: application.startDate,
        endDate: application.endDate,
        totalDays: application.totalDays,
      },
      status,
      rejectionReason,
    )

    // Create in-app notification for employee
    await database.query(
      `
      INSERT INTO Notifications (recipientId, senderId, type, title, message, data, priority)
      VALUES (@recipientId, @senderId, @type, @title, @message, @data, 'medium')
    `,
      {
        recipientId: application.employeeId,
        senderId: req.user.id,
        type: status === "Approved" ? "leave_approved" : "leave_rejected",
        title: `Leave Request ${status}`,
        message: `Your leave request for ${application.startDate} to ${application.endDate} has been ${status.toLowerCase()}`,
        data: JSON.stringify({ leaveApplicationId: id }),
      },
    )

    res.json({ message: `Leave application ${status.toLowerCase()} successfully` })
  } catch (error) {
    console.error("Update leave status error:", error)
    res.status(500).json({ error: "Failed to update leave application status" })
  }
})

// Get leave balances
router.get("/balances", async (req, res) => {
  try {
    const { employeeId } = req.query

    // If not manager/HR, only show own balances
    const userRoleResult = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    const isManagerOrHR =
      userRoleResult.recordset[0]?.name?.includes("Manager") || userRoleResult.recordset[0]?.name?.includes("HR")

    let targetEmployeeId = req.user.id
    if (isManagerOrHR && employeeId) {
      targetEmployeeId = employeeId
    }

    const result = await database.query(
      `
      SELECT lb.*, lt.name as leaveType, lt.maxDaysPerYear,
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId
      FROM LeaveBalances lb
      JOIN LeaveTypes lt ON lb.leaveTypeId = lt.id
      JOIN Employees e ON lb.employeeId = e.id
      WHERE lb.employeeId = @employeeId AND lb.year = @year
      ORDER BY lt.name
    `,
      {
        employeeId: targetEmployeeId,
        year: new Date().getFullYear(),
      },
    )

    res.json(result.recordset)
  } catch (error) {
    console.error("Get leave balances error:", error)
    res.status(500).json({ error: "Failed to fetch leave balances" })
  }
})

// Get all employees' leave balances (Manager/HR only)
router.get("/balances/all", authorize(["manage_employees", "view_all_reports"]), async (req, res) => {
  try {
    const result = await database.query(
      `
      SELECT lb.*, lt.name as leaveType,
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             d.name as departmentName
      FROM LeaveBalances lb
      JOIN LeaveTypes lt ON lb.leaveTypeId = lt.id
      JOIN Employees e ON lb.employeeId = e.id
      LEFT JOIN Departments d ON e.departmentId = d.id
      WHERE lb.year = @year AND e.status = 'Active'
      ORDER BY e.firstName, e.lastName, lt.name
    `,
      { year: new Date().getFullYear() },
    )

    // Group by employee
    const balancesByEmployee = result.recordset.reduce((acc, balance) => {
      const key = balance.employeeId
      if (!acc[key]) {
        acc[key] = {
          employeeId: balance.employeeId,
          employeeName: balance.employeeName,
          departmentName: balance.departmentName,
          balances: [],
        }
      }
      acc[key].balances.push({
        leaveType: balance.leaveType,
        totalDays: balance.totalDays,
        usedDays: balance.usedDays,
        remainingDays: balance.remainingDays,
        carryForwardDays: balance.carryForwardDays,
      })
      return acc
    }, {})

    res.json(Object.values(balancesByEmployee))
  } catch (error) {
    console.error("Get all leave balances error:", error)
    res.status(500).json({ error: "Failed to fetch leave balances" })
  }
})

// Get leave types
router.get("/types", async (req, res) => {
  try {
    const result = await database.query(`
      SELECT id, name, description, maxDaysPerYear, carryForward, requiresApproval
      FROM LeaveTypes
      ORDER BY name
    `)

    res.json(result.recordset)
  } catch (error) {
    console.error("Get leave types error:", error)
    res.status(500).json({ error: "Failed to fetch leave types" })
  }
})

module.exports = router
