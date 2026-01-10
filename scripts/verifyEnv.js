#!/usr/bin/env node
/**
 * Environment Variable Verification Script
 * 
 * Validates all required environment variables and tests connectivity to all services.
 * 
 * Usage:
 *   node scripts/verifyEnv.js
 *   npm run verify-env (if added to package.json)
 */

require('dotenv').config();
const { z } = require('zod');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Required
  NOTION_API_KEY: z.string().min(1, 'NOTION_API_KEY is required'),
  
  // Database (Supabase/Postgres)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Notion Configuration
  NOTION_PARENT_PAGE_ID: z.string().optional(),
  NOTION_PROJECTS_DATABASE_ID: z.string().optional(),
  CLIENTS_DB_ID: z.string().optional(),
  CLIENT_CREDENTIALS_DB_ID: z.string().optional(),
  CLIENT_DOCUMENTS_DB_ID: z.string().optional(),
  CLIENT_ACTIVITIES_DB_ID: z.string().optional(),
  ACTIVITY_LOG_DB_ID: z.string().optional(),
  NOTION_RESOURCES_DB_ID: z.string().optional(),
  
  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'STRIPE_PUBLISHABLE_KEY must start with pk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_').optional(),
  STRIPE_PRICE_ID_TIER_1: z.string().optional(),
  STRIPE_PRICE_ID_TIER_2: z.string().optional(),
  STRIPE_PRICE_ID_TIER_3: z.string().optional(),
  STRIPE_PRICE_ID_TIER_4: z.string().optional(),
  STRIPE_PRICE_ID_SUBSCRIPTION_BASIC: z.string().optional(),
  STRIPE_PRICE_ID_SUBSCRIPTION_PRO: z.string().optional(),
  
  // Email Configuration
  RESEND_API_KEY: z.string().optional(),
  POSTMARK_API_KEY: z.string().optional(),
  EMAIL_SERVICE: z.string().optional(),
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  TEAM_EMAIL: z.string().email().optional(),
  
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().startsWith('sk-', 'OPENAI_API_KEY must start with sk-').optional(),
  
  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  VERCEL_URL: z.string().optional(),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  JWT_EXPIRES_IN: z.string().default('7d').optional(),
});

/**
 * Test connectivity to services
 */
async function testConnectivity() {
  const results = {
    database: { connected: false, error: null, configured: false },
    supabase: { connected: false, error: null, configured: false },
    stripe: { connected: false, error: null, configured: false },
    notion: { connected: false, error: null, configured: false },
    openai: { connected: false, error: null, configured: false },
    email: { configured: false, method: null }
  };

  // Test Database (Prisma/Postgres)
  if (process.env.DATABASE_URL) {
    results.database.configured = true;
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      results.database.connected = true;
    } catch (error) {
      results.database.error = error.message;
    }
  }

  // Test Supabase Storage
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    results.supabase.configured = true;
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      // Test connection by listing buckets (lightweight operation)
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      results.supabase.connected = true;
    } catch (error) {
      results.supabase.error = error.message;
    }
  }

  // Test Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    results.stripe.configured = true;
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      await stripe.balance.retrieve();
      results.stripe.connected = true;
    } catch (error) {
      results.stripe.error = error.message;
    }
  }

  // Test Notion
  if (process.env.NOTION_API_KEY) {
    results.notion.configured = true;
    try {
      const { Client } = require('@notionhq/client');
      const notion = new Client({ auth: process.env.NOTION_API_KEY });
      await notion.users.me();
      results.notion.connected = true;
    } catch (error) {
      results.notion.error = error.message;
    }
  }

  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    results.openai.configured = true;
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.models.list();
      results.openai.connected = true;
    } catch (error) {
      results.openai.error = error.message;
    }
  }

  // Check email configuration
  if (process.env.RESEND_API_KEY) {
    results.email.configured = true;
    results.email.method = 'Resend';
  } else if (process.env.POSTMARK_API_KEY) {
    results.email.configured = true;
    results.email.method = 'Postmark';
  } else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    results.email.configured = true;
    results.email.method = `SMTP (${process.env.EMAIL_SERVICE || 'gmail'})`;
  }

  return results;
}

/**
 * Get configuration status
 */
