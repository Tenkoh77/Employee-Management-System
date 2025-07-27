const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)

  // Default error
  const error = {
    message: err.message || "Internal Server Error",
    status: err.status || 500,
  }

  // SQL Server errors
  if (err.code) {
    switch (err.code) {
      case "EREQUEST":
        error.message = "Database request error"
        error.status = 400
        break
      case "ECONNRESET":
        error.message = "Database connection lost"
        error.status = 503
        break
      case "ETIMEOUT":
        error.message = "Database timeout"
        error.status = 504
        break
    }
  }

  // Validation errors
  if (err.isJoi) {
    error.message = err.details[0].message
    error.status = 400
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token"
    error.status = 401
  }

  if (err.name === "TokenExpiredError") {
    error.message = "Token expired"
    error.status = 401
  }

  // Duplicate key error
  if (err.number === 2627) {
    error.message = "Duplicate entry - record already exists"
    error.status = 409
  }

  // Foreign key constraint error
  if (err.number === 547) {
    error.message = "Cannot delete - record is referenced by other data"
    error.status = 409
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
