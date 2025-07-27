const express = require("express")
const bcrypt = require("bcryptjs")
const database = require("../config/database")
const { validate, employeeSchemas } = require("../middleware/validation")
const { authorize, isManager } = require("../middleware/auth")

const router = express.Router()

// Get all employees (with pagination and filtering)
router.get("/", authorize(["manage_employees", "view_all_reports"]), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      status = "",
      sortBy = "firstName",
      sortOrder = "ASC",
    } = req.query

    const offset = (page - 1) * limit

    let whereClause = "WHERE 1=1"
    const params = {}

    if (search) {
      whereClause += ` AND (e.firstName LIKE @search OR e.lastName LIKE @search OR e.email LIKE @search OR e.employeeId LIKE @search)`
      params.search = `%${search}%`
    }

    if (department) {
      whereClause += ` AND d.name = @department`
      params.department = department
    }

    if (status) {
      whereClause += ` AND e.status = @status`
      params.status = status
    }

    // Get total count
    const countResult = await database.query(
      `SELECT COUNT(*) as total 
       FROM Employees e
       LEFT JOIN Departments d ON e.departmentId = d.id
       ${whereClause}`,
      params,
    )

    const total = countResult.recordset[0].total

    // Get employees with pagination
    const result = await database.query(
      `SELECT e.id, e.employeeId, e.firstName, e.lastName, e.email, e.phone,
              e.hireDate, e.status, e.salary,
              d.name as departmentName,
              r.name as roleName,
              m.firstName + ' ' + m.lastName as managerName
       FROM Employees e
       LEFT JOIN Departments d ON e.departmentId = d.id
       LEFT JOIN Roles r ON e.roleId = r.id
       LEFT JOIN Employees m ON e.managerId = m.id
       ${whereClause}
       ORDER BY e.${sortBy} ${sortOrder}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset: Number.parseInt(offset), limit: Number.parseInt(limit) },
    )

    res.json({
      employees: result.recordset,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get employees error:", error)
    res.status(500).json({ error: "Failed to fetch employees" })
  }
})

// Get employee by ID
router.get("/:id", authorize(["manage_employees", "view_all_reports"]), async (req, res) => {
  try {
    const { id } = req.params

    const result = await database.query(
      `SELECT e.*, 
              d.name as departmentName,
              r.name as roleName, r.permissions,
              m.firstName + ' ' + m.lastName as managerName
       FROM Employees e
       LEFT JOIN Departments d ON e.departmentId = d.id
       LEFT JOIN Roles r ON e.roleId = r.id
       LEFT JOIN Employees m ON e.managerId = m.id
       WHERE e.id = @id`,
      { id },
    )

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Employee not found" })
    }

    const employee = result.recordset[0]

    // Remove sensitive data
    delete employee.passwordHash

    // Parse JSON fields
    if (employee.emergencyContact) {
      employee.emergencyContact = JSON.parse(employee.emergencyContact)
    }
    if (employee.permissions) {
      employee.permissions = JSON.parse(employee.permissions)
    }

    res.json(employee)
  } catch (error) {
    console.error("Get employee error:", error)
    res.status(500).json({ error: "Failed to fetch employee" })
  }
})

// Create new employee
router.post("/", authorize(["manage_employees"]), validate(employeeSchemas.create), async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      hireDate,
      departmentId,
      roleId,
      managerId,
      salary,
      address,
      emergencyContact,
      password,
    } = req.body

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    const result = await database.query(
      `INSERT INTO Employees (
        employeeId, firstName, lastName, email, phone, dateOfBirth,
        hireDate, departmentId, roleId, managerId, salary, address,
        emergencyContact, passwordHash, status
      ) OUTPUT INSERTED.id VALUES (
        @employeeId, @firstName, @lastName, @email, @phone, @dateOfBirth,
        @hireDate, @departmentId, @roleId, @managerId, @salary, @address,
        @emergencyContact, @passwordHash, 'Active'
      )`,
      {
        employeeId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        hireDate,
        departmentId,
        roleId,
        managerId,
        salary,
        address,
        emergencyContact: emergencyContact ? JSON.stringify(emergencyContact) : null,
        passwordHash,
      },
    )

    const newEmployeeId = result.recordset[0].id

    // Create default leave balances for the new employee
    const currentYear = new Date().getFullYear()
    await database.query(
      `INSERT INTO LeaveBalances (employeeId, leaveTypeId, year, totalDays)
       SELECT @employeeId, id, @year, maxDaysPerYear
       FROM LeaveTypes
       WHERE maxDaysPerYear > 0`,
      { employeeId: newEmployeeId, year: currentYear },
    )

    // Log audit trail
    await database.query(
      `INSERT INTO AuditLogs (userId, action, tableName, recordId, newValues)
       VALUES (@userId, 'CREATE', 'Employees', @recordId, @newValues)`,
      {
        userId: req.user.id,
        recordId: newEmployeeId,
        newValues: JSON.stringify(req.body),
      },
    )

    res.status(201).json({
      message: "Employee created successfully",
      employeeId: newEmployeeId,
    })
  } catch (error) {
    console.error("Create employee error:", error)
    if (error.number === 2627) {
      // Duplicate key
      res.status(409).json({ error: "Employee ID or email already exists" })
    } else {
      res.status(500).json({ error: "Failed to create employee" })
    }
  }
})

// Update employee
router.put("/:id", authorize(["manage_employees"]), validate(employeeSchemas.update), async (req, res) => {
  try {
    const { id } = req.params
    const updateFields = req.body

    // Get current employee data for audit log
    const currentResult = await database.query("SELECT * FROM Employees WHERE id = @id", { id })

    if (currentResult.recordset.length === 0) {
      return res.status(404).json({ error: "Employee not found" })
    }

    // Build dynamic update query
    const setClause = Object.keys(updateFields)
      .map((key) => `${key} = @${key}`)
      .join(", ")

    const params = { ...updateFields, id }

    // Handle JSON fields
    if (updateFields.emergencyContact) {
      params.emergencyContact = JSON.stringify(updateFields.emergencyContact)
    }

    await database.query(`UPDATE Employees SET ${setClause}, updatedAt = GETDATE() WHERE id = @id`, params)

    // Log audit trail
    await database.query(
      `INSERT INTO AuditLogs (userId, action, tableName, recordId, oldValues, newValues)
       VALUES (@userId, 'UPDATE', 'Employees', @recordId, @oldValues, @newValues)`,
      {
        userId: req.user.id,
        recordId: id,
        oldValues: JSON.stringify(currentResult.recordset[0]),
        newValues: JSON.stringify(updateFields),
      },
    )

    res.json({ message: "Employee updated successfully" })
  } catch (error) {
    console.error("Update employee error:", error)
    res.status(500).json({ error: "Failed to update employee" })
  }
})

// Delete employee (soft delete)
router.delete("/:id", authorize(["manage_employees"]), async (req, res) => {
  try {
    const { id } = req.params

    // Check if employee exists
    const result = await database.query("SELECT * FROM Employees WHERE id = @id", { id })

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Employee not found" })
    }

    // Soft delete by updating status
    await database.query("UPDATE Employees SET status = @status, updatedAt = GETDATE() WHERE id = @id", {
      status: "Terminated",
      id,
    })

    // Log audit trail
    await database.query(
      `INSERT INTO AuditLogs (userId, action, tableName, recordId, oldValues)
       VALUES (@userId, 'DELETE', 'Employees', @recordId, @oldValues)`,
      {
        userId: req.user.id,
        recordId: id,
        oldValues: JSON.stringify(result.recordset[0]),
      },
    )

    res.json({ message: "Employee deleted successfully" })
  } catch (error) {
    console.error("Delete employee error:", error)
    res.status(500).json({ error: "Failed to delete employee" })
  }
})

// Get departments
router.get("/meta/departments", async (req, res) => {
  try {
    const result = await database.query("SELECT id, name, description FROM Departments ORDER BY name")

    res.json(result.recordset)
  } catch (error) {
    console.error("Get departments error:", error)
    res.status(500).json({ error: "Failed to fetch departments" })
  }
})

// Get roles
router.get("/meta/roles", async (req, res) => {
  try {
    const result = await database.query("SELECT id, name, description FROM Roles ORDER BY name")

    res.json(result.recordset)
  } catch (error) {
    console.error("Get roles error:", error)
    res.status(500).json({ error: "Failed to fetch roles" })
  }
})

module.exports = router
