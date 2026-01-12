/**
 * Notion Routes Auth Tests
 *
 * Ensures admin-only Notion endpoints enforce JWT auth + admin role.
 */

import express from 'express';
import type { Server } from 'http';
import { createNotionRouter } from '../routes/notion';
import { errorHandler } from '../middleware';
import { generateToken } from '../middleware/auth';

const createApp = (prisma: any) => {
  const app = express();
  app.use(express.json());
  app.use('/api/notion', createNotionRouter({ prisma }));
  app.use(errorHandler);
  return app;
};

const startServer = (app: express.Express) => new Promise<{ server: Server; baseUrl: string }>((resolve) => {
  const server = app.listen(0, () => {
    const address = server.address();
    if (typeof address === 'string' || !address) {
      throw new Error('Failed to start test server');
    }
    resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
  });
});

describe('Notion admin routes auth', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without a token', async () => {
    const app = createApp(mockPrisma);
    const { server, baseUrl } = await startServer(app);

    try {
      const response = await fetch(`${baseUrl}/api/notion/status`);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('UNAUTHORIZED');
    } finally {
      server.close();
    }
  });

  it('rejects non-admin JWTs', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: 'CLIENT',
      userType: 'SAGE_CLIENT',
      tier: 1,
      client: null,
    });
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      lastLogin: new Date(),
    });

    const token = generateToken({
      userId: 'user-1',
      email: 'user@example.com',
      userType: 'SAGE_CLIENT',
      tier: 1,
    });
    const app = createApp(mockPrisma);
    const { server, baseUrl } = await startServer(app);

    try {
      const response = await fetch(`${baseUrl}/api/notion/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('ADMIN_REQUIRED');
    } finally {
      server.close();
    }
  });
});
