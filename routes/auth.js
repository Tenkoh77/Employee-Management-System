const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const database = require("../config/database")
const { validate, authSchemas } = require("../middleware/validation")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Login
router.post("/login", validate(authSchemas.login), async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const result = await database.query(
      `SELECT e.id, e.employeeId, e.firstName, e.lastName, e.email, e.passwordHash, e.status, 
              r.name as roleName, r.permissions, d.name as departmentName
       FROM Employees e
       LEFT JOIN Roles r ON e.roleId = r.id
       LEFT JOIN Departments d ON e.departmentId = d.id
       WHERE e.email = @email`,
      { email },
    )

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const user = result.recordset[0]

    // Check if user is active
    if (user.status !== "Active") {
      return res.status(401).json({ error: "Account is not active" })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        employeeId: user.employeeId,
        email: user.email,
        role: user.roleName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    )

    // Update last login
    await database.query("UPDATE Employees SET lastLogin = GETDATE() WHERE id = @userId", { userId: user.id })

    // Return user data and token (exclude password hash)
    const { passwordHash, ...userData } = user
    res.json({
      message: "Login successful",
      token,
      user: {
        ...userData,
        permissions: JSON.parse(user.permissions || "[]"),
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Login failed" })
  }
})

// Get current user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const result = await database.query(
      `SELECT e.id, e.employeeId, e.firstName, e.lastName, e.email, e.phone, 
              e.dateOfBirth, e.hireDate, e.status, e.address, e.emergencyContact,
              e.profilePicture, e.lastLogin,
              r.name as roleName, r.permissions,
              d.name as departmentName,
              m.firstName + ' ' + m.lastName as managerName
       FROM Employees e
       LEFT JOIN Roles r ON e.roleId = r.id
       LEFT JOIN Departments d ON e.departmentId = d.id
       LEFT JOIN Employees m ON e.managerId = m.id
       WHERE e.id = @userId`,
      { userId: req.user.id },
    )

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const user = result.recordset[0]
    res.json({
      ...user,
      permissions: JSON.parse(user.permissions || "[]"),
      emergencyContact: user.emergencyContact ? JSON.parse(user.emergencyContact) : null,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

// Change password
router.post("/change-password", authenticateToken, validate(authSchemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Get current password hash
    const result = await database.query("SELECT passwordHash FROM Employees WHERE id = @userId", {
      userId: req.user.id,
    })

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result.recordset[0].passwordHash)
    if (!isValidPassword) {
      return res.status(400).json({ error: "Current password is incorrect" })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await database.query(
      "UPDATE Employees SET passwordHash = @newPasswordHash, updatedAt = GETDATE() WHERE id = @userId",
      { newPasswordHash, userId: req.user.id },
    )

    res.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ error: "Failed to change password" })
  }
})

// Logout (client-side token invalidation)
router.post("/logout", authenticateToken, (req, res) => {
  // In a production environment, you might want to maintain a blacklist of tokens
  // For now, we'll just return success and let the client handle token removal
  res.json({ message: "Logged out successfully" })
})

// Refresh token
router.post("/refresh", authenticateToken, async (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign(
      {
        userId: req.user.id,
        employeeId: req.user.employeeId,
        email: req.user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    )

    res.json({ token })
  } catch (error) {
    console.error("Token refresh error:", error)
    res.status(500).json({ error: "Failed to refresh token" })
  }
})

module.exports = router
