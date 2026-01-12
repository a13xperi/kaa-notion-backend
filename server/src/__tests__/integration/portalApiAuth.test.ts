/**
 * Integration Test: Portal API Auth
 * Ensures portal endpoints accept JWTs and reject invalid tokens.
 */

import express from 'express';
import request from 'supertest';
import { createProjectsRouter } from '../../routes/projects';
import { generateToken } from '../../utils/auth';
import { mockPrisma, mockUser, mockClient, mockProject } from '../setup';

describe('Portal API Auth', () => {
  const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-for-testing';

  function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/projects', createProjectsRouter(mockPrisma));
    return app;
  }

  it('accepts a valid JWT for portal project listing', async () => {
    const token = generateToken(
      {
        userId: mockUser.id,
        email: mockUser.email,
        userType: 'SAGE_CLIENT',
        tier: mockUser.tier,
      },
      jwtSecret,
      1
    );

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      userType: 'SAGE_CLIENT',
      client: { id: mockClient.id },
    });
    (mockPrisma.project.count as jest.Mock).mockResolvedValue(1);
    (mockPrisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        ...mockProject,
        clientId: mockClient.id,
        paymentStatus: 'PAID',
        milestones: [],
      },
    ]);

    const app = buildApp();
    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(mockProject.id);
  });

  it('rejects an invalid JWT for portal project listing', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });
});
