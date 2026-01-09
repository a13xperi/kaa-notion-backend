/**
 * Database Client Module
 *
 * Provides Prisma client access and message persistence utilities
 * for the Sage Chat feature.
 */

const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client
let prisma = null;

/**
 * Get or create Prisma client instance
 * @returns {PrismaClient}
 */
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error']
    });
  }
  return prisma;
}

/**
 * Check if database is available
 * @returns {Promise<boolean>}
 */
async function isDatabaseAvailable() {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.warn('[db] Database not available:', error.message);
    return false;
  }
}

// ============================================
// CONVERSATION PERSISTENCE
// ============================================

/**
 * Create or get existing conversation
 * @param {Object} params
 * @returns {Promise<Object|null>} Conversation object or null if DB unavailable
 */
async function getOrCreateConversation(params) {
  const {
    sessionId,
    userId = null,
    clientAddress = null,
    tier = null,
    mode = 'client'
  } = params;

  if (!sessionId) {
    return null;
  }

  try {
    const client = getPrismaClient();

    // Try to find existing conversation
    let conversation = await client.conversation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    });

    if (!conversation) {
      // Create new conversation
      conversation = await client.conversation.create({
        data: {
          sessionId,
          userId,
          clientAddress,
          tier,
          mode
        }
      });
    }

    return conversation;
  } catch (error) {
    console.error('[db] Error getting/creating conversation:', error.message);
    return null;
  }
}

/**
 * Store a message in the database
 * @param {Object} params
 * @returns {Promise<Object|null>} Message object or null on error
 */
async function storeMessage(params) {
  const {
    conversationId,
    role,
    content,
    tokenCount = null,
    tier = null,
    metadata = null
  } = params;

  if (!conversationId || !role || !content) {
    return null;
  }

  try {
    const client = getPrismaClient();

    const message = await client.message.create({
      data: {
        conversationId,
        role,
        content,
        tokenCount,
        tier,
        metadata
      }
    });

    return message;
  } catch (error) {
    console.error('[db] Error storing message:', error.message);
    return null;
  }
}

/**
 * Store user message and assistant response together
 * @param {Object} params
 * @returns {Promise<Object|null>} Object with userMessage and assistantMessage
 */
async function storeConversationExchange(params) {
  const {
    sessionId,
    userId = null,
    clientAddress = null,
    tier = null,
    mode = 'client',
    userMessage,
    assistantMessage,
    userTokens = null,
    assistantTokens = null,
    metadata = null
  } = params;

  try {
    // Get or create conversation
    const conversation = await getOrCreateConversation({
      sessionId,
      userId,
      clientAddress,
      tier,
      mode
    });

    if (!conversation) {
      return null;
    }

    // Store user message
    const storedUserMessage = await storeMessage({
      conversationId: conversation.id,
      role: 'user',
      content: userMessage,
      tokenCount: userTokens,
      tier,
      metadata
    });

    // Store assistant response
    const storedAssistantMessage = await storeMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: assistantMessage,
      tokenCount: assistantTokens,
      tier,
      metadata
    });

    return {
      conversationId: conversation.id,
      userMessage: storedUserMessage,
      assistantMessage: storedAssistantMessage
    };
  } catch (error) {
    console.error('[db] Error storing conversation exchange:', error.message);
    return null;
  }
}

/**
 * Get conversation history from database
 * @param {string} sessionId
 * @param {number} limit - Max messages to retrieve
 * @returns {Promise<Array>} Array of messages
 */
async function getConversationHistory(sessionId, limit = 20) {
  if (!sessionId) {
    return [];
  }

  try {
    const client = getPrismaClient();

    const conversation = await client.conversation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: limit
        }
      }
    });

    if (!conversation) {
      return [];
    }

    return conversation.messages.map(msg => ({
      type: msg.role === 'user' ? 'user' : 'sage',
      content: msg.content,
      timestamp: msg.createdAt
    }));
  } catch (error) {
    console.error('[db] Error getting conversation history:', error.message);
    return [];
  }
}

/**
 * Get user tier from database
 * @param {string} clientAddress
 * @returns {Promise<number|null>}
 */
async function getUserTier(clientAddress) {
  if (!clientAddress) {
    return null;
  }

  try {
    const client = getPrismaClient();

    // Try to find user by address
    const user = await client.user.findFirst({
      where: { address: clientAddress },
      include: { client: true }
    });

    if (user?.tier) {
      return user.tier;
    }

    if (user?.client?.tier) {
      return user.client.tier;
    }

    return null;
  } catch (error) {
    console.error('[db] Error getting user tier:', error.message);
    return null;
  }
}

/**
 * Cleanup old conversations (for maintenance)
 * @param {number} daysOld - Delete conversations older than this many days
 * @returns {Promise<number>} Number of deleted conversations
 */
async function cleanupOldConversations(daysOld = 90) {
  try {
    const client = getPrismaClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await client.conversation.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    console.log(`[db] Cleaned up ${result.count} old conversations`);
    return result.count;
  } catch (error) {
    console.error('[db] Error cleaning up old conversations:', error.message);
    return 0;
  }
}

/**
 * Disconnect Prisma client (for cleanup)
 */
async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

module.exports = {
  getPrismaClient,
  isDatabaseAvailable,
  getOrCreateConversation,
  storeMessage,
  storeConversationExchange,
  getConversationHistory,
  getUserTier,
  cleanupOldConversations,
  disconnect
};
