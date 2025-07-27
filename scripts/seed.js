const database = require("../config/database")

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...")

    // Seed Departments
    await database.query(`
      INSERT INTO Departments (name, description) VALUES
      ('Engineering', 'Software development and technical operations'),
      ('Human Resources', 'Employee relations and organizational development'),
      ('Marketing', 'Brand promotion and customer acquisition'),
      ('Finance', 'Financial planning and accounting'),
      ('Operations', 'Business operations and process management'),
      ('Sales', 'Revenue generation and customer relations')
    `)

    // Seed Roles
    await database.query(`
      INSERT INTO Roles (name, description, permissions) VALUES
      ('Admin', 'System administrator with full access', '["all"]'),
      ('Manager', 'Department manager with team oversight', '["manage_team", "approve_leave", "view_reports"]'),
      ('HR Manager', 'Human resources management', '["manage_employees", "manage_leave", "view_all_reports"]'),
      ('Employee', 'Regular employee access', '["view_profile", "request_leave", "log_hours"]'),
      ('Senior Developer', 'Senior technical role', '["view_profile", "request_leave", "log_hours", "mentor_team"]'),
      ('Financial Analyst', 'Financial analysis and reporting', '["view_profile", "request_leave", "financial_reports"]')
    `)

    // Seed Leave Types
    await database.query(`
      INSERT INTO LeaveTypes (name, description, maxDaysPerYear, carryForward, requiresApproval) VALUES
      ('Annual Leave', 'Yearly vacation days', 25, 1, 1),
      ('Sick Leave', 'Medical leave for illness', 10, 0, 0),
      ('Personal Leave', 'Personal time off', 5, 0, 1),
      ('Maternity Leave', 'Maternity leave for new mothers', 90, 0, 1),
      ('Paternity Leave', 'Paternity leave for new fathers', 14, 0, 1),
      ('Emergency Leave', 'Emergency situations', 3, 0, 1),
      ('Bereavement Leave', 'Leave for family bereavement', 5, 0, 1)
    `)

    // Seed Sample Employees (with hashed passwords)
    const bcrypt = require("bcryptjs")
    const defaultPassword = await bcrypt.hash("password123", 10)

    await database.query(
      `
      INSERT INTO Employees (employeeId, firstName, lastName, email, phone, hireDate, departmentId, roleId, status, passwordHash) VALUES
      ('EMP001', 'John', 'Doe', 'john.doe@company.com', '+1-555-0101', '2022-01-15', 1, 2, 'Active', @password),
      ('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', '+1-555-0102', '2021-03-20', 2, 3, 'Active', @password),
      ('EMP003', 'Alice', 'Johnson', 'alice.johnson@company.com', '+1-555-0103', '2022-06-10', 1, 5, 'Active', @password),
      ('EMP004', 'Bob', 'Wilson', 'bob.wilson@company.com', '+1-555-0104', '2023-02-01', 3, 4, 'Active', @password),
      ('EMP005', 'Carol', 'Davis', 'carol.davis@company.com', '+1-555-0105', '2021-11-15', 2, 4, 'Active', @password),
      ('EMP006', 'David', 'Brown', 'david.brown@company.com', '+1-555-0106', '2022-09-05', 4, 6, 'Active', @password),
      ('EMP007', 'Emma', 'Taylor', 'emma.taylor@company.com', '+1-555-0107', '2023-04-12', 5, 4, 'Active', @password),
      ('EMP008', 'Frank', 'Miller', 'frank.miller@company.com', '+1-555-0108', '2021-07-30', 6, 4, 'Active', @password)
    `,
      { password: defaultPassword },
    )

    // Seed Projects
    await database.query(`
      INSERT INTO Projects (name, description, startDate, endDate, status, managerId, departmentId) VALUES
      ('React Migration', 'Migrate legacy application to React', '2024-01-01', '2024-06-30', 'Active', 1, 1),
      ('HR System Upgrade', 'Upgrade human resources management system', '2024-02-01', '2024-08-31', 'Active', 2, 2),
      ('Marketing Campaign Q1', 'First quarter marketing initiatives', '2024-01-01', '2024-03-31', 'Completed', 4, 3),
      ('Financial Dashboard', 'Executive financial reporting dashboard', '2024-03-01', '2024-09-30', 'Active', 6, 4),
      ('Mobile App Development', 'Company mobile application', '2024-04-01', '2024-12-31', 'Active', 1, 1)
    `)

    // Seed Leave Balances for current year
    const currentYear = new Date().getFullYear()
    await database.query(
      `
      INSERT INTO LeaveBalances (employeeId, leaveTypeId, year, totalDays, usedDays) VALUES
      (1, 1, @year, 25, 5), (1, 2, @year, 10, 2),
      (2, 1, @year, 25, 8), (2, 2, @year, 10, 1),
      (3, 1, @year, 25, 12), (3, 2, @year, 10, 0),
      (4, 1, @year, 25, 6), (4, 2, @year, 10, 3),
      (5, 1, @year, 25, 15), (5, 2, @year, 10, 1),
      (6, 1, @year, 25, 9), (6, 2, @year, 10, 2),
      (7, 1, @year, 25, 4), (7, 2, @year, 10, 0),
      (8, 1, @year, 25, 11), (8, 2, @year, 10, 1)
    `,
      { year: currentYear },
    )

    // Seed Sample Leave Applications
    await database.query(`
      INSERT INTO LeaveApplications (employeeId, leaveTypeId, startDate, endDate, totalDays, reason, status, appliedDate, approvedBy, approvedDate) VALUES
      (3, 1, '2024-12-20', '2024-12-24', 5, 'Holiday vacation with family', 'Pending', '2024-12-10', NULL, NULL),
      (4, 2, '2024-12-18', '2024-12-18', 1, 'Medical appointment', 'Approved', '2024-12-15', 1, '2024-12-16'),
      (5, 1, '2025-01-02', '2025-01-03', 2, 'Personal matters', 'Pending', '2024-12-12', NULL, NULL),
      (7, 1, '2024-12-23', '2024-12-27', 5, 'Christmas holiday', 'Approved', '2024-12-01', 2, '2024-12-02')
    `)

    // Seed Sample Work Logs
    await database.query(`
      INSERT INTO WorkLogs (employeeId, projectId, logDate, hoursWorked, taskDescription, status) VALUES
      (1, 1, '2024-12-16', 8.0, 'Code review and architecture planning', 'Completed'),
      (1, 1, '2024-12-15', 7.5, 'Implemented new component structure', 'Completed'),
      (3, 1, '2024-12-16', 8.0, 'Frontend component development', 'Completed'),
      (3, 1, '2024-12-15', 8.0, 'API integration and testing', 'Completed'),
      (4, 3, '2024-12-16', 8.0, 'Campaign performance analysis', 'In Progress'),
      (6, 4, '2024-12-16', 7.0, 'Financial report generation', 'Completed')
    `)

    // Seed Sample Performance Reviews
    await database.query(`
      INSERT INTO PerformanceReviews (employeeId, reviewerId, reviewPeriod, overallRating, goals, achievements, feedback, status, reviewDate) VALUES
      (3, 1, 'Q4 2024', 4.5, 'Complete React migration project', 'Successfully led team migration, improved performance by 30%', 'Excellent technical leadership and communication skills', 'Published', '2024-12-15'),
      (4, 2, 'Q4 2024', 4.0, 'Increase marketing campaign ROI', 'Achieved 25% increase in campaign performance', 'Strong analytical skills, good team collaboration', 'Published', '2024-12-10'),
      (5, 2, 'Q4 2024', 4.2, 'Improve employee satisfaction metrics', 'Implemented new onboarding process, 95% satisfaction rate', 'Great initiative in process improvement', 'Published', '2024-12-08')
    `)

    // Seed Sample Notifications
    await database.query(`
      INSERT INTO Notifications (recipientId, senderId, type, title, message, isRead, priority) VALUES
      (1, 3, 'leave_request', 'New Leave Request', 'Alice Johnson has submitted a leave request for Dec 20-24, 2024', 0, 'high'),
      (3, 1, 'leave_approved', 'Leave Request Approved', 'Your leave request for Dec 18, 2024 has been approved', 0, 'medium'),
      (1, NULL, 'performance_review', 'Performance Review Due', 'Performance review for Bob Wilson is due in 3 days', 1, 'medium'),
      (4, 1, 'upcoming_leave', 'Upcoming Leave Reminder', 'David Brown will be on leave starting tomorrow', 0, 'low'),
      (1, NULL, 'system', 'System Maintenance', 'Scheduled maintenance on Dec 25, 2024 from 2:00 AM - 4:00 AM', 1, 'low')
    `)

    console.log("✅ Database seeding completed successfully!")
    console.log("📊 Sample data created:")
    console.log("   - 6 Departments")
    console.log("   - 6 Roles")
    console.log("   - 7 Leave Types")
    console.log("   - 8 Employees")
    console.log("   - 5 Projects")
    console.log("   - Leave balances for all employees")
    console.log("   - Sample leave applications, work logs, and performance reviews")
    console.log("   - Sample notifications")
    console.log("")
    console.log("🔐 Default login credentials:")
    console.log("   Email: john.doe@company.com (Manager)")
    console.log("   Email: jane.smith@company.com (HR Manager)")
    console.log("   Password: password123")
  } catch (error) {
    console.error("❌ Error seeding database:", error)
    throw error
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = seedDatabase
