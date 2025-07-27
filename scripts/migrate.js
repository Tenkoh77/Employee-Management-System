const database = require("../config/database")
const fs = require("fs").promises

async function runMigrations() {
  try {
    console.log("🔄 Starting database migrations...")

    // Read and execute schema file
    const schemaSQL = await fs.readFile("./scripts/schema.sql", "utf8")

    // Split by GO statements (SQL Server batch separator)
    const batches = schemaSQL.split(/\bGO\b/gi).filter((batch) => batch.trim())

    for (const batch of batches) {
      if (batch.trim()) {
        try {
          await database.query(batch)
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes("already exists") && !error.message.includes("There is already an object")) {
            throw error
          }
        }
      }
    }

    console.log("✅ Database migrations completed successfully!")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = runMigrations
