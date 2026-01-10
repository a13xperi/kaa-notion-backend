#!/usr/bin/env node
/**
 * Phase 0 Environment Setup Script
 * 
 * This script completes Phase 0 environment setup:
 * 1. Validates environment variables
 * 2. Runs Prisma migrations
 * 3. Verifies full stack works
 * 
 * Usage:
 *   node scripts/phase0-setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function printSuccess(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function printError(msg) {
  console.log(`${RED}✗${RESET} ${msg}`);
}

function printWarning(msg) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

function printInfo(msg) {
  console.log(`${BLUE}ℹ${RESET} ${msg}`);
}

function printHeader(msg) {
  console.log('\n' + '='.repeat(60));
  console.log(`${BLUE}${msg}${RESET}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Check if .env file exists
 */
function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  
  if (!fs.existsSync(envPath)) {
    printWarning('.env file not found');
    if (fs.existsSync(envExamplePath)) {
      printInfo('Copying env.example to .env...');
      fs.copyFileSync(envExamplePath, envPath);
      printSuccess('.env file created from env.example');
      printWarning('⚠️  Please fill in all required values in .env before continuing');
      return false;
    } else {
      printError('env.example file not found. Cannot create .env');
      return false;
    }
  }
  
  printSuccess('.env file exists');
  return true;
}

/**
 * Validate environment variables using verifyEnv.js
 */
function validateEnv() {
  printInfo('Validating environment variables...');
  
  try {
    const result = execSync('node scripts/verifyEnv.js', {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
    
    // Check if validation passed
    if (result.includes('✓') || result.includes('success')) {
      printSuccess('Environment variables validated');
      return true;
    } else {
      printError('Environment validation failed');
      console.log(result);
      return false;
    }
  } catch (error) {
    printError('Environment validation failed');
    console.error(error.stdout || error.message);
    return false;
  }
}

/**
 * Generate Prisma Client
 */
function generatePrismaClient() {
  printInfo('Generating Prisma Client...');
  
  try {
    execSync('npm run prisma:generate', {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    printSuccess('Prisma Client generated');
    return true;
  } catch (error) {
    printError('Failed to generate Prisma Client');
    console.error(error.message);
    return false;
  }
}

/**
 * Check database connection
 */
async function checkDatabaseConnection() {
  printInfo('Checking database connection...');
  
  const prisma = new PrismaClient();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    printSuccess('Database connection successful');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    printError(`Database connection failed: ${error.message}`);
    printWarning('Make sure DATABASE_URL is set correctly in .env');
    await prisma.$disconnect().catch(() => {});
    return false;
  }
}

/**
 * Check migration status
 */
function checkMigrationStatus() {
  printInfo('Checking migration status...');
  
  try {
    const result = execSync('npx prisma migrate status --schema=./prisma/schema.prisma', {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
    
    if (result.includes('Database schema is up to date')) {
      printSuccess('Database schema is up to date');
      return { needsMigration: false };
    } else if (result.includes('following migration')) {
      printWarning('Pending migrations detected');
      console.log(result);
      return { needsMigration: true, output: result };
    } else {
      printWarning('Unknown migration status');
      console.log(result);
      return { needsMigration: false, output: result };
    }
  } catch (error) {
    // If migrations haven't been initialized yet
    if (error.stdout?.includes('following migration') || error.stdout?.includes('migration')) {
      printWarning('Migrations need to be initialized');
      return { needsMigration: true, needsInit: true };
    }
    printError('Failed to check migration status');
    console.error(error.stdout || error.message);
    return { needsMigration: false, error: true };
  }
}

/**
 * Run Prisma migrations
 */
function runMigrations(needsInit = false) {
  printInfo(needsInit ? 'Creating initial migration...' : 'Running migrations...');
  
  try {
    if (needsInit) {
      execSync('npx prisma migrate dev --name init --schema=./prisma/schema.prisma', {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
    } else {
      execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
    }
    printSuccess('Migrations completed successfully');
    return true;
  } catch (error) {
    printError('Failed to run migrations');
    console.error(error.message);
    printWarning('You may need to manually run: npm run prisma:migrate');
    return false;
  }
}

/**
 * Verify database indexes
 */
function verifyIndexes() {
  printInfo('Verifying database indexes...');
  
  try {
    execSync('npm run verify-indexes', {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    printWarning('Index verification failed or indexes missing');
    printWarning('Run migrations first, then verify indexes');
    return false;
  }
}

/**
 * Build the server
 */
function buildServer() {
  printInfo('Building server...');
  
  try {
    execSync('cd server && npm run build', {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    printSuccess('Server build successful');
    return true;
  } catch (error) {
    printError('Server build failed');
    console.error(error.message);
    return false;
  }
}

/**
 * Main setup function
 */
async function runSetup() {
  printHeader('Phase 0 Environment Setup');
  
  let success = true;
  
  // Step 1: Check .env file
  printHeader('Step 1: Environment File Check');
  if (!checkEnvFile()) {
    printError('Setup cannot continue without .env file');
    printInfo('Please create .env from env.example and fill in required values');
    process.exit(1);
  }
  
  // Step 2: Validate environment variables
  printHeader('Step 2: Environment Variable Validation');
  if (!validateEnv()) {
    printWarning('Some environment variables may be missing or invalid');
    printWarning('Please review and update .env file');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('Continue anyway? (y/N): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      printError('Setup cancelled by user');
      process.exit(1);
    }
  }
  
  // Step 3: Generate Prisma Client
  printHeader('Step 3: Prisma Client Generation');
  if (!generatePrismaClient()) {
    success = false;
  }
  
  // Step 4: Check database connection
  printHeader('Step 4: Database Connection Check');
  if (!(await checkDatabaseConnection())) {
    printError('Cannot proceed without database connection');
    printInfo('Please check DATABASE_URL in .env and ensure database is accessible');
    process.exit(1);
  }
  
  // Step 5: Check and run migrations
  printHeader('Step 5: Database Migrations');
  const migrationStatus = checkMigrationStatus();
  
  if (migrationStatus.needsMigration) {
    if (!runMigrations(migrationStatus.needsInit)) {
      success = false;
    }
  }
  
  // Step 6: Verify indexes (optional - may fail if migrations not run)
  printHeader('Step 6: Index Verification');
  verifyIndexes(); // Don't fail if this fails
  
  // Step 7: Build server
  printHeader('Step 7: Server Build');
  if (!buildServer()) {
    success = false;
  }
  
  // Summary
  printHeader('Setup Summary');
  
  if (success) {
    printSuccess('Phase 0 setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start the server: npm start (or npm run dev)');
    console.log('  2. Start the frontend: cd kaa-app && npm start');
    console.log('  3. Verify health check: curl http://localhost:3001/api/health');
    console.log('  4. Check metrics: curl http://localhost:3001/api/metrics');
    process.exit(0);
  } else {
    printWarning('Phase 0 setup completed with warnings');
    printInfo('Please review errors above and fix any issues');
    process.exit(1);
  }
}

// Run setup
runSetup().catch((error) => {
  printError(`Setup failed with error: ${error.message}`);
  console.error(error);
  process.exit(1);
});