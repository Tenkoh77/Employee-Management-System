const database = require("../config/database");
const fs = require("fs");
const path = require("path");

async function setupDatabase() {
  try {
    console.log("🔧 Setting up database connection...");

    // Test connection
    await database.connect();
    console.log("✅ Database connection successful!");

    // Test a simple query
    const result = await database.query("SELECT @@VERSION as version");
    console.log("📊 SQL Server Version:", result.recordset[0].version);

    // Check if tables exist
    const tablesResult = await database.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);

    if (tablesResult.recordset.length === 0) {
      console.log("📋 No tables found. You need to run the schema script first.");
      console.log("💡 In SSMS, open scripts/schema.sql and execute it.");
    } else {
      console.log("📋 Found tables:", tablesResult.recordset.map(t => t.TABLE_NAME).join(", "));
    }

    await database.disconnect();
    console.log("🔌 Database connection closed.");

  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check if SQL Server is running");
    console.log("2. Verify your .env file has correct database credentials");
    console.log("3. Ensure the database 'EmployeeManagementDB' exists");
    console.log("4. Check if your user has access to the database");
    console.log("5. Verify SQL Server authentication mode");

    if (error.code === 'ELOGIN') {
      console.log("\n🔐 Authentication Error - Try these solutions:");
      console.log("- Use Windows Authentication: set trustedConnection: true in config");
      console.log("- Check SQL Server is configured for mixed mode authentication");
      console.log("- Verify username and password in .env file");
    }

    if (error.code === 'ENOTFOUND') {
      console.log("\n🌐 Connection Error - Try these solutions:");
      console.log("- Check if SQL Server service is running");
      console.log("- Verify server name in .env file");
      console.log("- Try 'localhost' or 'localhost\\SQLEXPRESS' for named instances");
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = setupDatabase;