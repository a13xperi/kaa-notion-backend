/**
 * Environment Variable Validator
 *
 * Validates all required environment variables from env.example at startup.
 * Logs warnings for missing optional variables or dev defaults.
 * Throws errors for critical missing variables in production.
 */

const VALIDATION_LEVELS = {
  REQUIRED: 'required',      // Throws error if missing in production
  RECOMMENDED: 'recommended', // Logs warning if missing
  OPTIONAL: 'optional'       // Logs info if missing
};

const ENV_VARIABLES = {
  // ============================================
  // Supabase Configuration
  // ============================================
  SUPABASE_URL: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'Supabase project URL',
    devDefault: null,
    validate: (value) => {
      if (value && !value.includes('supabase.co') && !value.startsWith('http')) {
        return 'Invalid Supabase URL format';
      }
      if (value && value.includes('your-project')) {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },
  SUPABASE_ANON_KEY: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'Supabase anonymous key',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_supabase')) {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'Supabase service role key (keep secure!)',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_supabase')) {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },

  // ============================================
  // Notion Configuration (Required for core functionality)
  // ============================================
  NOTION_API_KEY: {
    level: VALIDATION_LEVELS.REQUIRED,
    description: 'Notion integration API token',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_integration')) {
        return 'Still using placeholder value from env.example';
      }
      if (value && !value.startsWith('ntn_') && !value.startsWith('secret_')) {
        return 'Invalid Notion API key format (should start with ntn_ or secret_)';
      }
      return null;
    }
  },
  NOTION_PARENT_PAGE_ID: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'Notion parent page ID for database creation',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_parent')) {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },

  // Notion Database IDs (Optional - will auto-create)
  CLIENT_CREDENTIALS_DB_ID: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Notion database ID for client credentials',
    devDefault: null,
    validate: null
  },
  CLIENT_DOCUMENTS_DB_ID: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Notion database ID for client documents',
    devDefault: null,
    validate: null
  },
  ACTIVITY_LOG_DB_ID: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Notion database ID for activity logging',
    devDefault: null,
    validate: null
  },
  CLIENTS_DB_ID: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Notion database ID for clients',
    devDefault: null,
    validate: null
  },

  // ============================================
  // Stripe Configuration (Required for payments)
  // ============================================
  STRIPE_SECRET_KEY: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'Stripe secret API key',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_stripe')) {
        return 'Still using placeholder value from env.example';
      }
      if (value && !value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
        return 'Invalid Stripe secret key format';
      }
      return null;
    },
    warnings: (value, env) => {
      if (value && value.startsWith('sk_test_') && env.NODE_ENV === 'production') {
        return 'Using Stripe TEST key in production environment';
      }
      return null;
    }
  },
  STRIPE_PUBLISHABLE_KEY: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'Stripe publishable API key',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_stripe')) {
        return 'Still using placeholder value from env.example';
      }
      if (value && !value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
        return 'Invalid Stripe publishable key format';
      }
      return null;
    },
    warnings: (value, env) => {
      if (value && value.startsWith('pk_test_') && env.NODE_ENV === 'production') {
        return 'Using Stripe TEST key in production environment';
      }
      return null;
    }
  },
  STRIPE_WEBHOOK_SECRET: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Stripe webhook signing secret',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_webhook')) {
        return 'Still using placeholder value from env.example';
      }
      if (value && !value.startsWith('whsec_')) {
        return 'Invalid Stripe webhook secret format';
      }
      return null;
    }
  },

  // ============================================
  // Email Configuration
  // ============================================
  RESEND_API_KEY: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Resend API key (recommended for production)',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_resend')) {
        return 'Still using placeholder value from env.example';
      }
      if (value && !value.startsWith('re_')) {
        return 'Invalid Resend API key format';
      }
      return null;
    }
  },
  POSTMARK_API_KEY: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Postmark API key',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_postmark')) {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },
  EMAIL_SERVICE: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Email service provider',
    devDefault: 'gmail',
    validate: null,
    warnings: (value, env) => {
      if (value === 'gmail' && env.NODE_ENV === 'production') {
        return 'Using Gmail for email in production (consider Resend or Postmark)';
      }
      return null;
    }
  },
  EMAIL_USER: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Email username/address',
    devDefault: null,
    validate: null,
    warnings: (value, env) => {
      if (value && value.includes('@gmail.com') && env.NODE_ENV === 'production') {
        return 'Using Gmail address in production (consider professional email service)';
      }
      if (value && value.includes('your-email')) {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },
  EMAIL_PASSWORD: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Email password/app-specific password',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your-app-specific')) {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },
  TEAM_EMAIL: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Team notification email address',
    devDefault: null,
    validate: (value) => {
      if (value && value === 'team@kaa.com') {
        return 'Still using placeholder value from env.example';
      }
      return null;
    }
  },

  // ============================================
  // OpenAI Configuration (Required for Sage AI)
  // ============================================
  OPENAI_API_KEY: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'OpenAI API key for Sage ChatGPT features',
    devDefault: null,
    validate: (value) => {
      if (value && value.includes('your_openai')) {
        return 'Still using placeholder value from env.example';
      }
      if (value && !value.startsWith('sk-')) {
        return 'Invalid OpenAI API key format (should start with sk-)';
      }
      return null;
    }
  },

  // ============================================
  // Application Configuration
  // ============================================
  NODE_ENV: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Node environment (development/production)',
    devDefault: 'development',
    validate: (value) => {
      if (value && !['development', 'production', 'test'].includes(value)) {
        return 'Invalid NODE_ENV value (should be development, production, or test)';
      }
      return null;
    }
  },
  PORT: {
    level: VALIDATION_LEVELS.OPTIONAL,
    description: 'Server port number',
    devDefault: '3001',
    validate: (value) => {
      const port = parseInt(value, 10);
      if (value && (isNaN(port) || port < 1 || port > 65535)) {
        return 'Invalid port number';
      }
      return null;
    }
  },
  FRONTEND_URL: {
    level: VALIDATION_LEVELS.RECOMMENDED,
    description: 'Frontend application URL for CORS and emails',
    devDefault: 'http://localhost:3000',
    validate: null,
    warnings: (value, env) => {
      if (value === 'http://localhost:3000' && env.NODE_ENV === 'production') {
        return 'Using localhost frontend URL in production';
      }
      return null;
    }
  }
};

