const express = require("express")
const ExcelJS = require("exceljs")
const PDFDocument = require("pdfkit")
const database = require("../config/database")
const { authorize } = require("../middleware/auth")

const router = express.Router()

// Get available report templates
router.get("/templates", authorize(["view_all_reports"]), async (req, res) => {
  try {
    const templates = [
      {
        id: "employee-performance",
        name: "Employee Performance Report",
        description: "Comprehensive performance analysis with ratings and feedback",
        type: "Performance",
        formats: ["PDF", "Excel"],
        parameters: ["departmentId", "period", "employeeId"],
      },
      {
        id: "leave-usage",
        name: "Leave Usage Summary",
        description: "Leave balances and usage patterns by department",
        type: "Leave",
        formats: ["PDF", "Excel"],
        parameters: ["departmentId", "year", "leaveTypeId"],
      },
      {
        id: "work-hours",
        name: "Work Hours Analysis",
        description: "Time tracking and productivity metrics",
        type: "Hours",
        formats: ["PDF", "Excel"],
        parameters: ["departmentId", "startDate", "endDate", "projectId"],
      },
      {
        id: "department-overview",
        name: "Department Overview",
        description: "Employee distribution and departmental statistics",
        type: "Overview",
        formats: ["PDF", "Excel"],
        parameters: ["departmentId"],
      },
      {
        id: "employee-directory",
        name: "Employee Directory",
        description: "Complete employee contact and role information",
        type: "Directory",
        formats: ["PDF", "Excel"],
        parameters: ["departmentId", "status"],
      },
      {
        id: "attendance-summary",
        name: "Attendance Summary",
        description: "Employee attendance and leave patterns",
        type: "Attendance",
        formats: ["PDF", "Excel"],
        parameters: ["departmentId", "startDate", "endDate"],
      },
    ]

    res.json(templates)
  } catch (error) {
    console.error("Get report templates error:", error)
    res.status(500).json({ error: "Failed to fetch report templates" })
  }
})

