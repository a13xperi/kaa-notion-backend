/**
 * Playwright Global Setup
 * Runs before all tests.
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Playwright E2E Tests Starting');
  console.log(`   Base URL: ${config.projects[0].use.baseURL}`);
  console.log(`   Projects: ${config.projects.map(p => p.name).join(', ')}`);
  
  // Add any global setup logic here
  // - Seed test database
  // - Create test users
  // - Set up test environment
}

export default globalSetup;
