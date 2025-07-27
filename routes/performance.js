const express = require("express")
const database = require("../config/database")
const { validate, performanceSchemas, workLogSchemas } = require("../middleware/validation")
const { authorize, isManager } = require("../middleware/auth")
const emailService = require("../utils/emailService")

const router = express.Router()

// Get performance reviews (with filtering and pagination)
router.get("/reviews", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      employeeId = "",
      reviewPeriod = "",
      status = "",
      sortBy = "reviewDate",
      sortOrder = "DESC",
    } = req.query

    const offset = (page - 1) * limit
    let whereClause = "WHERE 1=1"
    const params = {}

    // If not manager/HR, only show own reviews
    const userRoleResult = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    const isManagerOrHR =
      userRoleResult.recordset[0]?.name?.includes("Manager") || userRoleResult.recordset[0]?.name?.includes("HR")

    if (!isManagerOrHR) {
      whereClause += " AND pr.employeeId = @currentUserId"
      params.currentUserId = req.user.id
    }

    if (employeeId) {
      whereClause += " AND pr.employeeId = @employeeId"
      params.employeeId = employeeId
    }

    if (reviewPeriod) {
      whereClause += " AND pr.reviewPeriod LIKE @reviewPeriod"
      params.reviewPeriod = `%${reviewPeriod}%`
    }

    if (status) {
      whereClause += " AND pr.status = @status"
      params.status = status
    }

    // Get total count
    const countResult = await database.query(
      `SELECT COUNT(*) as total FROM PerformanceReviews pr ${whereClause}`,
      params,
    )

    const total = countResult.recordset[0].total

    // Get performance reviews
    const result = await database.query(
      `
      SELECT pr.*, 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             reviewer.firstName + ' ' + reviewer.lastName as reviewerName,
             d.name as departmentName
      FROM PerformanceReviews pr
      JOIN Employees e ON pr.employeeId = e.id
      JOIN Employees reviewer ON pr.reviewerId = reviewer.id
      LEFT JOIN Departments d ON e.departmentId = d.id
      ${whereClause}
      ORDER BY pr.${sortBy} ${sortOrder}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
      { ...params, offset: Number.parseInt(offset), limit: Number.parseInt(limit) },
    )

    res.json({
      reviews: result.recordset,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get performance reviews error:", error)
    res.status(500).json({ error: "Failed to fetch performance reviews" })
  }
})

// Get performance review by ID with metrics
router.get("/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Get review details
    const reviewResult = await database.query(
      `
      SELECT pr.*, 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             reviewer.firstName + ' ' + reviewer.lastName as reviewerName,
             d.name as departmentName
      FROM PerformanceReviews pr
      JOIN Employees e ON pr.employeeId = e.id
      JOIN Employees reviewer ON pr.reviewerId = reviewer.id
      LEFT JOIN Departments d ON e.departmentId = d.id
      WHERE pr.id = @id
    `,
      { id },
    )

    if (reviewResult.recordset.length === 0) {
      return res.status(404).json({ error: "Performance review not found" })
    }

    // Get performance metrics
    const metricsResult = await database.query(
      `
      SELECT metricName, rating, comments, weight
      FROM PerformanceMetrics
      WHERE reviewId = @reviewId
      ORDER BY metricName
    `,
      { reviewId: id },
    )

    const review = reviewResult.recordset[0]
    review.metrics = metricsResult.recordset

    res.json(review)
  } catch (error) {
    console.error("Get performance review error:", error)
    res.status(500).json({ error: "Failed to fetch performance review" })
  }
})

// Create performance review
router.post("/reviews", isManager, validate(performanceSchemas.create), async (req, res) => {
  try {
    const {
      employeeId,
      reviewPeriod,
      overallRating,
      goals,
      achievements,
      areasForImprovement,
      feedback,
      metrics = [],
    } = req.body

    // Check if review already exists for this period
    const existingResult = await database.query(
      `
      SELECT id FROM PerformanceReviews 
      WHERE employeeId = @employeeId AND reviewPeriod = @reviewPeriod
    `,
      { employeeId, reviewPeriod },
    )

    if (existingResult.recordset.length > 0) {
      return res.status(409).json({ error: "Performance review already exists for this period" })
    }

    // Create performance review
    const reviewResult = await database.query(
      `
      INSERT INTO PerformanceReviews (
        employeeId, reviewerId, reviewPeriod, overallRating, goals, 
        achievements, areasForImprovement, feedback, reviewDate
      ) OUTPUT INSERTED.id VALUES (
        @employeeId, @reviewerId, @reviewPeriod, @overallRating, @goals,
        @achievements, @areasForImprovement, @feedback, GETDATE()
      )
    `,
      {
        employeeId,
        reviewerId: req.user.id,
        reviewPeriod,
        overallRating,
        goals,
        achievements,
        areasForImprovement,
        feedback,
      },
    )

    const reviewId = reviewResult.recordset[0].id

    // Add performance metrics
    if (metrics.length > 0) {
      const metricsValues = metrics
        .map((_, index) => `(@reviewId, @metricName${index}, @rating${index}, @comments${index}, @weight${index})`)
        .join(", ")

      const metricsParams = { reviewId }
      metrics.forEach((metric, index) => {
        metricsParams[`metricName${index}`] = metric.metricName
        metricsParams[`rating${index}`] = metric.rating
        metricsParams[`comments${index}`] = metric.comments || null
        metricsParams[`weight${index}`] = metric.weight || 1.0
      })

      await database.query(
        `
        INSERT INTO PerformanceMetrics (reviewId, metricName, rating, comments, weight)
        VALUES ${metricsValues}
      `,
        metricsParams,
      )
    }

    // Get employee email for notification
    const employeeResult = await database.query(
      "SELECT email, firstName, lastName FROM Employees WHERE id = @employeeId",
      { employeeId },
    )

    if (employeeResult.recordset.length > 0) {
      const employee = employeeResult.recordset[0]

      // Send email notification
      await emailService.sendPerformanceReviewNotification(employee.email, {
        reviewPeriod,
        overallRating,
        reviewDate: new Date().toLocaleDateString(),
      })

      // Create in-app notification
      await database.query(
        `
        INSERT INTO Notifications (recipientId, senderId, type, title, message, data, priority)
        VALUES (@recipientId, @senderId, 'performance_review', @title, @message, @data, 'medium')
      `,
        {
          recipientId: employeeId,
          senderId: req.user.id,
          title: "Performance Review Available",
          message: `Your performance review for ${reviewPeriod} is now available`,
          data: JSON.stringify({ performanceReviewId: reviewId }),
        },
      )
    }

    res.status(201).json({
      message: "Performance review created successfully",
      reviewId,
    })
  } catch (error) {
    console.error("Create performance review error:", error)
    res.status(500).json({ error: "Failed to create performance review" })
  }
})

// Update performance review
router.put("/reviews/:id", isManager, validate(performanceSchemas.update), async (req, res) => {
  try {
    const { id } = req.params
    const updateFields = req.body

    // Check if review exists and user has permission
    const reviewResult = await database.query("SELECT employeeId, reviewerId FROM PerformanceReviews WHERE id = @id", {
      id,
    })

    if (reviewResult.recordset.length === 0) {
      return res.status(404).json({ error: "Performance review not found" })
    }

    const review = reviewResult.recordset[0]

    // Only reviewer or HR can update
    const userRoleResult = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    const isHR = userRoleResult.recordset[0]?.name?.includes("HR")
    if (review.reviewerId !== req.user.id && !isHR) {
      return res.status(403).json({ error: "Access denied - not authorized to update this review" })
    }

    // Build dynamic update query
    const setClause = Object.keys(updateFields)
      .map((key) => `${key} = @${key}`)
      .join(", ")

    await database.query(`UPDATE PerformanceReviews SET ${setClause}, updatedAt = GETDATE() WHERE id = @id`, {
      ...updateFields,
      id,
    })

    res.json({ message: "Performance review updated successfully" })
  } catch (error) {
    console.error("Update performance review error:", error)
    res.status(500).json({ error: "Failed to update performance review" })
  }
})

// Get work logs (with filtering and pagination)
router.get("/work-logs", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      employeeId = "",
      projectId = "",
      startDate = "",
      endDate = "",
      sortBy = "logDate",
      sortOrder = "DESC",
    } = req.query

    const offset = (page - 1) * limit
    let whereClause = "WHERE 1=1"
    const params = {}

    // If not manager/HR, only show own work logs
    const userRoleResult = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    const isManagerOrHR =
      userRoleResult.recordset[0]?.name?.includes("Manager") || userRoleResult.recordset[0]?.name?.includes("HR")

    if (!isManagerOrHR) {
      whereClause += " AND wl.employeeId = @currentUserId"
      params.currentUserId = req.user.id
    }

    if (employeeId) {
      whereClause += " AND wl.employeeId = @employeeId"
      params.employeeId = employeeId
    }

    if (projectId) {
      whereClause += " AND wl.projectId = @projectId"
      params.projectId = projectId
    }

    if (startDate) {
      whereClause += " AND wl.logDate >= @startDate"
      params.startDate = startDate
    }

    if (endDate) {
      whereClause += " AND wl.logDate <= @endDate"
      params.endDate = endDate
    }

    // Get total count
    const countResult = await database.query(`SELECT COUNT(*) as total FROM WorkLogs wl ${whereClause}`, params)

    const total = countResult.recordset[0].total

    // Get work logs
    const result = await database.query(
      `
      SELECT wl.*, 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             p.name as projectName
      FROM WorkLogs wl
      JOIN Employees e ON wl.employeeId = e.id
      LEFT JOIN Projects p ON wl.projectId = p.id
      ${whereClause}
      ORDER BY wl.${sortBy} ${sortOrder}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
      { ...params, offset: Number.parseInt(offset), limit: Number.parseInt(limit) },
    )

    res.json({
      workLogs: result.recordset,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get work logs error:", error)
    res.status(500).json({ error: "Failed to fetch work logs" })
  }
})