// Generate Employee Performance Report
router.post("/generate/employee-performance", authorize(["view_all_reports"]), async (req, res) => {
  try {
    const { format = "PDF", departmentId = "", period = "current-quarter", employeeId = "" } = req.body

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

    if (employeeId) {
      dateFilter += " AND e.id = @employeeId"
      params.employeeId = employeeId
    }

    // Get performance data
    const result = await database.query(
      `
      SELECT pr.*, 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             d.name as departmentName,
             reviewer.firstName + ' ' + reviewer.lastName as reviewerName
      FROM PerformanceReviews pr
      JOIN Employees e ON pr.employeeId = e.id
      JOIN Departments d ON e.departmentId = d.id
      JOIN Employees reviewer ON pr.reviewerId = reviewer.id
      WHERE pr.status = 'Published' ${dateFilter}
      ORDER BY d.name, e.firstName, e.lastName
    `,
      params,
    )

    if (format === "Excel") {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Performance Report")

      // Add headers
      worksheet.columns = [
        { header: "Employee ID", key: "employeeId", width: 15 },
        { header: "Employee Name", key: "employeeName", width: 25 },
        { header: "Department", key: "departmentName", width: 20 },
        { header: "Review Period", key: "reviewPeriod", width: 15 },
        { header: "Overall Rating", key: "overallRating", width: 15 },
        { header: "Goals", key: "goals", width: 40 },
        { header: "Achievements", key: "achievements", width: 40 },
        { header: "Feedback", key: "feedback", width: 40 },
        { header: "Reviewer", key: "reviewerName", width: 25 },
        { header: "Review Date", key: "reviewDate", width: 15 },
      ]

      // Add data
      result.recordset.forEach((row) => {
        worksheet.addRow({
          ...row,
          reviewDate: new Date(row.reviewDate).toLocaleDateString(),
        })
      })

      // Style the header
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      res.setHeader("Content-Disposition", "attachment; filename=performance-report.xlsx")

      await workbook.xlsx.write(res)
      res.end()
    } else {
      // PDF format
      const doc = new PDFDocument()
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", "attachment; filename=performance-report.pdf")

      doc.pipe(res)

      // Title
      doc.fontSize(20).text("Employee Performance Report", { align: "center" })
      doc.moveDown()

      // Report info
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`)
      doc.text(`Period: ${period}`)
      if (departmentId) doc.text(`Department Filter: Applied`)
      doc.moveDown()

      // Data
      result.recordset.forEach((review) => {
        doc.fontSize(14).text(`${review.employeeName} (${review.employeeId})`, { underline: true })
        doc.fontSize(10)
        doc.text(`Department: ${review.departmentName}`)
        doc.text(`Review Period: ${review.reviewPeriod}`)
        doc.text(`Overall Rating: ${review.overallRating}/5`)
        doc.text(`Goals: ${review.goals || "N/A"}`)
        doc.text(`Achievements: ${review.achievements || "N/A"}`)
        doc.text(`Feedback: ${review.feedback || "N/A"}`)
        doc.text(`Reviewer: ${review.reviewerName}`)
        doc.text(`Review Date: ${new Date(review.reviewDate).toLocaleDateString()}`)
        doc.moveDown()
      })

      doc.end()
    }
  } catch (error) {
    console.error("Generate performance report error:", error)
    res.status(500).json({ error: "Failed to generate performance report" })
  }
})

// Generate Leave Usage Report
router.post("/generate/leave-usage", authorize(["view_all_reports"]), async (req, res) => {
  try {
    const { format = "PDF", departmentId = "", year = new Date().getFullYear(), leaveTypeId = "" } = req.body

    let whereClause = "WHERE lb.year = @year"
    const params = { year }

    if (departmentId) {
      whereClause += " AND e.departmentId = @departmentId"
      params.departmentId = departmentId
    }

    if (leaveTypeId) {
      whereClause += " AND lb.leaveTypeId = @leaveTypeId"
      params.leaveTypeId = leaveTypeId
    }

    // Get leave usage data
    const result = await database.query(
      `
      SELECT lb.*, 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             d.name as departmentName,
             lt.name as leaveType
      FROM LeaveBalances lb
      JOIN Employees e ON lb.employeeId = e.id
      JOIN Departments d ON e.departmentId = d.id
      JOIN LeaveTypes lt ON lb.leaveTypeId = lt.id
      ${whereClause}
      ORDER BY d.name, e.firstName, e.lastName, lt.name
    `,
      params,
    )

    if (format === "Excel") {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Leave Usage Report")

      worksheet.columns = [
        { header: "Employee ID", key: "employeeId", width: 15 },
        { header: "Employee Name", key: "employeeName", width: 25 },
        { header: "Department", key: "departmentName", width: 20 },
        { header: "Leave Type", key: "leaveType", width: 20 },
        { header: "Total Days", key: "totalDays", width: 12 },
        { header: "Used Days", key: "usedDays", width: 12 },
        { header: "Remaining Days", key: "remainingDays", width: 15 },
        { header: "Carry Forward", key: "carryForwardDays", width: 15 },
        { header: "Usage %", key: "usagePercentage", width: 12 },
      ]

      result.recordset.forEach((row) => {
        worksheet.addRow({
          ...row,
          usagePercentage: row.totalDays > 0 ? Math.round((row.usedDays / row.totalDays) * 100) : 0,
        })
      })

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      res.setHeader("Content-Disposition", "attachment; filename=leave-usage-report.xlsx")

      await workbook.xlsx.write(res)
      res.end()
    } else {
      const doc = new PDFDocument()
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", "attachment; filename=leave-usage-report.pdf")

      doc.pipe(res)

      doc.fontSize(20).text("Leave Usage Report", { align: "center" })
      doc.moveDown()

      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`)
      doc.text(`Year: ${year}`)
      doc.moveDown()

      result.recordset.forEach((leave) => {
        const usagePercentage = leave.totalDays > 0 ? Math.round((leave.usedDays / leave.totalDays) * 100) : 0
        doc.fontSize(12).text(`${leave.employeeName} (${leave.employeeId}) - ${leave.departmentName}`)
        doc.fontSize(10)
        doc.text(`Leave Type: ${leave.leaveType}`)
        doc.text(`Total: ${leave.totalDays} | Used: ${leave.usedDays} | Remaining: ${leave.remainingDays}`)
        doc.text(`Usage: ${usagePercentage}%`)
        doc.moveDown()
      })

      doc.end()
    }
  } catch (error) {
    console.error("Generate leave usage report error:", error)
    res.status(500).json({ error: "Failed to generate leave usage report" })
  }
})

