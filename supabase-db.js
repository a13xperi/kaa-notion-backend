/**
 * Supabase Database Integration Module
 *
 * This module provides database functions for the SAGE MVP Platform
 * using Supabase Postgres with service role key for admin operations.
 *
 * Table schema matches prisma/schema.prisma definitions.
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// ============================================
// SUPABASE CLIENT INITIALIZATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: Supabase environment variables not configured.');
  console.warn('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for database functionality.');
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// ============================================
// TIER MILESTONE DEFINITIONS
// ============================================

const TIER_MILESTONES = {
  1: [ // The Concept
    { name: 'Intake', order: 1 },
    { name: 'Concept Development', order: 2 },
    { name: 'Final Delivery', order: 3 }
  ],
  2: [ // The Builder
    { name: 'Intake', order: 1 },
    { name: 'Concept Development', order: 2 },
    { name: 'Design Draft', order: 3 },
    { name: 'Client Review', order: 4 },
    { name: 'Final Delivery', order: 5 }
  ],
  3: [ // The Concierge
    { name: 'Intake', order: 1 },
    { name: 'Site Analysis', order: 2 },
    { name: 'Concept Development', order: 3 },
    { name: 'Design Draft', order: 4 },
    { name: 'Client Review', order: 5 },
    { name: 'Revisions', order: 6 },
    { name: 'Final Delivery', order: 7 }
  ],
  4: [ // KAA White Glove
    { name: 'Intake', order: 1 },
    { name: 'Site Visit', order: 2 },
    { name: 'Site Analysis', order: 3 },
    { name: 'Concept Development', order: 4 },
    { name: 'Initial Presentation', order: 5 },
    { name: 'Design Draft', order: 6 },
    { name: 'Client Review', order: 7 },
    { name: 'Revisions Round 1', order: 8 },
    { name: 'Revisions Round 2', order: 9 },
    { name: 'Final Review', order: 10 },
    { name: 'Final Delivery', order: 11 }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if Supabase client is available
 */
function isSupabaseConfigured() {
  return supabase !== null;
}

/**
 * Generate UUID (uses crypto if available, falls back to simple implementation)
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

/**
 * Create a new lead in the database
 *
 * @param {Object} data - Lead data
 * @param {string} data.email - Lead email (required)
 * @param {string} data.projectAddress - Project address (required)
 * @param {number} data.recommendedTier - Recommended tier 1-4 (required)
 * @param {string} [data.name] - Lead name
 * @param {string} [data.budgetRange] - Budget range
 * @param {string} [data.timeline] - Project timeline
 * @param {string} [data.projectType] - Type of project
 * @param {boolean} [data.hasSurvey] - Has survey documents
 * @param {boolean} [data.hasDrawings] - Has drawings
 * @param {string} [data.routingReason] - Why this tier was recommended
 * @returns {Promise<Object>} Created lead object
 */
async function createLead(data) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { email, projectAddress, recommendedTier, name, budgetRange, timeline, projectType, hasSurvey, hasDrawings, routingReason } = data;

  if (!email || !projectAddress || !recommendedTier) {
    throw new Error('Missing required fields: email, projectAddress, recommendedTier');
  }

  if (recommendedTier < 1 || recommendedTier > 4) {
    throw new Error('recommendedTier must be between 1 and 4');
  }

  const leadData = {
    id: generateUUID(),
    email,
    project_address: projectAddress,
    recommended_tier: recommendedTier,
    name: name || null,
    budget_range: budgetRange || null,
    timeline: timeline || null,
    project_type: projectType || null,
    has_survey: hasSurvey || false,
    has_drawings: hasDrawings || false,
    routing_reason: routingReason || null,
    status: 'NEW',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: lead, error } = await supabase
    .from('leads')
    .insert(leadData)
    .select()
    .single();

  if (error) {
    console.error('Error creating lead:', error);
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  return lead;
}

/**
 * Create a new user in the database
 *
 * @param {Object} data - User data
 * @param {string} data.password - Plain text password (will be hashed)
 * @param {string} [data.email] - User email
 * @param {string} [data.address] - Property address (for KAA clients)
 * @param {string} [data.userType] - User type: KAA_CLIENT, SAGE_CLIENT, TEAM, ADMIN
 * @param {number} [data.tier] - Service tier 1-4
 * @returns {Promise<Object>} Created user object (without password hash)
 */
async function createUser(data) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { email, address, password, userType, tier } = data;

  if (!password) {
    throw new Error('Password is required');
  }

  if (!email && !address) {
    throw new Error('Either email or address is required');
  }

  // Hash the password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const userData = {
    id: generateUUID(),
    email: email || null,
    address: address || null,
    password_hash: passwordHash,
    user_type: userType || 'SAGE_CLIENT',
    tier: tier || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: user, error } = await supabase
    .from('users')
    .insert(userData)
    .select('id, email, address, user_type, tier, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return user;
}