function getConfigStatus() {
  const env = process.env;
  
  return {
    required: {
      notion: {
        configured: !!env.NOTION_API_KEY,
        missing: !env.NOTION_API_KEY ? ['NOTION_API_KEY'] : []
      }
    },
    recommended: {
      database: {
        configured: !!env.DATABASE_URL,
        missing: !env.DATABASE_URL ? ['DATABASE_URL'] : []
      },
      supabase: {
        configured: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
        missing: [
          !env.SUPABASE_URL && 'SUPABASE_URL',
          !env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY'
        ].filter(Boolean)
      },
      stripe: {
        configured: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
        missing: [
          !env.STRIPE_SECRET_KEY && 'STRIPE_SECRET_KEY',
          !env.STRIPE_WEBHOOK_SECRET && 'STRIPE_WEBHOOK_SECRET'
        ].filter(Boolean)
      },
      openai: {
        configured: !!env.OPENAI_API_KEY,
        missing: !env.OPENAI_API_KEY ? ['OPENAI_API_KEY (optional but recommended for Sage chat)'] : []
      }
    },
    optional: {
      email: {
        configured: !!(env.RESEND_API_KEY || env.POSTMARK_API_KEY || (env.EMAIL_USER && env.EMAIL_PASSWORD)),
        missing: (!env.RESEND_API_KEY && !env.POSTMARK_API_KEY && !(env.EMAIL_USER && env.EMAIL_PASSWORD)) 
          ? ['RESEND_API_KEY or POSTMARK_API_KEY or (EMAIL_USER + EMAIL_PASSWORD)'] 
          : []
      },
      notionDatabases: {
        configured: !!(env.NOTION_PROJECTS_DATABASE_ID || env.CLIENTS_DB_ID || env.CLIENT_CREDENTIALS_DB_ID),
        missing: []
      }
    }
  };
}

/**
 * Main validation function
 */
async function runValidation() {
  logSection('Environment Variable Verification');
  
  // 1. Schema Validation
  logSection('1. Schema Validation');
  try {
    envSchema.parse(process.env);
    logSuccess('All environment variables pass schema validation');
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError('Schema validation failed:');
      error.errors.forEach(err => {
        const path = err.path.join('.');
        logError(`  ${path}: ${err.message}`);
      });
      return { valid: false, exitCode: 1 };
    }
    throw error;
  }

  // 2. Configuration Status
  logSection('2. Configuration Status');
  const configStatus = getConfigStatus();
  
  // Required
  log('\n📋 Required Configuration:');
  Object.entries(configStatus.required).forEach(([service, status]) => {
    if (status.configured) {
      logSuccess(`${service}: Configured`);
    } else {
      logError(`${service}: Missing - ${status.missing.join(', ')}`);
    }
  });

  // Recommended
  log('\n📋 Recommended Configuration:');
  Object.entries(configStatus.recommended).forEach(([service, status]) => {
    if (status.configured) {
      logSuccess(`${service}: Configured`);
    } else {
      logWarning(`${service}: Missing - ${status.missing.join(', ')}`);
    }
  });

  // Optional
  log('\n📋 Optional Configuration:');
  Object.entries(configStatus.optional).forEach(([service, status]) => {
    if (status.configured) {
      logSuccess(`${service}: Configured`);
    } else {
      logInfo(`${service}: Not configured (optional)`);
    }
  });

  // 3. Connectivity Tests
  logSection('3. Service Connectivity Tests');
  logInfo('Testing connections to configured services...\n');
  
  const connectivity = await testConnectivity();

  Object.entries(connectivity).forEach(([service, result]) => {
    if (service === 'email') {
      if (result.configured) {
        logSuccess(`${service}: Configured (${result.method})`);
      } else {
        logInfo(`${service}: Not configured (optional)`);
      }
    } else {
      if (result.configured) {
        if (result.connected) {
          logSuccess(`${service}: Connected`);
        } else {
          logError(`${service}: Configuration error - ${result.error}`);
        }
      } else {
        logInfo(`${service}: Not configured`);
      }
    }
  });

  // 4. Summary
  logSection('4. Summary');
  
  const allRequiredConfigured = configStatus.required.notion.configured;
  const allRecommendedConnected = Object.values(configStatus.recommended)
    .filter(status => status.configured)
    .every((status, index) => {
      const service = Object.keys(configStatus.recommended)[index];
      return connectivity[service]?.connected !== false;
    });

  if (allRequiredConfigured && allRecommendedConnected) {
    logSuccess('All required and recommended services are configured and connected!');
    log('\n✅ Verification complete - System ready');
    return { valid: true, exitCode: 0 };
  } else {
    if (!allRequiredConfigured) {
      logError('Required services are not fully configured');
    }
    if (!allRecommendedConnected) {
      logWarning('Some recommended services have connectivity issues');
    }
    log('\n⚠️  Verification complete - Some issues detected');
    return { valid: false, exitCode: 1 };
  }
}

// Run if executed directly
if (require.main === module) {
  runValidation()
    .then(result => {
      process.exit(result.exitCode);
    })
    .catch(error => {
      logError(`\n❌ Fatal error during verification: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runValidation, testConnectivity, getConfigStatus };
