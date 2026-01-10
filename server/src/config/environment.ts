/**
 * SAGE Platform - Environment Configuration
 *
 * Centralized configuration for all environment variables.
 * Provides type-safe access and sensible defaults.
 */

// ============================================
// PLATFORM IDENTITY
// ============================================

export const SERVICE_NAME = 'SAGE';
export const SERVICE_FULL_NAME = 'SAGE Platform';

// ============================================
// SERVER CONFIGURATION
// ============================================

export const config = {
  // Platform Identity
  serviceName: SERVICE_NAME,
  serviceFullName: SERVICE_FULL_NAME,

  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  wsPort: parseInt(process.env.WS_PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database (Supabase)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Notion
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    parentPageId: process.env.NOTION_PARENT_PAGE_ID || '',
    clientCredentialsDbId: process.env.CLIENT_CREDENTIALS_DB_ID || '',
    clientDocumentsDbId: process.env.CLIENT_DOCUMENTS_DB_ID || '',
    activityLogDbId: process.env.ACTIVITY_LOG_DB_ID || '',
    clientsDbId: process.env.CLIENTS_DB_ID || '',
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  // Email
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    postmarkApiKey: process.env.POSTMARK_API_KEY || '',
    service: process.env.EMAIL_SERVICE || 'resend',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    teamEmail: process.env.TEAM_EMAIL || 'team@kaa.com',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // Auth
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    tokenExpiry: '24h',
  },

  // Figma (Legacy)
  figma: {
    accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
    webhookPasscode: process.env.FIGMA_WEBHOOK_PASSCODE || '',
  },
} as const;

// ============================================
// VALIDATION
// ============================================

/**
 * Validate required environment variables
 */
export function validateRequiredEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NOTION_API_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Log configuration status (for debugging)
 */
export function logConfigStatus(): void {
  console.log(`[${SERVICE_NAME}] Configuration Status:`);
  console.log(`  - Environment: ${config.nodeEnv}`);
  console.log(`  - Port: ${config.port}`);
  console.log(`  - WebSocket Port: ${config.wsPort}`);
  console.log(`  - Frontend URL: ${config.frontendUrl}`);
  console.log(`  - Supabase: ${config.supabase.url ? 'Configured' : 'Not configured'}`);
  console.log(`  - Notion: ${config.notion.apiKey ? 'Configured' : 'Not configured'}`);
  console.log(`  - Stripe: ${config.stripe.secretKey ? 'Configured' : 'Not configured'}`);
  console.log(`  - OpenAI: ${config.openai.apiKey ? 'Configured' : 'Not configured'}`);
}

export default config;
