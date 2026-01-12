/**
 * Route validation regression tests
 */

import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import type { StorageService } from '../services/storageService';
import { createAuthRouter } from '../routes/auth';
import { createLeadsRouter } from '../routes/leads';
import { createCheckoutRouter } from '../routes/checkout';
import { createUploadRouter } from '../routes/upload';
import { createAdminRouter } from '../routes/admin';
import { mockPrisma } from './setup';

const fetch = require('node-fetch');
const FormData = require('form-data');

jest.mock('../middleware/auth', () => ({
  requireAuth: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  AuthenticatedRequest: {},
}));

describe('Route validation', () => {
  const withServer = async (
    app: express.Express,
    fn: (baseUrl: string) => Promise<void>
  ) => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });

    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      await fn(baseUrl);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };

  it('rejects invalid auth register payloads', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(mockPrisma as any));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'short' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  it('rejects invalid lead creation payloads', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/leads', createLeadsRouter(mockPrisma as any));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  it('rejects invalid checkout payloads', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/checkout', createCheckoutRouter(mockPrisma as any));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/checkout/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  it('rejects upload payloads missing projectId', async () => {
    const app = express();
    const storageService: Partial<StorageService> = {
      getAllowedMimeTypes: () => ['text/plain'],
    };

    app.use((req, _res, next) => {
      (req as any).user = { id: 'admin-user', userType: 'ADMIN', email: 'admin@test.com' };
      (req as any).storageService = storageService;
      next();
    });

    app.use('/api/upload', createUploadRouter({ prisma: mockPrisma as any }));

    await withServer(app, async (baseUrl) => {
      const form = new FormData();
      form.append('file', Buffer.from('test'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  it('rejects invalid admin query parameters', async () => {
    const app = express();
    app.use('/api/admin', createAdminRouter(mockPrisma as any));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/leads?page=0`);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('INVALID_QUERY');
    });
  });
});