/**
 * Validates all environment variables and returns validation results
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @returns {Object} Validation results with errors, warnings, and info
 */
function validateEnvironment(env = process.env) {
  const results = {
    errors: [],
    warnings: [],
    info: [],
    valid: true,
    summary: {
      total: Object.keys(ENV_VARIABLES).length,
      configured: 0,
      missing: 0,
      invalid: 0
    }
  };

  const isProduction = env.NODE_ENV === 'production';

  for (const [varName, config] of Object.entries(ENV_VARIABLES)) {
    const value = env[varName];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (hasValue) {
      results.summary.configured++;

      // Run validation function if exists
      if (config.validate) {
        const validationError = config.validate(value);
        if (validationError) {
          results.summary.invalid++;
          if (config.level === VALIDATION_LEVELS.REQUIRED) {
            results.errors.push({
              variable: varName,
              message: validationError,
              description: config.description
            });
            results.valid = false;
          } else {
            results.warnings.push({
              variable: varName,
              message: validationError,
              description: config.description
            });
          }
        }
      }

      // Run warnings function if exists
      if (config.warnings) {
        const warning = config.warnings(value, env);
        if (warning) {
          results.warnings.push({
            variable: varName,
            message: warning,
            description: config.description
          });
        }
      }
    } else {
      results.summary.missing++;

      // Variable is missing
      if (config.level === VALIDATION_LEVELS.REQUIRED) {
        if (isProduction) {
          results.errors.push({
            variable: varName,
            message: 'Required environment variable is not set',
            description: config.description
          });
          results.valid = false;
        } else {
          results.warnings.push({
            variable: varName,
            message: 'Required variable not set (will error in production)',
            description: config.description
          });
        }
      } else if (config.level === VALIDATION_LEVELS.RECOMMENDED) {
        results.warnings.push({
          variable: varName,
          message: 'Recommended variable not set - some features may not work',
          description: config.description
        });
      } else {
        results.info.push({
          variable: varName,
          message: 'Optional variable not set',
          description: config.description,
          default: config.devDefault
        });
      }
    }
  }

  return results;
}