/**
 * Create a new client linked to a user
 *
 * @param {Object} data - Client data
 * @param {string} data.userId - User ID (required)
 * @param {number} data.tier - Service tier 1-4 (required)
 * @param {string} data.projectAddress - Project address (required)
 * @param {string} [data.status] - Client status: ONBOARDING, ACTIVE, COMPLETED, CLOSED
 * @returns {Promise<Object>} Created client object
 */
async function createClient(data) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { userId, tier, projectAddress, status } = data;

  if (!userId || !tier || !projectAddress) {
    throw new Error('Missing required fields: userId, tier, projectAddress');
  }

  if (tier < 1 || tier > 4) {
    throw new Error('tier must be between 1 and 4');
  }

  const clientData = {
    id: generateUUID(),
    user_id: userId,
    tier,
    project_address: projectAddress,
    status: status || 'ONBOARDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: client, error } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    throw new Error(`Failed to create client: ${error.message}`);
  }

  return client;
}

/**
 * Create a new project for a client
 *
 * @param {Object} data - Project data
 * @param {string} data.clientId - Client ID (required)
 * @param {number} data.tier - Service tier 1-4 (required)
 * @param {string} data.name - Project name (required)
 * @param {string} [data.leadId] - Lead ID if converted from lead
 * @param {string} [data.status] - Project status
 * @param {string} [data.notionPageId] - Notion page ID
 * @param {string} [data.paymentStatus] - Payment status: pending, paid, refunded
 * @returns {Promise<Object>} Created project object
 */
async function createProject(data) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { clientId, tier, name, leadId, status, notionPageId, paymentStatus } = data;

  if (!clientId || !tier || !name) {
    throw new Error('Missing required fields: clientId, tier, name');
  }

  if (tier < 1 || tier > 4) {
    throw new Error('tier must be between 1 and 4');
  }

  const projectData = {
    id: generateUUID(),
    client_id: clientId,
    tier,
    name,
    lead_id: leadId || null,
    status: status || 'ONBOARDING',
    notion_page_id: notionPageId || null,
    payment_status: paymentStatus || 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: project, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return project;
}

/**
 * Create a payment record for a project
 *
 * @param {Object} data - Payment data
 * @param {string} data.projectId - Project ID (required)
 * @param {string} data.stripePaymentIntentId - Stripe payment intent ID (required)
 * @param {string} data.stripeCustomerId - Stripe customer ID (required)
 * @param {number} data.amount - Amount in cents (required)
 * @param {number} data.tier - Service tier 1-4 (required)
 * @param {string} [data.currency] - Currency code (default: usd)
 * @param {string} [data.status] - Payment status: PENDING, SUCCEEDED, FAILED, REFUNDED
 * @returns {Promise<Object>} Created payment object
 */
async function createPayment(data) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { projectId, stripePaymentIntentId, stripeCustomerId, amount, tier, currency, status } = data;

  if (!projectId || !stripePaymentIntentId || !stripeCustomerId || amount === undefined || !tier) {
    throw new Error('Missing required fields: projectId, stripePaymentIntentId, stripeCustomerId, amount, tier');
  }

  if (tier < 1 || tier > 4) {
    throw new Error('tier must be between 1 and 4');
  }

  const paymentData = {
    id: generateUUID(),
    project_id: projectId,
    stripe_payment_intent_id: stripePaymentIntentId,
    stripe_customer_id: stripeCustomerId,
    amount,
    currency: currency || 'usd',
    status: status || 'PENDING',
    tier,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: payment, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    throw new Error(`Failed to create payment: ${error.message}`);
  }

  return payment;
}

/**
 * Seed milestones for a project based on its tier
 *
 * @param {string} projectId - Project ID (required)
 * @param {number} tier - Service tier 1-4 (required)
 * @returns {Promise<Object[]>} Array of created milestone objects
 */
async function seedMilestones(projectId, tier) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!projectId) {
    throw new Error('projectId is required');
  }

  if (!tier || tier < 1 || tier > 4) {
    throw new Error('tier must be between 1 and 4');
  }

  const milestoneTemplates = TIER_MILESTONES[tier];
  if (!milestoneTemplates) {
    throw new Error(`No milestone templates found for tier ${tier}`);
  }

  const milestones = milestoneTemplates.map((template, index) => ({
    id: generateUUID(),
    project_id: projectId,
    tier,
    name: template.name,
    order: template.order,
    status: index === 0 ? 'IN_PROGRESS' : 'PENDING', // First milestone starts in progress
    due_date: null,
    completed_at: null,
    created_at: new Date().toISOString()
  }));

  const { data: createdMilestones, error } = await supabase
    .from('milestones')
    .insert(milestones)
    .select();

  if (error) {
    console.error('Error seeding milestones:', error);
    throw new Error(`Failed to seed milestones: ${error.message}`);
  }

  return createdMilestones;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Client instance (for advanced queries)
  supabase,

  // Helper functions
  isSupabaseConfigured,
  generateUUID,

  // CRUD functions
  createLead,
  createUser,
  createClient,
  createProject,
  createPayment,
  seedMilestones,

  // Tier milestone definitions
  TIER_MILESTONES
};
