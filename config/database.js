const sql = require("mssql")

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // Use encryption for Azure SQL
    trustServerCertificate: true, // For local development
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

class Database {
  constructor() {
    this.pool = null
  }

  async connect() {
    try {
      this.pool = await sql.connect(config)
      console.log("✅ Connected to SQL Server database")
      return this.pool
    } catch (error) {
      console.error("❌ Database connection failed:", error)
      throw error
    }
  }

  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close()
        console.log("🔌 Disconnected from database")
      }
    } catch (error) {
      console.error("❌ Error disconnecting from database:", error)
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.")
    }
    return this.pool
  }

  async query(queryString, params = {}) {
    try {
      const pool = this.getPool()
      const request = pool.request()

      // Add parameters to request
      Object.keys(params).forEach((key) => {
        request.input(key, params[key])
      })

      const result = await request.query(queryString)
      return result
    } catch (error) {
      console.error("❌ Database query error:", error)
      throw error
    }
  }
}

const database = new Database()

// Initialize database connection
database.connect().catch(console.error)

// Graceful shutdown
process.on("SIGINT", async () => {
  await database.disconnect()
  process.exit(0)
})

module.exports = database
