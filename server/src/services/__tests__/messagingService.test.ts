/**
 * Messaging Service Tests
 */

import {
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
  MessageThread,
  Message,
} from '../messagingService';

describe('MessagingService', () => {
  beforeEach(() => {
    clearAllMessages();
    initMessagingService();
  });

  describe('createThread', () => {
    it('should create a new thread', async () => {
      const thread = await createThread({
        subject: 'Project Discussion',
        participants: [{ userId: 'user2', name: 'Jane', role: 'team' }],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      expect(thread.id).toBeTruthy();
      expect(thread.subject).toBe('Project Discussion');
      expect(thread.status).toBe('active');
      expect(thread.participants).toHaveLength(2);
    });

    it('should create thread with project association', async () => {
      const thread = await createThread({
        projectId: 'proj123',
        subject: 'Design Review',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      expect(thread.projectId).toBe('proj123');
    });

    it('should send initial message if provided', async () => {
      const thread = await createThread({
        subject: 'Quick Question',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
        initialMessage: 'Hello, I have a question.',
      });

      expect(thread.lastMessage).toBeTruthy();
      expect(thread.lastMessage?.content).toBe('Hello, I have a question.');
    });

    it('should deduplicate participants', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [
          { userId: 'user1', name: 'John', role: 'client' },
          { userId: 'user2', name: 'Jane', role: 'team' },
        ],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      expect(thread.participants).toHaveLength(2);
    });
  });

  describe('getThread', () => {
    it('should return thread by ID', async () => {
      const created = await createThread({
        subject: 'Test Thread',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      const retrieved = await getThread(created.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent thread', async () => {
      const thread = await getThread('nonexistent');
      expect(thread).toBeNull();
    });
  });

  describe('getThreadsForUser', () => {
    it('should return threads where user is participant', async () => {
      await createThread({
        subject: 'Thread 1',
        participants: [{ userId: 'user2', name: 'Jane', role: 'team' }],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await createThread({
        subject: 'Thread 2',
        participants: [],
        createdBy: 'user3',
        createdByName: 'Bob',
        createdByRole: 'client',
      });

      const { threads, total } = await getThreadsForUser('user1');

      expect(total).toBe(1);
      expect(threads[0].subject).toBe('Thread 1');
    });

    it('should filter by status', async () => {
      const thread1 = await createThread({
        subject: 'Active',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await createThread({
        subject: 'Archived',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await archiveThread(thread1.id);

      const { threads } = await getThreadsForUser('user1', { status: 'archived' });

      expect(threads).toHaveLength(1);
      expect(threads[0].subject).toBe('Active'); // First one was archived
    });

    it('should filter by project', async () => {
      await createThread({
        projectId: 'proj1',
        subject: 'Project 1 Thread',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await createThread({
        projectId: 'proj2',
        subject: 'Project 2 Thread',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      const { threads } = await getThreadsForUser('user1', { projectId: 'proj1' });

      expect(threads).toHaveLength(1);
      expect(threads[0].subject).toBe('Project 1 Thread');
    });
  });

  describe('updateThreadStatus', () => {
    it('should update thread status', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      const updated = await updateThreadStatus(thread.id, 'resolved');

      expect(updated?.status).toBe('resolved');
    });

    it('should return null for non-existent thread', async () => {
      const result = await updateThreadStatus('nonexistent', 'archived');
      expect(result).toBeNull();
    });
  });

  describe('addParticipant', () => {
    it('should add new participant', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      const updated = await addParticipant(thread.id, {
        userId: 'user2',
        name: 'Jane',
        role: 'team',
      });

      expect(updated?.participants).toHaveLength(2);
    });

    it('should not duplicate existing participant', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await addParticipant(thread.id, {
        userId: 'user1',
        name: 'John',
        role: 'client',
      });

      const retrieved = await getThread(thread.id);
      expect(retrieved?.participants).toHaveLength(1);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [{ userId: 'user2', name: 'Jane', role: 'team' }],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await removeParticipant(thread.id, 'user2');

      const retrieved = await getThread(thread.id);
      expect(retrieved?.participants).toHaveLength(1);
    });
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      const message = await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Hello!',
      });

      expect(message.id).toBeTruthy();
      expect(message.content).toBe('Hello!');
      expect(message.status).toBe('sent');
    });

    it('should throw for non-existent thread', async () => {
      await expect(
        sendMessage({
          threadId: 'nonexistent',
          senderId: 'user1',
          senderName: 'John',
          senderRole: 'client',
          content: 'Hello!',
        })
      ).rejects.toThrow('Thread not found');
    });

    it('should throw for message exceeding max length', async () => {
      initMessagingService({ maxMessageLength: 10 });

      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await expect(
        sendMessage({
          threadId: thread.id,
          senderId: 'user1',
          senderName: 'John',
          senderRole: 'client',
          content: 'This message is way too long',
        })
      ).rejects.toThrow('exceeds maximum length');
    });

    it('should update thread lastMessage', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'First',
      });

      const message = await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Second',
      });

      const updated = await getThread(thread.id);
      expect(updated?.lastMessage?.id).toBe(message.id);
    });
  });

  describe('getMessages', () => {
    it('should return messages for thread', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Message 1',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Message 2',
      });

      const { messages, hasMore } = await getMessages(thread.id);

      expect(messages).toHaveLength(2);
      expect(hasMore).toBe(false);
    });

    it('should paginate messages', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      for (let i = 0; i < 5; i++) {
        await sendMessage({
          threadId: thread.id,
          senderId: 'user1',
          senderName: 'John',
          senderRole: 'client',
          content: `Message ${i}`,
        });
      }

      const { messages, hasMore } = await getMessages(thread.id, { limit: 3 });

      expect(messages).toHaveLength(3);
      expect(hasMore).toBe(true);
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [{ userId: 'user2', name: 'Jane', role: 'team' }],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Hello',
      });

      const count = await markMessagesAsRead(thread.id, 'user2');

      expect(count).toBe(1);

      const { messages } = await getMessages(thread.id);
      expect(messages[0].readBy).toContain('user2');
    });

    it('should not count own messages', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Hello',
      });

      const count = await markMessagesAsRead(thread.id, 'user1');

      expect(count).toBe(0);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message from sender', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      const message = await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Delete me',
      });

      const result = await deleteMessage(thread.id, message.id, 'user1');

      expect(result).toBe(true);

      const { messages } = await getMessages(thread.id);
      expect(messages).toHaveLength(0);
    });

    it('should throw when non-sender tries to delete', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [{ userId: 'user2', name: 'Jane', role: 'team' }],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      const message = await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Protected',
      });

      await expect(deleteMessage(thread.id, message.id, 'user2')).rejects.toThrow(
        'Not authorized'
      );
    });
  });

  describe('getMessagingStats', () => {
    it('should return statistics', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Hello',
      });

      const stats = getMessagingStats();

      expect(stats.totalThreads).toBe(1);
      expect(stats.activeThreads).toBe(1);
      expect(stats.totalMessages).toBe(1);
      expect(stats.averageMessagesPerThread).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [{ userId: 'user2', name: 'Jane', role: 'team' }],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Message 1',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'Message 2',
      });

      const unread = await getUnreadCount('user2');

      expect(unread).toBe(2);
    });

    it('should not count own messages', async () => {
      const thread = await createThread({
        subject: 'Test',
        participants: [],
        createdBy: 'user1',
        createdByName: 'John',
        createdByRole: 'client',
      });

      await sendMessage({
        threadId: thread.id,
        senderId: 'user1',
        senderName: 'John',
        senderRole: 'client',
        content: 'My message',
      });

      const unread = await getUnreadCount('user1');

      expect(unread).toBe(0);
    });
  });
});
