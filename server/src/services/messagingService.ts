/**
 * Messaging Service
 * Handles message threads between clients and team members.
 */

import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ThreadStatus = 'active' | 'archived' | 'resolved';
export type ParticipantRole = 'client' | 'team' | 'admin';

export interface MessageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: ParticipantRole;
  content: string;
  attachments: MessageAttachment[];
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  readBy: string[];
}

export interface ThreadParticipant {
  userId: string;
  name: string;
  role: ParticipantRole;
  joinedAt: string;
  lastReadAt?: string;
}

export interface MessageThread {
  id: string;
  projectId?: string;
  subject: string;
  status: ThreadStatus;
  participants: ThreadParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateThreadInput {
  projectId?: string;
  subject: string;
  participants: Array<{ userId: string; name: string; role: ParticipantRole }>;
  initialMessage?: string;
  createdBy: string;
  createdByName: string;
  createdByRole: ParticipantRole;
}

export interface SendMessageInput {
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: ParticipantRole;
  content: string;
  attachments?: Omit<MessageAttachment, 'id'>[];
}

export interface MessagingConfig {
  maxAttachments: number;
  maxAttachmentSize: number; // bytes
  maxMessageLength: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: MessagingConfig = {
  maxAttachments: 5,
  maxAttachmentSize: 10 * 1024 * 1024, // 10MB
  maxMessageLength: 10000,
};

let config: MessagingConfig = { ...DEFAULT_CONFIG };

// ============================================================================
// IN-MEMORY STORE (Replace with database in production)
// ============================================================================

const threads = new Map<string, MessageThread>();
const messages = new Map<string, Message[]>(); // threadId -> messages
let messageIdCounter = 0;
let threadIdCounter = 0;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize messaging service
 */
export function initMessagingService(overrides: Partial<MessagingConfig> = {}): void {
  config = { ...config, ...overrides };
  logger.info('Messaging service initialized', config);
}

// ============================================================================
// THREAD MANAGEMENT
// ============================================================================

/**
 * Create a new message thread
 */
export async function createThread(input: CreateThreadInput): Promise<MessageThread> {
  const threadId = `thread_${++threadIdCounter}_${Date.now()}`;
  const now = new Date().toISOString();

  // Build participants list including creator
  const participants: ThreadParticipant[] = [
    {
      userId: input.createdBy,
      name: input.createdByName,
      role: input.createdByRole,
      joinedAt: now,
    },
    ...input.participants.map((p) => ({
      ...p,
      joinedAt: now,
    })),
  ];

  // Remove duplicates by userId
  const uniqueParticipants = participants.filter(
    (p, index, self) => index === self.findIndex((t) => t.userId === p.userId)
  );

  const thread: MessageThread = {
    id: threadId,
    projectId: input.projectId,
    subject: input.subject,
    status: 'active',
    participants: uniqueParticipants,
    unreadCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  };

  threads.set(threadId, thread);
  messages.set(threadId, []);

  logger.info('Thread created', { threadId, subject: input.subject });

  // Send initial message if provided
  if (input.initialMessage) {
    const message = await sendMessage({
      threadId,
      senderId: input.createdBy,
      senderName: input.createdByName,
      senderRole: input.createdByRole,
      content: input.initialMessage,
    });
    thread.lastMessage = message;
  }

  return thread;
}

/**
 * Get a thread by ID
 */
export async function getThread(threadId: string): Promise<MessageThread | null> {
  return threads.get(threadId) || null;
}

/**
 * Get threads for a user
 */
export async function getThreadsForUser(
  userId: string,
  options: {
    status?: ThreadStatus;
    projectId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ threads: MessageThread[]; total: number }> {
  const { status, projectId, limit = 20, offset = 0 } = options;

  let userThreads = Array.from(threads.values()).filter((thread) =>
    thread.participants.some((p) => p.userId === userId)
  );

  // Filter by status
  if (status) {
    userThreads = userThreads.filter((t) => t.status === status);
  }

  // Filter by project
  if (projectId) {
    userThreads = userThreads.filter((t) => t.projectId === projectId);
  }

  // Sort by updatedAt (newest first)
  userThreads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const total = userThreads.length;
  const paginatedThreads = userThreads.slice(offset, offset + limit);

  // Calculate unread count for each thread
  const threadsWithUnread = paginatedThreads.map((thread) => {
    const participant = thread.participants.find((p) => p.userId === userId);
    const threadMessages = messages.get(thread.id) || [];
    const unreadCount = participant?.lastReadAt
      ? threadMessages.filter(
          (m) =>
            m.senderId !== userId && new Date(m.createdAt) > new Date(participant.lastReadAt!)
        ).length
      : threadMessages.filter((m) => m.senderId !== userId).length;

    return { ...thread, unreadCount };
  });

  return { threads: threadsWithUnread, total };
}

/**
 * Update thread status
 */
export async function updateThreadStatus(
  threadId: string,
  status: ThreadStatus
): Promise<MessageThread | null> {
  const thread = threads.get(threadId);
  if (!thread) return null;

  thread.status = status;
  thread.updatedAt = new Date().toISOString();

  logger.info('Thread status updated', { threadId, status });

  return thread;
}

/**
 * Archive a thread
 */
export async function archiveThread(threadId: string): Promise<MessageThread | null> {
  return updateThreadStatus(threadId, 'archived');
}

/**
 * Add participant to thread
 */
export async function addParticipant(
  threadId: string,
  participant: { userId: string; name: string; role: ParticipantRole }
): Promise<MessageThread | null> {
  const thread = threads.get(threadId);
  if (!thread) return null;

  // Check if already a participant
  if (thread.participants.some((p) => p.userId === participant.userId)) {
    return thread;
  }

  thread.participants.push({
    ...participant,
    joinedAt: new Date().toISOString(),
  });
  thread.updatedAt = new Date().toISOString();

  logger.info('Participant added to thread', { threadId, userId: participant.userId });

  return thread;
}

/**
 * Remove participant from thread
 */
export async function removeParticipant(
  threadId: string,
  userId: string
): Promise<MessageThread | null> {
  const thread = threads.get(threadId);
  if (!thread) return null;

  thread.participants = thread.participants.filter((p) => p.userId !== userId);
  thread.updatedAt = new Date().toISOString();

  logger.info('Participant removed from thread', { threadId, userId });

  return thread;
}

// ============================================================================
// MESSAGE MANAGEMENT
// ============================================================================

/**
 * Send a message in a thread
 */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const thread = threads.get(input.threadId);
  if (!thread) {
    throw new Error('Thread not found');
  }

  // Validate message length
  if (input.content.length > config.maxMessageLength) {
    throw new Error(`Message exceeds maximum length of ${config.maxMessageLength} characters`);
  }

  // Validate attachments
  const attachments = input.attachments || [];
  if (attachments.length > config.maxAttachments) {
    throw new Error(`Maximum ${config.maxAttachments} attachments allowed`);
  }

  const now = new Date().toISOString();
  const messageId = `msg_${++messageIdCounter}_${Date.now()}`;

  const message: Message = {
    id: messageId,
    threadId: input.threadId,
    senderId: input.senderId,
    senderName: input.senderName,
    senderRole: input.senderRole,
    content: input.content,
    attachments: attachments.map((a, i) => ({
      ...a,
      id: `attach_${messageId}_${i}`,
    })),
    status: 'sent',
    createdAt: now,
    updatedAt: now,
    readBy: [input.senderId],
  };

  // Store message
  const threadMessages = messages.get(input.threadId) || [];
  threadMessages.push(message);
  messages.set(input.threadId, threadMessages);

  // Update thread
  thread.lastMessage = message;
  thread.updatedAt = now;

  logger.info('Message sent', { threadId: input.threadId, messageId });

  return message;
}

/**
 * Get messages for a thread
 */
export async function getMessages(
  threadId: string,
  options: {
    limit?: number;
    before?: string;
    after?: string;
  } = {}
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const { limit = 50, before, after } = options;

  let threadMessages = messages.get(threadId) || [];

  // Filter by time range
  if (before) {
    threadMessages = threadMessages.filter(
      (m) => new Date(m.createdAt) < new Date(before)
    );
  }
  if (after) {
    threadMessages = threadMessages.filter(
      (m) => new Date(m.createdAt) > new Date(after)
    );
  }

  // Sort by createdAt (oldest first for display)
  threadMessages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const hasMore = threadMessages.length > limit;
  const paginatedMessages = threadMessages.slice(-limit);

  return { messages: paginatedMessages, hasMore };
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  threadId: string,
  userId: string,
  messageIds?: string[]
): Promise<number> {
  const threadMessages = messages.get(threadId);
  if (!threadMessages) return 0;

  let count = 0;
  const now = new Date().toISOString();

  threadMessages.forEach((message) => {
    if (messageIds && !messageIds.includes(message.id)) return;
    if (message.senderId === userId) return;
    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      message.status = 'read';
      message.updatedAt = now;
      count++;
    }
  });