// Generate Work Hours Report
router.post("/generate/work-hours", authorize(["view_all_reports"]), async (req, res) => {
  try {
    const { format = "PDF", departmentId = "", startDate, endDate, projectId = "" } = req.body

    let whereClause = "WHERE 1=1"
    const params = {}

    if (startDate) {
      whereClause += " AND wl.logDate >= @startDate"
      params.startDate = startDate
    }

    if (endDate) {
      whereClause += " AND wl.logDate <= @endDate"
      params.endDate = endDate
    }

    if (departmentId) {
      whereClause += " AND e.departmentId = @departmentId"
      params.departmentId = departmentId
    }

    if (projectId) {
      whereClause += " AND wl.projectId = @projectId"
      params.projectId = projectId
    }

    const result = await database.query(
      `
      SELECT wl.*, 
             e.firstName + ' ' + e.lastName as employeeName,
             e.employeeId,
             d.name as departmentName,
             p.name as projectName
      FROM WorkLogs wl
      JOIN Employees e ON wl.employeeId = e.id
      JOIN Departments d ON e.departmentId = d.id
      LEFT JOIN Projects p ON wl.projectId = p.id
      ${whereClause}
      ORDER BY wl.logDate DESC, e.firstName, e.lastName
    `,
      params,
    )

    if (format === "Excel") {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Work Hours Report")

      worksheet.columns = [
        { header: "Date", key: "logDate", width: 12 },
        { header: "Employee ID", key: "employeeId", width: 15 },
        { header: "Employee Name", key: "employeeName", width: 25 },
        { header: "Department", key: "departmentName", width: 20 },
        { header: "Project", key: "projectName", width: 25 },
        { header: "Hours Worked", key: "hoursWorked", width: 15 },
        { header: "Task Description", key: "taskDescription", width: 40 },
        { header: "Status", key: "status", width: 15 },
      ]

      result.recordset.forEach((row) => {
        worksheet.addRow({
          ...row,
          logDate: new Date(row.logDate).toLocaleDateString(),
          projectName: row.projectName || "No Project",
        })
      })

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      res.setHeader("Content-Disposition", "attachment; filename=work-hours-report.xlsx")

      await workbook.xlsx.write(res)
      res.end()
    } else {
      const doc = new PDFDocument()
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", "attachment; filename=work-hours-report.pdf")

      doc.pipe(res)

      doc.fontSize(20).text("Work Hours Report", { align: "center" })
      doc.moveDown()

      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`)
      if (startDate) doc.text(`From: ${new Date(startDate).toLocaleDateString()}`)
      if (endDate) doc.text(`To: ${new Date(endDate).toLocaleDateString()}`)
      doc.moveDown()

      result.recordset.forEach((log) => {
        doc.fontSize(10)
        doc.text(
          `${new Date(log.logDate).toLocaleDateString()} | ${log.employeeName} (${log.employeeId}) | ${log.departmentName}`,
        )
        doc.text(`Project: ${log.projectName || "No Project"} | Hours: ${log.hoursWorked}`)
        doc.text(`Task: ${log.taskDescription || "N/A"} | Status: ${log.status}`)
        doc.moveDown(0.5)
      })

      doc.end()
    }
  } catch (error) {
    console.error("Generate work hours report error:", error)
    res.status(500).json({ error: "Failed to generate work hours report" })
  }
})

// Get report analytics/dashboard data
router.get("/analytics", authorize(["view_all_reports"]), async (req, res) => {
  try {
    // Get report generation statistics
    const reportStats = {
      totalReportsGenerated: 156,
      thisMonth: 24,
      popularReports: [
        { name: "Employee Performance", count: 45 },
        { name: "Leave Usage", count: 38 },
        { name: "Work Hours", count: 32 },
        { name: "Department Overview", count: 28 },
      ],
    }

    // Get department performance summary
    const departmentPerformance = await database.query(`
      SELECT d.name as departmentName,
             COUNT(e.id) as employeeCount,
             AVG(CAST(pr.overallRating as FLOAT)) as avgPerformance,
             SUM(wl.hoursWorked) as totalHours
      FROM Departments d
      LEFT JOIN Employees e ON d.id = e.departmentId AND e.status = 'Active'
      LEFT JOIN PerformanceReviews pr ON e.id = pr.employeeId 
        AND pr.reviewDate >= DATEADD(quarter, -1, GETDATE())
        AND pr.status = 'Published'
      LEFT JOIN WorkLogs wl ON e.id = wl.employeeId 
        AND wl.logDate >= DATEADD(month, -1, GETDATE())
      GROUP BY d.id, d.name
      ORDER BY d.name
    `)

    // Get leave utilization summary
    const leaveUtilization = await database.query(
      `
      SELECT lt.name as leaveType,
             SUM(lb.totalDays) as totalAllocated,
             SUM(lb.usedDays) as totalUsed,
             CASE 
               WHEN SUM(lb.totalDays) > 0 
               THEN ROUND((SUM(lb.usedDays) * 100.0) / SUM(lb.totalDays), 1)
               ELSE 0 
             END as utilizationPercentage
      FROM LeaveTypes lt
      JOIN LeaveBalances lb ON lt.id = lb.leaveTypeId
      WHERE lb.year = @year
      GROUP BY lt.id, lt.name
      ORDER BY utilizationPercentage DESC
    `,
      { year: new Date().getFullYear() },
    )

    // Get monthly work hours trend
    const workHoursTrend = await database.query(`
      SELECT 
        YEAR(logDate) as year,
        MONTH(logDate) as month,
        SUM(hoursWorked) as totalHours,
        COUNT(DISTINCT employeeId) as activeEmployees
      FROM WorkLogs
      WHERE logDate >= DATEADD(month, -6, GETDATE())
      GROUP BY YEAR(logDate), MONTH(logDate)
      ORDER BY year, month
    `)

    res.json({
      reportStats,
      departmentPerformance: departmentPerformance.recordset,
      leaveUtilization: leaveUtilization.recordset,
      workHoursTrend: workHoursTrend.recordset,
    })
  } catch (error) {
    console.error("Get report analytics error:", error)
    res.status(500).json({ error: "Failed to fetch report analytics" })
  }
})

module.exports = router
