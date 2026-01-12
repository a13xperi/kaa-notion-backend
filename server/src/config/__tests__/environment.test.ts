/**
 * Environment Configuration Tests
 */

import { validateEnvironment, isProduction, isDevelopment, isTest, getFeatureFlags } from '../environment';

// Store original env
const originalEnv = process.env;

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should fail when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'a'.repeat(32);
      
      const result = validateEnvironment();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('DATABASE_URL'))).toBe(true);
    });

    it('should fail when JWT_SECRET is too short', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'short';
      
      const result = validateEnvironment();
      
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should pass with valid required variables', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'a'.repeat(32);
      
      const result = validateEnvironment();
      
      expect(result.valid).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should use default values for optional variables', () => {
      // Clear existing env vars to test defaults
      const savedPort = process.env.PORT;
      const savedJwtExpires = process.env.JWT_EXPIRES_IN;
      delete process.env.PORT;
      delete process.env.JWT_EXPIRES_IN;
      
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'a'.repeat(32);
      
      const result = validateEnvironment();
      
      // Restore
      if (savedPort) process.env.PORT = savedPort;
      if (savedJwtExpires) process.env.JWT_EXPIRES_IN = savedJwtExpires;
      
      expect(result.valid).toBe(true);
      // NODE_ENV is 'test' when running Jest
      expect(['development', 'test', 'production']).toContain(result.config?.NODE_ENV);
      expect(result.config?.PORT).toBe(3001);
      expect(result.config?.JWT_EXPIRES_IN).toBe('7d');
      expect(result.config?.STORAGE_BUCKET).toBe('deliverables');
    });

    it('should warn about missing Stripe in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.CORS_ORIGINS = 'https://example.com';
      
      const result = validateEnvironment();
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('STRIPE'))).toBe(true);
    });

    it('should fail when JWT_SECRET is weak in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'a'.repeat(32); // Valid but weak
      process.env.CORS_ORIGINS = 'https://example.com';
      
      const result = validateEnvironment();
      
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should fail when production CORS allowlist is missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'a'.repeat(64);
      delete process.env.CORS_ORIGINS;
      delete process.env.FRONTEND_URL;

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('CORS_ORIGINS') || e.includes('FRONTEND_URL'))).toBe(true);
    });

    it('should fail when Stripe is enabled without a webhook secret in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.CORS_ORIGINS = 'https://example.com';
      process.env.STRIPE_SECRET_KEY = 'sk_live_123';
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('STRIPE_WEBHOOK_SECRET'))).toBe(true);
    });

    it('should fail when JWT_SECRET uses a development default in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'development-secret-key';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should parse PORT as number', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.PORT = '4000';
      
      const result = validateEnvironment();
      
      expect(result.config?.PORT).toBe(4000);
    });
  });

  describe('Environment helpers', () => {
    it('isProduction should return true in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
    });

    it('isDevelopment should return true in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
    });

    it('isTest should return true in test', () => {
      process.env.NODE_ENV = 'test';
      expect(isTest()).toBe(true);
    });
  });

  describe('getFeatureFlags', () => {
    it('should detect Stripe when configured', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      
      const flags = getFeatureFlags();
      
      expect(flags.stripeEnabled).toBe(true);
    });

    it('should detect Notion when configured', () => {
      process.env.NOTION_API_KEY = 'ntn_123';
      
      const flags = getFeatureFlags();
      
      expect(flags.notionEnabled).toBe(true);
    });

    it('should detect storage when both URL and key are set', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'service_key';
      
      const flags = getFeatureFlags();
      
      expect(flags.storageEnabled).toBe(true);
    });

    it('should not detect storage when only URL is set', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_KEY;
      
      const flags = getFeatureFlags();
      
      expect(flags.storageEnabled).toBe(false);
    });

    it('should detect email with Resend', () => {
      process.env.RESEND_API_KEY = 're_123';
      
      const flags = getFeatureFlags();
      
      expect(flags.emailEnabled).toBe(true);
    });

    it('should detect email with SMTP', () => {
      delete process.env.RESEND_API_KEY;
      process.env.SMTP_HOST = 'smtp.test.com';
      
      const flags = getFeatureFlags();
      
      expect(flags.emailEnabled).toBe(true);
    });

    it('should enable API docs in development', () => {
      process.env.NODE_ENV = 'development';
      
      const flags = getFeatureFlags();
      
      expect(flags.apiDocsEnabled).toBe(true);
    });
  });
});
