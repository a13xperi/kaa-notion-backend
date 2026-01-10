/**
 * Rate Limit Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, apiRateLimiter, authRateLimiter } from '../middleware/rateLimit';

// Mock request/response
function createMockReq(ip = '127.0.0.1'): Partial<Request> {
  return {
    ip,
    headers: {},
    socket: { remoteAddress: ip } as any,
    path: '/test',
  };
}

function createMockRes() {
  const headers: Record<string, string | number> = {};
  return {
    setHeader: jest.fn((key: string, value: string | number) => {
      headers[key] = value;
      return {} as Response;
    }),
    getHeader: (key: string) => headers[key],
    _headers: headers, // Internal storage
  } as unknown as Response;
}

describe('Rate Limiting', () => {
  describe('createRateLimiter', () => {
    it('should allow requests under the limit', () => {
      const limiter = createRateLimiter('test-allow', {
        windowMs: 1000,
        maxRequests: 5,
      });

      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      limiter(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    });

    it('should block requests over the limit', () => {
      const limiter = createRateLimiter('test-block', {
        windowMs: 60000,
        maxRequests: 2,
      });

      const req = createMockReq('192.168.1.1');
      const res = createMockRes();
      const next = jest.fn();

      // First two requests should pass
      limiter(req as Request, res as Response, next);
      limiter(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalledTimes(2);
      next.mockClear();

      // Third request should be blocked
      limiter(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        code: 'RATE_LIMITED',
      }));
    });

    it('should track different IPs separately', () => {
      const limiter = createRateLimiter('test-ips', {
        windowMs: 60000,
        maxRequests: 1,
      });

      const req1 = createMockReq('10.0.0.1');
      const req2 = createMockReq('10.0.0.2');
      const res = createMockRes();
      const next = jest.fn();

      // Both IPs should get one request each
      limiter(req1 as Request, res as Response, next);
      limiter(req2 as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalledWith();
    });

    it('should respect custom key generator', () => {
      const limiter = createRateLimiter('test-keygen', {
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req) => (req as any).userId || 'anonymous',
      });

      const req1 = { ...createMockReq(), userId: 'user1' } as any;
      const req2 = { ...createMockReq(), userId: 'user2' } as any;
      const res = createMockRes();
      const next = jest.fn();

      // Both users should get one request each
      limiter(req1, res as Response, next);
      limiter(req2, res as Response, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should skip rate limiting when skip returns true', () => {
      const limiter = createRateLimiter('test-skip', {
        windowMs: 60000,
        maxRequests: 1,
        skip: (req) => req.path === '/health',
      });

      const healthReq = { ...createMockReq(), path: '/health' } as Request;
      const normalReq = { ...createMockReq(), path: '/api' } as Request;
      const res = createMockRes();
      const next = jest.fn();

      // Health check should always pass
      limiter(healthReq, res as Response, next);
      limiter(healthReq, res as Response, next);
      limiter(healthReq, res as Response, next);

      expect(next).toHaveBeenCalledTimes(3);
      expect(next).toHaveBeenCalledWith();
    });

    it('should set Retry-After header when rate limited', () => {
      const limiter = createRateLimiter('test-retry', {
        windowMs: 60000,
        maxRequests: 1,
      });

      const req = createMockReq('10.10.10.10');
      const res = createMockRes();
      const next = jest.fn();

      // First request passes
      limiter(req as Request, res as Response, next);
      
      // Second request should be blocked with Retry-After
      limiter(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });

    it('should use custom error message', () => {
      const customMessage = 'Custom rate limit message';
      const limiter = createRateLimiter('test-message', {
        windowMs: 60000,
        maxRequests: 1,
        message: customMessage,
      });

      const req = createMockReq('20.20.20.20');
      const res = createMockRes();
      const next = jest.fn();

      // First request passes
      limiter(req as Request, res as Response, next);
      
      // Second request should have custom message
      limiter(req as Request, res as Response, next);

      expect(next).toHaveBeenLastCalledWith(expect.objectContaining({
        message: customMessage,
      }));
    });
  });

  describe('Pre-configured rate limiters', () => {
    it('apiRateLimiter should exist and be a function', () => {
      expect(typeof apiRateLimiter).toBe('function');
    });

    it('authRateLimiter should exist and be a function', () => {
      expect(typeof authRateLimiter).toBe('function');
    });

    it('should have appropriate rate limit headers', () => {
      const req = createMockReq('30.30.30.30');
      const res = createMockRes();
      const next = jest.fn();

      apiRateLimiter(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    });
  });
});