// Create work log
router.post("/work-logs", validate(workLogSchemas.create), async (req, res) => {
  try {
    const { projectId, logDate, hoursWorked, taskDescription, status = "Completed" } = req.body

    // Validate hours worked for the day (max 24 hours)
    const existingHoursResult = await database.query(
      `
      SELECT SUM(hoursWorked) as totalHours
      FROM WorkLogs
      WHERE employeeId = @employeeId AND logDate = @logDate
    `,
      { employeeId: req.user.id, logDate },
    )

    const existingHours = existingHoursResult.recordset[0].totalHours || 0
    if (existingHours + hoursWorked > 24) {
      return res.status(400).json({
        error: `Total hours for the day cannot exceed 24. Current: ${existingHours}, Adding: ${hoursWorked}`,
      })
    }

    const result = await database.query(
      `
      INSERT INTO WorkLogs (employeeId, projectId, logDate, hoursWorked, taskDescription, status)
      OUTPUT INSERTED.id VALUES (@employeeId, @projectId, @logDate, @hoursWorked, @taskDescription, @status)
    `,
      {
        employeeId: req.user.id,
        projectId,
        logDate,
        hoursWorked,
        taskDescription,
        status,
      },
    )

    res.status(201).json({
      message: "Work log created successfully",
      workLogId: result.recordset[0].id,
    })
  } catch (error) {
    console.error("Create work log error:", error)
    res.status(500).json({ error: "Failed to create work log" })
  }
})

