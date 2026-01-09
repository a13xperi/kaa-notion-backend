/**
 * CRUD Helpers for SAGE/KAA Backend
 *
 * Minimal helpers for Lead/User/Client/Project/Payment/Deliverable operations.
 * All functions use the singleton Prisma client from ./prisma.js
 */

const { prisma } = require('./prisma');

// ============================================
// USER HELPERS
// ============================================

const UserHelpers = {
  /**
   * Create a new user
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user
   */
  async create(data) {
    return prisma.user.create({ data });
  },

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @param {Object} [include] - Relations to include
   * @returns {Promise<Object|null>}
   */
  async findById(id, include = {}) {
    return prisma.user.findUnique({
      where: { id },
      include
    });
  },

  /**
   * Find user by email
   * @param {string} email
   * @param {Object} [include] - Relations to include
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email, include = {}) {
    return prisma.user.findUnique({
      where: { email },
      include
    });
  },

  /**
   * Find user by address (for KAA clients)
   * @param {string} address
   * @param {Object} [include] - Relations to include
   * @returns {Promise<Object|null>}
   */
  async findByAddress(address, include = {}) {
    return prisma.user.findFirst({
      where: { address },
      include
    });
  },

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data
    });
  },

  /**
   * Update last login timestamp
   * @param {string} id - User ID
   * @returns {Promise<Object>}
   */
  async updateLastLogin(id) {
    return prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() }
    });
  },

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return prisma.user.delete({ where: { id } });
  },

  /**
   * List users with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async list({ skip = 0, take = 50, where = {}, orderBy = { createdAt: 'desc' } } = {}) {
    return prisma.user.findMany({ skip, take, where, orderBy });
  }
};

// ============================================
// CLIENT HELPERS
// ============================================

const ClientHelpers = {
  /**
   * Create a new client
   * @param {Object} data - Client data
   * @returns {Promise<Object>} Created client
   */
  async create(data) {
    return prisma.client.create({
      data,
      include: { user: true }
    });
  },

  /**
   * Find client by ID
   * @param {string} id - Client ID
   * @param {Object} [include] - Relations to include
   * @returns {Promise<Object|null>}
   */
  async findById(id, include = { user: true, projects: true }) {
    return prisma.client.findUnique({
      where: { id },
      include
    });
  },

  /**
   * Find client by user ID
   * @param {string} userId - User ID
   * @param {Object} [include] - Relations to include
   * @returns {Promise<Object|null>}
   */
  async findByUserId(userId, include = { user: true, projects: true }) {
    return prisma.client.findUnique({
      where: { userId },
      include
    });
  },

  /**
   * Find client by project address
   * @param {string} projectAddress
   * @returns {Promise<Object|null>}
   */
  async findByProjectAddress(projectAddress) {
    return prisma.client.findFirst({
      where: { projectAddress },
      include: { user: true, projects: true }
    });
  },

  /**
   * Update client
   * @param {string} id - Client ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return prisma.client.update({
      where: { id },
      data,
      include: { user: true }
    });
  },

  /**
   * Delete client
   * @param {string} id - Client ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return prisma.client.delete({ where: { id } });
  },

  /**
   * List clients with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async list({ skip = 0, take = 50, where = {}, orderBy = { createdAt: 'desc' }, include = { user: true } } = {}) {
    return prisma.client.findMany({ skip, take, where, orderBy, include });
  },

  /**
   * List clients by tier
   * @param {number} tier - Tier number (1-4)
   * @returns {Promise<Object[]>}
   */
  async findByTier(tier) {
    return prisma.client.findMany({
      where: { tier },
      include: { user: true, projects: true }
    });
  }
};

// ============================================
// LEAD HELPERS
// ============================================