  // Update participant's lastReadAt
  const thread = threads.get(threadId);
  if (thread) {
    const participant = thread.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.lastReadAt = now;
    }
  }

  logger.debug('Messages marked as read', { threadId, userId, count });

  return count;
}

/**
 * Delete a message
 */
export async function deleteMessage(
  threadId: string,
  messageId: string,
  userId: string
): Promise<boolean> {
  const threadMessages = messages.get(threadId);
  if (!threadMessages) return false;

  const messageIndex = threadMessages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return false;

  const message = threadMessages[messageIndex];
  
  // Only allow sender to delete their own messages
  if (message.senderId !== userId) {
    throw new Error('Not authorized to delete this message');
  }

  threadMessages.splice(messageIndex, 1);

  // Update thread's last message if needed
  const thread = threads.get(threadId);
  if (thread && thread.lastMessage?.id === messageId) {
    thread.lastMessage = threadMessages[threadMessages.length - 1];
    thread.updatedAt = new Date().toISOString();
  }

  logger.info('Message deleted', { threadId, messageId });

  return true;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface MessagingStats {
  totalThreads: number;
  activeThreads: number;
  totalMessages: number;
  averageMessagesPerThread: number;
}

/**
 * Get messaging statistics
 */
export function getMessagingStats(): MessagingStats {
  const allThreads = Array.from(threads.values());
  const totalMessages = Array.from(messages.values()).reduce(
    (sum, msgs) => sum + msgs.length,
    0
  );

  return {
    totalThreads: allThreads.length,
    activeThreads: allThreads.filter((t) => t.status === 'active').length,
    totalMessages,
    averageMessagesPerThread: allThreads.length > 0 ? totalMessages / allThreads.length : 0,
  };
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  let unreadCount = 0;

  threads.forEach((thread, threadId) => {
    const isParticipant = thread.participants.some((p) => p.userId === userId);
    if (!isParticipant) return;

    const participant = thread.participants.find((p) => p.userId === userId);
    const threadMessages = messages.get(threadId) || [];

    threadMessages.forEach((message) => {
      if (message.senderId === userId) return;
      if (participant?.lastReadAt) {
        if (new Date(message.createdAt) > new Date(participant.lastReadAt)) {
          unreadCount++;
        }
      } else if (!message.readBy.includes(userId)) {
        unreadCount++;
      }
    });
  });

  return unreadCount;
}

// ============================================================================
// CLEANUP (for testing)
// ============================================================================

/**
 * Clear all messages and threads (for testing)
 */
export function clearAllMessages(): void {
  threads.clear();
  messages.clear();
  messageIdCounter = 0;
  threadIdCounter = 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initMessagingService,
  createThread,
  getThread,
  getThreadsForUser,
  updateThreadStatus,
  archiveThread,
  addParticipant,
  removeParticipant,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
  getMessagingStats,
  getUnreadCount,
  clearAllMessages,
};
