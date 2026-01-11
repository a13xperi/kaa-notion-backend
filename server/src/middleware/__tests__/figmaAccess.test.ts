/**
 * Figma access middleware tests
 */

import type { PrismaClient } from '@prisma/client';
import { createFigmaAccessMiddleware } from '../figmaAccess';
import { createMockRequest, createMockResponse, createMockNext, mockUser } from '../../__tests__/setup';

describe('createFigmaAccessMiddleware', () => {
  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no user is present', async () => {
    const middleware = createFigmaAccessMiddleware(mockPrisma);
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  });

  it('allows admin users without project checks', async () => {
    const middleware = createFigmaAccessMiddleware(mockPrisma);
    const req = createMockRequest({
      user: {
        ...mockUser,
        userType: 'ADMIN',
        role: 'ADMIN',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(mockPrisma.project.findFirst).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when no projectId is provided for non-admin users', async () => {
    const middleware = createFigmaAccessMiddleware(mockPrisma);
    const req = createMockRequest({
      user: {
        ...mockUser,
        userType: 'SAGE_CLIENT',
        role: 'CLIENT',
        clientId: 'client-123',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PROJECT_ACCESS_REQUIRED',
        message: 'Project access is required for this resource.',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the project is not accessible', async () => {
    const middleware = createFigmaAccessMiddleware(mockPrisma);
    (mockPrisma.project.findFirst as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest({
      query: { projectId: 'project-123' },
      user: {
        ...mockUser,
        userType: 'SAGE_CLIENT',
        role: 'CLIENT',
        clientId: 'client-123',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        OR: [
          { projectAssignments: { some: { userId: mockUser.id } } },
          { clientId: 'client-123' },
        ],
      },
      select: { id: true },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied to this project.',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access when the project matches client or assignment', async () => {
    const middleware = createFigmaAccessMiddleware(mockPrisma);
    (mockPrisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'project-123' });

    const req = createMockRequest({
      query: { projectId: 'project-123' },
      user: {
        ...mockUser,
        userType: 'SAGE_CLIENT',
        role: 'CLIENT',
        clientId: 'client-123',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
