const Joi = require("joi")

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details.map((detail) => detail.message),
      })
    }
    next()
  }
}

// Employee validation schemas
const employeeSchemas = {
  create: Joi.object({
    employeeId: Joi.string().required().max(50),
    firstName: Joi.string().required().max(100),
    lastName: Joi.string().required().max(100),
    email: Joi.string().email().required().max(255),
    phone: Joi.string().max(20),
    dateOfBirth: Joi.date(),
    hireDate: Joi.date().required(),
    departmentId: Joi.number().integer().required(),
    roleId: Joi.number().integer().required(),
    managerId: Joi.number().integer().allow(null),
    salary: Joi.number().positive(),
    address: Joi.string().max(500),
    emergencyContact: Joi.object(),
    password: Joi.string().min(8).required(),
  }),

  update: Joi.object({
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    email: Joi.string().email().max(255),
    phone: Joi.string().max(20),
    dateOfBirth: Joi.date(),
    departmentId: Joi.number().integer(),
    roleId: Joi.number().integer(),
    managerId: Joi.number().integer().allow(null),
    salary: Joi.number().positive(),
    status: Joi.string().valid("Active", "Inactive", "On Leave", "Terminated"),
    address: Joi.string().max(500),
    emergencyContact: Joi.object(),
  }),
}

// Leave application validation schemas
const leaveSchemas = {
  create: Joi.object({
    leaveTypeId: Joi.number().integer().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    reason: Joi.string().max(1000),
    attachments: Joi.array().items(Joi.string()),
  }),

  approve: Joi.object({
    status: Joi.string().valid("Approved", "Rejected").required(),
    rejectionReason: Joi.string().max(1000).when("status", {
      is: "Rejected",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
}

// Performance review validation schemas
const performanceSchemas = {
  create: Joi.object({
    employeeId: Joi.number().integer().required(),
    reviewPeriod: Joi.string().required().max(50),
    overallRating: Joi.number().min(1).max(5),
    goals: Joi.string(),
    achievements: Joi.string(),
    areasForImprovement: Joi.string(),
    feedback: Joi.string(),
    metrics: Joi.array().items(
      Joi.object({
        metricName: Joi.string().required().max(100),
        rating: Joi.number().min(1).max(5).required(),
        comments: Joi.string().max(500),
        weight: Joi.number().min(0).max(1).default(1),
      }),
    ),
  }),

  update: Joi.object({
    overallRating: Joi.number().min(1).max(5),
    goals: Joi.string(),
    achievements: Joi.string(),
    areasForImprovement: Joi.string(),
    feedback: Joi.string(),
    employeeComments: Joi.string(),
    status: Joi.string().valid("Draft", "Submitted", "Approved", "Published"),
  }),
}

// Work log validation schemas
const workLogSchemas = {
  create: Joi.object({
    projectId: Joi.number().integer(),
    logDate: Joi.date().required(),
    hoursWorked: Joi.number().min(0).max(24).required(),
    taskDescription: Joi.string().max(1000),
    status: Joi.string().valid("In Progress", "Completed", "Blocked").default("Completed"),
  }),

  update: Joi.object({
    projectId: Joi.number().integer(),
    hoursWorked: Joi.number().min(0).max(24),
    taskDescription: Joi.string().max(1000),
    status: Joi.string().valid("In Progress", "Completed", "Blocked"),
  }),
}

// Auth validation schemas
const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
  }),
}

module.exports = {
  validate,
  employeeSchemas,
  leaveSchemas,
  performanceSchemas,
  workLogSchemas,
  authSchemas,
}
