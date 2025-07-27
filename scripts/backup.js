const database = require("../config/database")
const fs = require("fs").promises
const path = require("path")

async function createBackup() {
  try {
    console.log("💾 Creating database backup...")

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupDir = path.join(__dirname, "../backups")

    // Ensure backup directory exists
    try {
      await fs.mkdir(backupDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Get all table names
    const tablesResult = await database.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_CATALOG = DB_NAME()
      ORDER BY TABLE_NAME
    `)

    const tables = tablesResult.recordset.map((row) => row.TABLE_NAME)
    let backupSQL = `-- Database Backup Created: ${new Date().toISOString()}\n\n`

    // Export data from each table
    for (const tableName of tables) {
      console.log(`📋 Backing up table: ${tableName}`)

      try {
        const dataResult = await database.query(`SELECT * FROM [${tableName}]`)

        if (dataResult.recordset.length > 0) {
          backupSQL += `-- Data for table: ${tableName}\n`

          // Get column names
          const columns = Object.keys(dataResult.recordset[0])
          const columnList = columns.map((col) => `[${col}]`).join(", ")

          backupSQL += `INSERT INTO [${tableName}] (${columnList}) VALUES\n`

          const values = dataResult.recordset.map((row) => {
            const rowValues = columns.map((col) => {
              const value = row[col]
              if (value === null) return "NULL"
              if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`
              if (value instanceof Date) return `'${value.toISOString()}'`
              return value
            })
            return `(${rowValues.join(", ")})`
          })

          backupSQL += values.join(",\n") + ";\n\n"
        }
      } catch (error) {
        console.warn(`⚠️ Warning: Could not backup table ${tableName}:`, error.message)
      }
    }

    // Write backup file
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`)
    await fs.writeFile(backupFile, backupSQL, "utf8")

    console.log(`✅ Backup created successfully: ${backupFile}`)
    return backupFile
  } catch (error) {
    console.error("❌ Backup failed:", error)
    throw error
  }
}

// Run backup if called directly
if (require.main === module) {
  createBackup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = createBackup
