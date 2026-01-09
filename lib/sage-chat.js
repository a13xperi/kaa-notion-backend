/**
 * Sage Chat Utilities
 *
 * This module provides hardened utilities for the /api/sage/chat endpoint:
 * - Input validation with length caps
 * - Rate limiting (in-memory for dev, Upstash for production)
 * - Tier-aware system prompts
 * - Message persistence helpers
 * - Structured logging
 */

// ============================================
// CONFIGURATION
// ============================================

const CHAT_CONFIG = {
  // Input validation limits
  MAX_MESSAGE_LENGTH: 4000,           // Max characters per message
  MAX_HISTORY_LENGTH: 20,             // Max messages in conversation history
  MAX_HISTORY_CONTENT_LENGTH: 2000,   // Max chars per history message
  MIN_MESSAGE_LENGTH: 1,              // Min characters (after trim)

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60000,        // 1 minute window
  RATE_LIMIT_MAX_REQUESTS: {
    anonymous: 10,                     // Anonymous users: 10 req/min
    1: 30,                             // Tier 1: 30 req/min
    2: 50,                             // Tier 2: 50 req/min
    3: 100,                            // Tier 3: 100 req/min
    4: 200                             // Tier 4: 200 req/min
  },

  // OpenAI model config per tier
  MODEL_CONFIG: {
    1: { model: 'gpt-4o-mini', maxTokens: 400 },
    2: { model: 'gpt-4o-mini', maxTokens: 500 },
    3: { model: 'gpt-4o', maxTokens: 750 },
    4: { model: 'gpt-4o', maxTokens: 1000 }
  }
};

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validates and sanitizes chat input
 * @param {Object} body - Request body
 * @returns {Object} { valid: boolean, errors: string[], sanitized: Object }
 */
