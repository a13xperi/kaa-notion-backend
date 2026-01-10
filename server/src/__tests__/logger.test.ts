/**
 * Logger Tests
 */

import { logger, formatError, logError } from '../logger';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Test warn message');
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('metadata support', () => {
    it('should include metadata in logs', () => {
      logger.info('Test message', { userId: '123', action: 'test' });
      expect(mockConsoleLog).toHaveBeenCalled();
      const logOutput = mockConsoleLog.mock.calls[0][0];
      expect(logOutput).toContain('userId');
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle mixed arguments', () => {
      logger.info('Message', { key: 'value' }, 'extra');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('backward compatibility', () => {
    it('should work with old API (message + error)', () => {
      const error = new Error('Old API error');
      logger.error('Something went wrong', error);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should work with new API (message + metadata)', () => {
      logger.info('User action', { userId: '123', action: 'login' });
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should work with just a message', () => {
      logger.info('Simple message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('child logger', () => {
    it('should create a child logger with context', () => {
      const childLogger = logger.child({ correlationId: 'test-123' });
      childLogger.info('Child log message');
      expect(mockConsoleLog).toHaveBeenCalled();
      const logOutput = mockConsoleLog.mock.calls[0][0];
      expect(logOutput).toContain('correlationId');
    });

    it('should merge context with per-call metadata', () => {
      const childLogger = logger.child({ correlationId: 'test-456' });
      childLogger.info('Message', { extra: 'data' });
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});

describe('formatError', () => {
  it('should format Error objects', () => {
    const error = new Error('Test error');
    const formatted = formatError(error);
    
    expect(formatted.errorName).toBe('Error');
    expect(formatted.errorMessage).toBe('Test error');
  });

  it('should format custom error properties', () => {
    const error = new Error('Custom error') as Error & { code: string };
    error.code = 'CUSTOM_CODE';
    const formatted = formatError(error);
    
    expect(formatted.errorMessage).toBe('Custom error');
    expect(formatted.code).toBe('CUSTOM_CODE');
  });

  it('should handle non-Error values', () => {
    const formatted = formatError('string error');
    expect(formatted.error).toBe('string error');
  });

  it('should handle null', () => {
    const formatted = formatError(null);
    expect(formatted.error).toBe('null');
  });
});

describe('logError', () => {
  it('should log errors with context without throwing', () => {
    const error = new Error('Test error');
    
    // Just verify it doesn't throw
    expect(() => {
      logError('Operation failed', error, { userId: '123' });
    }).not.toThrow();
  });

  it('should handle errors with additional properties', () => {
    const error = new Error('Custom error') as Error & { statusCode: number };
    error.statusCode = 500;
    
    expect(() => {
      logError('HTTP Error', error, { path: '/api/test' });
    }).not.toThrow();
  });
});