// Update work log
router.put("/work-logs/:id", validate(workLogSchemas.update), async (req, res) => {
  try {
    const { id } = req.params
    const updateFields = req.body

    // Check if work log exists and belongs to user (or user is manager)
    const workLogResult = await database.query("SELECT employeeId FROM WorkLogs WHERE id = @id", { id })

    if (workLogResult.recordset.length === 0) {
      return res.status(404).json({ error: "Work log not found" })
    }

    const workLog = workLogResult.recordset[0]

    // Check permissions
    const userRoleResult = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    const isManagerOrHR =
      userRoleResult.recordset[0]?.name?.includes("Manager") || userRoleResult.recordset[0]?.name?.includes("HR")

    if (workLog.employeeId !== req.user.id && !isManagerOrHR) {
      return res.status(403).json({ error: "Access denied - not authorized to update this work log" })
    }

    // Build dynamic update query
    const setClause = Object.keys(updateFields)
      .map((key) => `${key} = @${key}`)
      .join(", ")

    await database.query(`UPDATE WorkLogs SET ${setClause}, updatedAt = GETDATE() WHERE id = @id`, {
      ...updateFields,
      id,
    })

    res.json({ message: "Work log updated successfully" })
  } catch (error) {
    console.error("Update work log error:", error)
    res.status(500).json({ error: "Failed to update work log" })
  }
})