function validateChatInput(body) {
  const errors = [];
  const sanitized = {};

  // Validate message (required)
  if (!body.message || typeof body.message !== 'string') {
    errors.push('Message is required and must be a string');
  } else {
    const trimmedMessage = body.message.trim();
    if (trimmedMessage.length < CHAT_CONFIG.MIN_MESSAGE_LENGTH) {
      errors.push('Message cannot be empty');
    } else if (trimmedMessage.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
      errors.push(`Message exceeds maximum length of ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} characters`);
    } else {
      sanitized.message = trimmedMessage;
    }
  }

  // Validate conversationHistory (optional, array)
  if (body.conversationHistory !== undefined) {
    if (!Array.isArray(body.conversationHistory)) {
      errors.push('conversationHistory must be an array');
    } else {
      // Truncate to max length and validate each message
      const history = body.conversationHistory.slice(-CHAT_CONFIG.MAX_HISTORY_LENGTH);
      const validatedHistory = [];

      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') {
          continue; // Skip invalid entries
        }
        if (!msg.type || !['user', 'sage', 'assistant'].includes(msg.type)) {
          continue; // Skip invalid type
        }
        if (!msg.content || typeof msg.content !== 'string') {
          continue; // Skip missing content
        }

        // Truncate long messages in history
        const truncatedContent = msg.content.slice(0, CHAT_CONFIG.MAX_HISTORY_CONTENT_LENGTH);
        validatedHistory.push({
          type: msg.type === 'sage' ? 'sage' : msg.type, // Normalize
          content: truncatedContent
        });
      }

      sanitized.conversationHistory = validatedHistory;
    }
  } else {
    sanitized.conversationHistory = [];
  }

  // Validate clientAddress (optional, string)
  if (body.clientAddress !== undefined) {
    if (typeof body.clientAddress !== 'string') {
      sanitized.clientAddress = '';
    } else {
      sanitized.clientAddress = body.clientAddress.slice(0, 200); // Max address length
    }
  } else {
    sanitized.clientAddress = '';
  }

  // Validate mode (optional, enum)
  sanitized.mode = ['client', 'team'].includes(body.mode) ? body.mode : 'client';

  // Validate currentView (optional, string)
  sanitized.currentView = typeof body.currentView === 'string'
    ? body.currentView.slice(0, 50)
    : 'hub';

  // Validate onboardingActive (optional, boolean)
  sanitized.onboardingActive = body.onboardingActive === true;

  // Validate onboardingStep (optional, number 0-8)
  if (typeof body.onboardingStep === 'number' && body.onboardingStep >= 0 && body.onboardingStep <= 8) {
    sanitized.onboardingStep = Math.floor(body.onboardingStep);
  } else {
    sanitized.onboardingStep = 0;
  }

  // Validate isAskingAboutSupport (optional, boolean)
  sanitized.isAskingAboutSupport = body.isAskingAboutSupport === true;

  // Validate sessionId (optional, for persistence)
  if (body.sessionId && typeof body.sessionId === 'string') {
    sanitized.sessionId = body.sessionId.slice(0, 100);
  } else {
    sanitized.sessionId = null;
  }

  // Validate tier (optional, number 1-4)
  if (typeof body.tier === 'number' && body.tier >= 1 && body.tier <= 4) {
    sanitized.tier = Math.floor(body.tier);
  } else {
    sanitized.tier = null;
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

// ============================================
// RATE LIMITING
// ============================================

// In-memory rate limit store (for development)
const rateLimitStore = new Map();

/**
 * Cleans up expired rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > CHAT_CONFIG.RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * In-memory rate limiter for development
 * @param {string} identifier - IP or user identifier
 * @param {number|null} tier - User tier (1-4) or null for anonymous
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: Date }
 */
function checkRateLimitInMemory(identifier, tier = null) {
  const now = Date.now();
  const maxRequests = CHAT_CONFIG.RATE_LIMIT_MAX_REQUESTS[tier] || CHAT_CONFIG.RATE_LIMIT_MAX_REQUESTS.anonymous;
  const key = `rate:${identifier}`;

  let data = rateLimitStore.get(key);

  if (!data || now - data.windowStart > CHAT_CONFIG.RATE_LIMIT_WINDOW_MS) {
    // Start new window
    data = { count: 0, windowStart: now };
  }

  data.count++;
  rateLimitStore.set(key, data);

  const remaining = Math.max(0, maxRequests - data.count);
  const resetAt = new Date(data.windowStart + CHAT_CONFIG.RATE_LIMIT_WINDOW_MS);

  return {
    allowed: data.count <= maxRequests,
    remaining,
    resetAt,
    limit: maxRequests
  };
}

/**
 * Upstash Redis rate limiter for production
 * Requires UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN env vars
 * @param {string} identifier - IP or user identifier
 * @param {number|null} tier - User tier (1-4) or null for anonymous
 * @returns {Promise<Object>} { allowed: boolean, remaining: number, resetAt: Date }
 */
async function checkRateLimitUpstash(identifier, tier = null) {
  const upstashUrl = process.env.UPSTASH_REDIS_URL;
  const upstashToken = process.env.UPSTASH_REDIS_TOKEN;

  if (!upstashUrl || !upstashToken) {
    // Fall back to in-memory if Upstash not configured
    console.warn('[sage-chat] Upstash not configured, using in-memory rate limiting');
    return checkRateLimitInMemory(identifier, tier);
  }

  const maxRequests = CHAT_CONFIG.RATE_LIMIT_MAX_REQUESTS[tier] || CHAT_CONFIG.RATE_LIMIT_MAX_REQUESTS.anonymous;
  const key = `sage-chat:rate:${identifier}`;
  const windowSeconds = Math.ceil(CHAT_CONFIG.RATE_LIMIT_WINDOW_MS / 1000);

  try {
    // Use Upstash REST API for sliding window rate limiting
    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSeconds]
      ])
    });

    if (!response.ok) {
      throw new Error(`Upstash API error: ${response.status}`);
    }

    const results = await response.json();
    const count = results[0]?.result || 1;

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: new Date(Date.now() + CHAT_CONFIG.RATE_LIMIT_WINDOW_MS),
      limit: maxRequests
    };
  } catch (error) {
    console.error('[sage-chat] Upstash rate limit error:', error);
    // Fall back to in-memory on error
    return checkRateLimitInMemory(identifier, tier);
  }
}

/**
 * Check rate limit using appropriate backend
 * @param {string} identifier - IP or user identifier
 * @param {number|null} tier - User tier (1-4) or null for anonymous
 * @returns {Promise<Object>} { allowed: boolean, remaining: number, resetAt: Date }
 */
async function checkRateLimit(identifier, tier = null) {
  if (process.env.NODE_ENV === 'production' && process.env.UPSTASH_REDIS_URL) {
    return checkRateLimitUpstash(identifier, tier);
  }
  return checkRateLimitInMemory(identifier, tier);
}

// ============================================
// TIER-AWARE SYSTEM PROMPTS
// ============================================

/**
 * Tier descriptions for context
 */
const TIER_DESCRIPTIONS = {
  1: {
    name: 'The Concept',
    features: [
      'Fully automated design process',
      'Fixed pricing packages',
      'Standard plant palettes',
      'Digital deliverables only',
      'Self-service portal access'
    ],
    style: 'efficient and straightforward'
  },
  2: {
    name: 'The Builder',
    features: [
      'Designer checkpoint reviews',
      'Fixed pricing with customization options',
      'Expanded plant palette access',
      'Priority support queue',
      'Design revision rounds included'
    ],
    style: 'helpful and detail-oriented'
  },
  3: {
    name: 'The Concierge',
    features: [
      'Dedicated designer assignment',
      'Site visit included',
      'Hybrid tech + personal approach',
      'Extended revision policy',
      'Phone/video consultation access',
      'Custom plant sourcing'
    ],
    style: 'personalized and attentive'
  },
  4: {
    name: 'KAA White Glove',
    features: [
      'Premium boutique experience',
      'Multiple site visits',
      'Direct architect access',
      'Percentage-based pricing',
      'Full installation oversight',
      'VIP priority on all services',
      'Exclusive design elements'
    ],
    style: 'refined, exclusive, and premium'
  }
};

