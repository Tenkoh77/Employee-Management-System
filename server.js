const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const morgan = require("morgan")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const employeeRoutes = require("./routes/employees")
const leaveRoutes = require("./routes/leave")
const performanceRoutes = require("./routes/performance")
const reportRoutes = require("./routes/reports")
const notificationRoutes = require("./routes/notifications")

const { authenticateToken } = require("./middleware/auth")
const errorHandler = require("./middleware/errorHandler")

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Logging
app.use(morgan("combined"))

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/employees", authenticateToken, employeeRoutes)
app.use("/api/leave", authenticateToken, leaveRoutes)
app.use("/api/performance", authenticateToken, performanceRoutes)
app.use("/api/reports", authenticateToken, reportRoutes)
app.use("/api/notifications", authenticateToken, notificationRoutes)

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`)
})

module.exports = app