// Delete work log
router.delete("/work-logs/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Check if work log exists and belongs to user (or user is manager)
    const workLogResult = await database.query("SELECT employeeId FROM WorkLogs WHERE id = @id", { id })

    if (workLogResult.recordset.length === 0) {
      return res.status(404).json({ error: "Work log not found" })
    }

    const workLog = workLogResult.recordset[0]

    // Check permissions
    const userRoleResult = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    const isManagerOrHR =
      userRoleResult.recordset[0]?.name?.includes("Manager") || userRoleResult.recordset[0]?.name?.includes("HR")

    if (workLog.employeeId !== req.user.id && !isManagerOrHR) {
      return res.status(403).json({ error: "Access denied - not authorized to delete this work log" })
    }

    await database.query("DELETE FROM WorkLogs WHERE id = @id", { id })

    res.json({ message: "Work log deleted successfully" })
  } catch (error) {
    console.error("Delete work log error:", error)
    res.status(500).json({ error: "Failed to delete work log" })
  }
})

// Get projects
router.get("/projects", async (req, res) => {
  try {
    const result = await database.query(`
      SELECT p.*, 
             m.firstName + ' ' + m.lastName as managerName,
             d.name as departmentName
      FROM Projects p
      LEFT JOIN Employees m ON p.managerId = m.id
      LEFT JOIN Departments d ON p.departmentId = d.id
      WHERE p.status = 'Active'
      ORDER BY p.name
    `)

    res.json(result.recordset)
  } catch (error) {
    console.error("Get projects error:", error)
    res.status(500).json({ error: "Failed to fetch projects" })
  }
})

// Get performance analytics
router.get("/analytics", authorize(["view_all_reports", "manage_team"]), async (req, res) => {
  try {
    const { departmentId = "", period = "current-quarter" } = req.query

    let dateFilter = ""
    const params = {}

    // Set date filter based on period
    switch (period) {
      case "current-month":
        dateFilter = "AND pr.reviewDate >= DATEADD(month, -1, GETDATE())"
        break
      case "current-quarter":
        dateFilter = "AND pr.reviewDate >= DATEADD(quarter, -1, GETDATE())"
        break
      case "current-year":
        dateFilter = "AND pr.reviewDate >= DATEADD(year, -1, GETDATE())"
        break
    }

    if (departmentId) {
      dateFilter += " AND e.departmentId = @departmentId"
      params.departmentId = departmentId
    }

    // Get performance by department
    const departmentPerformanceResult = await database.query(
      `
      SELECT d.name as departmentName,
             AVG(CAST(pr.overallRating as FLOAT)) as avgRating,
             COUNT(pr.id) as reviewCount,
             COUNT(DISTINCT pr.employeeId) as employeeCount
      FROM PerformanceReviews pr
      JOIN Employees e ON pr.employeeId = e.id
      JOIN Departments d ON e.departmentId = d.id
      WHERE pr.status = 'Published' ${dateFilter}
      GROUP BY d.id, d.name
      ORDER BY avgRating DESC
    `,
      params,
    )

    // Get top performers
    const topPerformersResult = await database.query(
      `
      SELECT TOP 10 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             d.name as departmentName,
             AVG(CAST(pr.overallRating as FLOAT)) as avgRating,
             COUNT(pr.id) as reviewCount
      FROM PerformanceReviews pr
      JOIN Employees e ON pr.employeeId = e.id
      JOIN Departments d ON e.departmentId = d.id
      WHERE pr.status = 'Published' ${dateFilter}
      GROUP BY e.id, e.firstName, e.lastName, e.employeeId, d.name
      HAVING COUNT(pr.id) >= 1
      ORDER BY avgRating DESC
    `,
      params,
    )

    // Get work hours analytics
    const workHoursResult = await database.query(
      `
      SELECT 
        YEAR(wl.logDate) as year,
        MONTH(wl.logDate) as month,
        SUM(wl.hoursWorked) as totalHours,
        AVG(wl.hoursWorked) as avgHoursPerDay,
        COUNT(DISTINCT wl.employeeId) as activeEmployees
      FROM WorkLogs wl
      JOIN Employees e ON wl.employeeId = e.id
      WHERE wl.logDate >= DATEADD(month, -6, GETDATE()) ${departmentId ? "AND e.departmentId = @departmentId" : ""}
      GROUP BY YEAR(wl.logDate), MONTH(wl.logDate)
      ORDER BY year DESC, month DESC
    `,
      params,
    )

    res.json({
      departmentPerformance: departmentPerformanceResult.recordset,
      topPerformers: topPerformersResult.recordset,
      workHours: workHoursResult.recordset,
    })
  } catch (error) {
    console.error("Get performance analytics error:", error)
    res.status(500).json({ error: "Failed to fetch performance analytics" })
  }
})

module.exports = router