/**
 * Generates tier-aware system prompt
 * @param {Object} params - Context parameters
 * @returns {string} System prompt
 */
function generateSystemPrompt(params) {
  const {
    clientAddress = '',
    mode = 'client',
    currentView = 'hub',
    onboardingActive = false,
    onboardingStep = 0,
    isAskingAboutSupport = false,
    tier = null
  } = params;

  const tierInfo = tier ? TIER_DESCRIPTIONS[tier] : null;
  const tierContext = tierInfo ? `
Current Service Tier: ${tier} - ${tierInfo.name}
Tier Features:
${tierInfo.features.map(f => `  - ${f}`).join('\n')}

Communication Style: Be ${tierInfo.style} in your responses.
` : '';

  let systemPrompt = `You are Sage, a friendly and helpful AI assistant for the SAGE Garden Wizard platform (a landscape architecture client portal).

Your personality:
- Warm, welcoming, and professional
- Use emojis sparingly but naturally (use the wizard emoji for yourself)
- Be concise but thorough
- Helpful and proactive
- Knowledgeable about landscape architecture projects
${tierInfo ? `- Adopt a ${tierInfo.style} communication approach for this client` : ''}

Context:
- User: ${clientAddress || 'Client'}
- Mode: ${mode === 'client' ? 'Client Portal' : 'Team Dashboard'}
- Current View: ${currentView}
- Onboarding: ${onboardingActive ? `Active (Step ${onboardingStep})` : 'Not active'}
${tierContext}

Available features in the Client Portal:
- Documents: View and manage project documents
- Messages: Contact project manager
- Upload: Share files with team
- Analytics: View project progress and insights
- Notifications: Stay updated on project activity
- Projects: View project plans and deliverables

${mode === 'client' ? `
Client Portal Features:
- Dashboard with project overview
- Document management
- Messaging system
- File uploads
- Project progress tracking
- Analytics dashboard
` : `
Team Dashboard Features:
- Project management
- Deliverable tracking
- Client communications
- Task prioritization
`}

Guidelines:
- If user asks about onboarding, guide them through it naturally
- If user asks about features, explain clearly how to access them
- If user asks about their project, provide helpful context
- If user asks about support agents, pricing tiers, or service levels, explain the SAGE tier system
- Keep responses conversational and helpful
- If you don't know something specific, suggest they contact their project manager
- Always be encouraging and supportive
${tierInfo ? `- Remember this client is on the ${tierInfo.name} tier and tailor your service level accordingly` : ''}

${isAskingAboutSupport ? `
IMPORTANT: The user is asking about support agents or pricing. Include detailed information about:
- Tier 1 (The Concept): Fully automated, no-touch, fixed pricing - Best for straightforward projects
- Tier 2 (The Builder): Low-touch with designer checkpoints, fixed pricing - Great for some customization
- Tier 3 (The Concierge): Includes site visits, hybrid approach, fixed + site visit fee - For complex projects
- Tier 4 (KAA White Glove): Premium service, curated client selection, percentage of install pricing - Luxury experience
` : ''}`;

  return systemPrompt;
}

/**
 * Get OpenAI model config based on tier
 * @param {number|null} tier - User tier
 * @returns {Object} { model: string, maxTokens: number }
 */
function getModelConfig(tier) {
  return CHAT_CONFIG.MODEL_CONFIG[tier] || CHAT_CONFIG.MODEL_CONFIG[1];
}

// ============================================
// LOGGING UTILITIES
// ============================================

/**
 * Structured logger for Sage Chat
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'sage-chat',
    message,
    ...data
  };

  // Format for console
  const prefix = {
    info: 'INFO ',
    warn: 'WARN ',
    error: 'ERROR',
    debug: 'DEBUG'
  }[level] || 'LOG  ';

  const emoji = {
    info: 'i',
    warn: '!',
    error: 'x',
    debug: '?'
  }[level] || '-';

  const formatted = `[${timestamp}] [${prefix}] [sage-chat] ${message}`;

  if (level === 'error') {
    console.error(formatted, data);
  } else if (level === 'warn') {
    console.warn(formatted, data);
  } else if (level === 'debug' && process.env.DEBUG) {
    console.log(formatted, data);
  } else if (level === 'info') {
    console.log(formatted, data);
  }

  return logEntry;
}

const logger = {
  info: (msg, data) => log('info', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
  debug: (msg, data) => log('debug', msg, data)
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  CHAT_CONFIG,
  validateChatInput,
  checkRateLimit,
  checkRateLimitInMemory,
  generateSystemPrompt,
  getModelConfig,
  TIER_DESCRIPTIONS,
  logger
};
