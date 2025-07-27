const jwt = require("jsonwebtoken")
const database = require("../config/database")

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verify user still exists and is active
    const result = await database.query(
      "SELECT id, employeeId, firstName, lastName, email, roleId, status FROM Employees WHERE id = @userId AND status = @status",
      { userId: decoded.userId, status: "Active" },
    )

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid or expired token" })
    }

    req.user = result.recordset[0]
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" })
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" })
    }
    console.error("Auth middleware error:", error)
    res.status(500).json({ error: "Authentication error" })
  }
}

const authorize = (permissions) => {
  return async (req, res, next) => {
    try {
      // Get user role permissions
      const result = await database.query(
        "SELECT r.permissions FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
        { userId: req.user.id },
      )

      if (result.recordset.length === 0) {
        return res.status(403).json({ error: "Access denied - no role found" })
      }

      const userPermissions = JSON.parse(result.recordset[0].permissions || "[]")

      // Check if user has required permissions
      const hasPermission = permissions.some(
        (permission) => userPermissions.includes(permission) || userPermissions.includes("all"),
      )

      if (!hasPermission) {
        return res.status(403).json({ error: "Access denied - insufficient permissions" })
      }

      next()
    } catch (error) {
      console.error("Authorization error:", error)
      res.status(500).json({ error: "Authorization error" })
    }
  }
}

const isManager = async (req, res, next) => {
  try {
    const result = await database.query(
      "SELECT r.name FROM Roles r JOIN Employees e ON r.id = e.roleId WHERE e.id = @userId",
      { userId: req.user.id },
    )

    if (result.recordset.length === 0 || !result.recordset[0].name.includes("Manager")) {
      return res.status(403).json({ error: "Manager access required" })
    }

    next()
  } catch (error) {
    console.error("Manager check error:", error)
    res.status(500).json({ error: "Authorization error" })
  }
}

module.exports = {
  authenticateToken,
  authorize,
  isManager,
}