const LeadHelpers = {
  /**
   * Create a new lead
   * @param {Object} data - Lead data
   * @returns {Promise<Object>} Created lead
   */
  async create(data) {
    return prisma.lead.create({ data });
  },

  /**
   * Find lead by ID
   * @param {string} id - Lead ID
   * @param {Object} [include] - Relations to include
   * @returns {Promise<Object|null>}
   */
  async findById(id, include = {}) {
    return prisma.lead.findUnique({
      where: { id },
      include
    });
  },

  /**
   * Find lead by email
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return prisma.lead.findFirst({
      where: { email }
    });
  },

  /**
   * Update lead
   * @param {string} id - Lead ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return prisma.lead.update({
      where: { id },
      data
    });
  },

  /**
   * Update lead status
   * @param {string} id - Lead ID
   * @param {string} status - New status (NEW, QUALIFIED, NEEDS_REVIEW, CLOSED)
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status) {
    return prisma.lead.update({
      where: { id },
      data: { status }
    });
  },

  /**
   * Convert lead to client
   * @param {string} leadId - Lead ID
   * @param {string} clientId - Client ID to link
   * @returns {Promise<Object>}
   */
  async convertToClient(leadId, clientId) {
    return prisma.lead.update({
      where: { id: leadId },
      data: {
        clientId,
        status: 'CLOSED'
      }
    });
  },

  /**
   * Delete lead
   * @param {string} id - Lead ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return prisma.lead.delete({ where: { id } });
  },

  /**
   * List leads with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async list({ skip = 0, take = 50, where = {}, orderBy = { createdAt: 'desc' } } = {}) {
    return prisma.lead.findMany({ skip, take, where, orderBy });
  },

  /**
   * List leads by status
   * @param {string} status - Lead status
   * @returns {Promise<Object[]>}
   */
  async findByStatus(status) {
    return prisma.lead.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * List leads by recommended tier
   * @param {number} tier - Tier number (1-4)
   * @returns {Promise<Object[]>}
   */
  async findByRecommendedTier(tier) {
    return prisma.lead.findMany({
      where: { recommendedTier: tier },
      orderBy: { createdAt: 'desc' }
    });
  }
};

// ============================================
// PROJECT HELPERS
// ============================================

const ProjectHelpers = {
  /**
   * Create a new project
   * @param {Object} data - Project data
   * @returns {Promise<Object>} Created project
   */
  async create(data) {
    return prisma.project.create({
      data,
      include: { client: true, milestones: true }
    });
  },

  /**
   * Find project by ID
   * @param {string} id - Project ID
   * @param {Object} [include] - Relations to include
   * @returns {Promise<Object|null>}
   */
  async findById(id, include = { client: true, milestones: true, deliverables: true, payments: true }) {
    return prisma.project.findUnique({
      where: { id },
      include
    });
  },

  /**
   * Find projects by client ID
   * @param {string} clientId - Client ID
   * @returns {Promise<Object[]>}
   */
  async findByClientId(clientId) {
    return prisma.project.findMany({
      where: { clientId },
      include: { milestones: true, deliverables: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Find project by Notion page ID
   * @param {string} notionPageId
   * @returns {Promise<Object|null>}
   */
  async findByNotionPageId(notionPageId) {
    return prisma.project.findFirst({
      where: { notionPageId },
      include: { client: true }
    });
  },

  /**
   * Update project
   * @param {string} id - Project ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return prisma.project.update({
      where: { id },
      data,
      include: { client: true, milestones: true }
    });
  },

  /**
   * Update project status
   * @param {string} id - Project ID
   * @param {string} status - New status
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status) {
    return prisma.project.update({
      where: { id },
      data: { status }
    });
  },

  /**
   * Delete project
   * @param {string} id - Project ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return prisma.project.delete({ where: { id } });
  },

  /**
   * List projects with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async list({ skip = 0, take = 50, where = {}, orderBy = { createdAt: 'desc' }, include = { client: true } } = {}) {
    return prisma.project.findMany({ skip, take, where, orderBy, include });
  },

  /**
   * List projects by status
   * @param {string} status - Project status
   * @returns {Promise<Object[]>}
   */
  async findByStatus(status) {
    return prisma.project.findMany({
      where: { status },
      include: { client: true, milestones: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * List projects by tier
   * @param {number} tier - Tier number (1-4)
   * @returns {Promise<Object[]>}
   */
  async findByTier(tier) {
    return prisma.project.findMany({
      where: { tier },
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });
  }
};

// ============================================
// PAYMENT HELPERS
// ============================================

const PaymentHelpers = {
  /**
   * Create a new payment
   * @param {Object} data - Payment data
   * @returns {Promise<Object>} Created payment
   */
  async create(data) {
    return prisma.payment.create({
      data,
      include: { project: true }
    });
  },

  /**
   * Find payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return prisma.payment.findUnique({
      where: { id },
      include: { project: { include: { client: true } } }
    });
  },

  /**
   * Find payment by Stripe Payment Intent ID
   * @param {string} stripePaymentIntentId
   * @returns {Promise<Object|null>}
   */
  async findByStripePaymentIntentId(stripePaymentIntentId) {
    return prisma.payment.findUnique({
      where: { stripePaymentIntentId },
      include: { project: true }
    });
  },

  /**
   * Find payments by project ID
   * @param {string} projectId
   * @returns {Promise<Object[]>}
   */
  async findByProjectId(projectId) {
    return prisma.payment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Find payments by Stripe customer ID
   * @param {string} stripeCustomerId
   * @returns {Promise<Object[]>}
   */
  async findByStripeCustomerId(stripeCustomerId) {
    return prisma.payment.findMany({
      where: { stripeCustomerId },
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Update payment
   * @param {string} id - Payment ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return prisma.payment.update({
      where: { id },
      data
    });
  },

  /**
   * Update payment status
   * @param {string} id - Payment ID
   * @param {string} status - New status (PENDING, SUCCEEDED, FAILED, REFUNDED)
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status) {
    return prisma.payment.update({
      where: { id },
      data: { status }
    });
  },

  /**
   * Delete payment
   * @param {string} id - Payment ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return prisma.payment.delete({ where: { id } });
  },

  /**
   * List payments with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async list({ skip = 0, take = 50, where = {}, orderBy = { createdAt: 'desc' } } = {}) {
    return prisma.payment.findMany({ skip, take, where, orderBy, include: { project: true } });
  },

  /**
   * List payments by status
   * @param {string} status - Payment status
   * @returns {Promise<Object[]>}
   */
  async findByStatus(status) {
    return prisma.payment.findMany({
      where: { status },
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    });
  }
};

// ============================================
// DELIVERABLE HELPERS
// ============================================

const DeliverableHelpers = {
  /**
   * Create a new deliverable
   * @param {Object} data - Deliverable data
   * @returns {Promise<Object>} Created deliverable
   */
  async create(data) {
    return prisma.deliverable.create({
      data,
      include: { project: true, uploadedBy: true }
    });
  },

  /**
   * Find deliverable by ID
   * @param {string} id - Deliverable ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return prisma.deliverable.findUnique({
      where: { id },
      include: { project: true, uploadedBy: true }
    });
  },

  /**
   * Find deliverables by project ID
   * @param {string} projectId
   * @returns {Promise<Object[]>}
   */
  async findByProjectId(projectId) {
    return prisma.deliverable.findMany({
      where: { projectId },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Find deliverables by category
   * @param {string} projectId
   * @param {string} category
   * @returns {Promise<Object[]>}
   */
  async findByCategory(projectId, category) {
    return prisma.deliverable.findMany({
      where: { projectId, category },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Find deliverable by Notion page ID
   * @param {string} notionPageId
   * @returns {Promise<Object|null>}
   */
  async findByNotionPageId(notionPageId) {
    return prisma.deliverable.findFirst({
      where: { notionPageId },
      include: { project: true }
    });
  },

  /**
   * Update deliverable
   * @param {string} id - Deliverable ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    return prisma.deliverable.update({
      where: { id },
      data
    });
  },

  /**
   * Delete deliverable
   * @param {string} id - Deliverable ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    return prisma.deliverable.delete({ where: { id } });
  },

  /**
   * List deliverables with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async list({ skip = 0, take = 50, where = {}, orderBy = { createdAt: 'desc' } } = {}) {
    return prisma.deliverable.findMany({
      skip,
      take,
      where,
      orderBy,
      include: { project: true, uploadedBy: true }
    });
  }
};

// ============================================
// AUDIT LOG HELPERS
// ============================================

const AuditLogHelpers = {
  /**
   * Log an action
   * @param {Object} data - Log data
   * @returns {Promise<Object>}
   */
  async log(data) {
    return prisma.auditLog.create({ data });
  },

  /**
   * Find logs by user ID
   * @param {string} userId
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async findByUserId(userId, { skip = 0, take = 50 } = {}) {
    return prisma.auditLog.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Find logs by action type
   * @param {string} action
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async findByAction(action, { skip = 0, take = 50 } = {}) {
    return prisma.auditLog.findMany({
      where: { action },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Find logs by resource
   * @param {string} resourceType
   * @param {string} resourceId
   * @returns {Promise<Object[]>}
   */
  async findByResource(resourceType, resourceId) {
    return prisma.auditLog.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: 'desc' }
    });
  }
};

module.exports = {
  UserHelpers,
  ClientHelpers,
  LeadHelpers,
  ProjectHelpers,
  PaymentHelpers,
  DeliverableHelpers,
  AuditLogHelpers
};
