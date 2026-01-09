/**
 * Database Module for SAGE/KAA Backend
 *
 * Exports Prisma client wrapper and CRUD helpers for all models.
 *
 * Usage:
 *   const db = require('./lib/db');
 *
 *   // Check DB connectivity
 *   const health = await db.checkDbConnection();
 *
 *   // Use helpers
 *   const user = await db.UserHelpers.findByEmail('test@example.com');
 *   const lead = await db.LeadHelpers.create({ ... });
 *
 *   // Direct Prisma access
 *   const result = await db.prisma.user.findMany();
 */

const {
  prisma,
  checkDbConnection,
  disconnect,
  transaction
} = require('./prisma');

const {
  UserHelpers,
  ClientHelpers,
  LeadHelpers,
  ProjectHelpers,
  PaymentHelpers,
  DeliverableHelpers,
  AuditLogHelpers
} = require('./helpers');

module.exports = {
  // Prisma client and utilities
  prisma,
  checkDbConnection,
  disconnect,
  transaction,

  // Model helpers
  UserHelpers,
  ClientHelpers,
  LeadHelpers,
  ProjectHelpers,
  PaymentHelpers,
  DeliverableHelpers,
  AuditLogHelpers
};
