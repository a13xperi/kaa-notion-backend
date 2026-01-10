/**
 * Compression Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import {
  createCompressionMiddleware,
  jsonOptimizer,
  etagMiddleware,
  generateETag,
  trackResponseSize,
  getCompressionStats,
  resetCompressionStats,
} from '../compression';

describe('Compression Middleware', () => {
  describe('createCompressionMiddleware', () => {
    it('should create compression middleware', () => {
      const middleware = createCompressionMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should accept custom configuration', () => {
      const middleware = createCompressionMiddleware({
        threshold: 2048,
        level: 9,
      });
      expect(typeof middleware).toBe('function');
    });
  });

  describe('generateETag', () => {
    it('should generate consistent ETag for same content', () => {
      const content = 'Hello, World!';
      const etag1 = generateETag(content);
      const etag2 = generateETag(content);
      expect(etag1).toBe(etag2);
    });

    it('should generate different ETags for different content', () => {
      const etag1 = generateETag('Content A');
      const etag2 = generateETag('Content B');
      expect(etag1).not.toBe(etag2);
    });

    it('should wrap ETag in quotes', () => {
      const etag = generateETag('test');
      expect(etag.startsWith('"')).toBe(true);
      expect(etag.endsWith('"')).toBe(true);
    });

    it('should handle Buffer input', () => {
      const buffer = Buffer.from('test');
      const etag = generateETag(buffer);
      expect(etag).toBeTruthy();
    });
  });

  describe('jsonOptimizer', () => {
    it('should remove null values from response', () => {
      let capturedBody: unknown;
      
      const req = {} as Request;
      const res = {
        json: jest.fn((body) => {
          capturedBody = body;
          return res;
        }),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      jsonOptimizer(req, res, next);
      
      // Call the overridden json method
      res.json({ name: 'Test', nullField: null, nested: { value: null } });

      expect(capturedBody).toEqual({ name: 'Test', nested: {} });
      expect(next).toHaveBeenCalled();
    });

    it('should preserve non-null values', () => {
      let capturedBody: unknown;
      
      const req = {} as Request;
      const res = {
        json: jest.fn((body) => {
          capturedBody = body;
          return res;
        }),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      jsonOptimizer(req, res, next);
      res.json({ name: 'Test', count: 0, active: false, empty: '' });

      expect(capturedBody).toEqual({ name: 'Test', count: 0, active: false, empty: '' });
    });
  });

  describe('etagMiddleware', () => {
    it('should set ETag header on response', () => {
      const req = { headers: {} } as Request;
      const headers: Record<string, string> = {};
      let statusCode: number | undefined;
      let ended = false;
      
      const res = {
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn((name: string, value: string) => {
          headers[name] = value;
        }),
        status: jest.fn((code: number) => {
          statusCode = code;
          return res;
        }),
        end: jest.fn(() => {
          ended = true;
          return res;
        }),
      } as unknown as Response;
      
      const next = jest.fn() as NextFunction;

      etagMiddleware(req, res, next);
      res.json({ data: 'test' });

      expect(headers['ETag']).toBeTruthy();
      expect(headers['ETag'].startsWith('"')).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should return 304 when If-None-Match matches', () => {
      const body = { data: 'test' };
      const etag = generateETag(JSON.stringify(body));
      
      const req = { headers: { 'if-none-match': etag } } as unknown as Request;
      let statusCode: number | undefined;
      let ended = false;
      
      const res = {
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        status: jest.fn((code: number) => {
          statusCode = code;
          return res;
        }),
        end: jest.fn(() => {
          ended = true;
          return res;
        }),
      } as unknown as Response;
      
      const next = jest.fn() as NextFunction;

      etagMiddleware(req, res, next);
      res.json(body);

      expect(statusCode).toBe(304);
      expect(ended).toBe(true);
    });
  });

  describe('Compression Stats', () => {
    beforeEach(() => {
      resetCompressionStats();
    });

    describe('trackResponseSize', () => {
      it('should track response count', () => {
        trackResponseSize(1000, 500);
        trackResponseSize(2000, 800);
        
        const stats = getCompressionStats();
        expect(stats.totalResponses).toBe(2);
      });

      it('should track total bytes', () => {
        trackResponseSize(1000, 500);
        trackResponseSize(2000, 800);
        
        const stats = getCompressionStats();
        expect(stats.totalOriginalBytes).toBe(3000);
        expect(stats.totalCompressedBytes).toBe(1300);
      });

      it('should calculate compression ratio', () => {
        trackResponseSize(1000, 500);
        
        const stats = getCompressionStats();
        expect(stats.compressionRatio).toBe(0.5);
      });
    });

    describe('resetCompressionStats', () => {
      it('should reset all stats', () => {
        trackResponseSize(1000, 500);
        trackResponseSize(2000, 800);
        
        resetCompressionStats();
        
        const stats = getCompressionStats();
        expect(stats.totalResponses).toBe(0);
        expect(stats.totalOriginalBytes).toBe(0);
        expect(stats.totalCompressedBytes).toBe(0);
        expect(stats.compressionRatio).toBe(0);
      });
    });

    describe('getCompressionStats', () => {
      it('should return a copy of stats', () => {
        trackResponseSize(1000, 500);
        
        const stats1 = getCompressionStats();
        const stats2 = getCompressionStats();
        
        expect(stats1).not.toBe(stats2);
        expect(stats1).toEqual(stats2);
      });
    });
  });
});