/**
 * Logs validation results to console with formatted output
 * @param {Object} results - Validation results from validateEnvironment
 */
function logValidationResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('Environment Variable Validation');
  console.log('='.repeat(60));

  // Summary
  console.log(`\nSummary: ${results.summary.configured}/${results.summary.total} variables configured`);
  if (results.summary.invalid > 0) {
    console.log(`         ${results.summary.invalid} variables have invalid values`);
  }

  // Errors
  if (results.errors.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('ERRORS (must be fixed):');
    console.log('-'.repeat(40));
    for (const error of results.errors) {
      console.log(`\n  ${error.variable}`);
      console.log(`    ${error.message}`);
      console.log(`    Description: ${error.description}`);
    }
  }

  // Warnings
  if (results.warnings.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('WARNINGS:');
    console.log('-'.repeat(40));
    for (const warning of results.warnings) {
      console.log(`\n  ${warning.variable}`);
      console.log(`    ${warning.message}`);
    }
  }

  // Info (only show in verbose mode or development)
  if (results.info.length > 0 && process.env.NODE_ENV !== 'production') {
    console.log('\n' + '-'.repeat(40));
    console.log('INFO (optional variables):');
    console.log('-'.repeat(40));
    for (const info of results.info) {
      const defaultNote = info.default ? ` (default: ${info.default})` : '';
      console.log(`  ${info.variable}: ${info.message}${defaultNote}`);
    }
  }

  // Final status
  console.log('\n' + '='.repeat(60));
  if (results.valid) {
    console.log('Environment validation PASSED');
  } else {
    console.log('Environment validation FAILED');
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * Validates environment and optionally throws on critical errors
 * @param {Object} options - Validation options
 * @param {boolean} options.throwOnError - Whether to throw on validation errors (default: true in production)
 * @param {boolean} options.logResults - Whether to log results to console (default: true)
 * @param {Object} options.env - Environment object (default: process.env)
 * @returns {Object} Validation results
 */
function validateEnv(options = {}) {
  const {
    throwOnError = process.env.NODE_ENV === 'production',
    logResults = true,
    env = process.env
  } = options;

  const results = validateEnvironment(env);

  if (logResults) {
    logValidationResults(results);
  }

  if (throwOnError && !results.valid) {
    const errorMessages = results.errors.map(e => `${e.variable}: ${e.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return results;
}

/**
 * Check if email is configured using dev defaults (Gmail)
 * @param {Object} env - Environment object
 * @returns {boolean} True if using Gmail/dev email configuration
 */
function isUsingDevEmailConfig(env = process.env) {
  const service = env.EMAIL_SERVICE || 'gmail';
  const user = env.EMAIL_USER || '';

  return service === 'gmail' || user.includes('@gmail.com');
}

/**
 * Check if Stripe is in test mode
 * @param {Object} env - Environment object
 * @returns {boolean} True if using Stripe test keys
 */
function isStripeTestMode(env = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY || '';
  return secretKey.startsWith('sk_test_');
}

/**
 * Get a summary of critical services status
 * @param {Object} env - Environment object
 * @returns {Object} Service status summary
 */
function getServicesStatus(env = process.env) {
  return {
    notion: {
      configured: !!env.NOTION_API_KEY && !env.NOTION_API_KEY.includes('your_'),
      description: 'Core functionality'
    },
    supabase: {
      configured: !!env.SUPABASE_URL && !env.SUPABASE_URL.includes('your-project'),
      description: 'Database'
    },
    stripe: {
      configured: !!env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes('your_'),
      testMode: isStripeTestMode(env),
      description: 'Payments'
    },
    email: {
      configured: !!env.EMAIL_USER || !!env.RESEND_API_KEY || !!env.POSTMARK_API_KEY,
      usingDevDefaults: isUsingDevEmailConfig(env),
      description: 'Email notifications'
    },
    openai: {
      configured: !!env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('your_'),
      description: 'Sage AI assistant'
    }
  };
}

module.exports = {
  validateEnv,
  validateEnvironment,
  logValidationResults,
  isUsingDevEmailConfig,
  isStripeTestMode,
  getServicesStatus,
  VALIDATION_LEVELS,
  ENV_VARIABLES
};
