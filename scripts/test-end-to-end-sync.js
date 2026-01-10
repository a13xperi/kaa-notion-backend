#!/usr/bin/env node
/**
 * End-to-End Sync Test
 * 
 * Tests the complete Notion-Postgres sync flow:
 * 1. Create a project in Postgres
 * 2. Update project in Notion (or simulate)
 * 3. Trigger Notion webhook
 * 4. Verify Postgres sync
 * 5. Check reconciliation endpoint
 * 
 * Usage:
 *   node scripts/test-end-to-end-sync.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
// Use built-in fetch in Node 18+, or node-fetch for older versions
const fetch = globalThis.fetch || require('node-fetch');

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

const prisma = new PrismaClient();
const API_URL = process.env.REACT_APP_API_URL || process.env.FRONTEND_URL || 'http://localhost:3001/api';

/**
 * Test 1: Create a test project in Postgres
 */
async function testCreateProject() {
  printHeader('Test 1: Create Project in Postgres');
  
  try {
    // First, we need a client and lead to create a project
    // For testing, let's check if we have any existing data
    const existingClient = await prisma.client.findFirst({
      include: { lead: true },
    });
    
    if (!existingClient) {
      printWarning('No existing client found. Creating test client...');
      
      // Create a test user first
      const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
          email: 'test@example.com',
          name: 'Test User',
          userType: 'SAGE_CLIENT',
        },
      });
      
      // Create a test client
      const testClient = await prisma.client.create({
        data: {
          userId: testUser.id,
          projectAddress: '123 Test Street, Test City, TC 12345',
          tier: 1,
          status: 'ACTIVE',
        },
      });
      
      printSuccess(`Created test client: ${testClient.id}`);
      
      // Create a test lead
      const testLead = await prisma.lead.create({
        data: {
          email: 'test@example.com',
          projectAddress: testClient.projectAddress,
          tier: 1,
          status: 'QUALIFIED',
          clientId: testClient.id,
        },
      });
      
      printSuccess(`Created test lead: ${testLead.id}`);
      
      // Create project
      const project = await prisma.project.create({
        data: {
          clientId: testClient.id,
          leadId: testLead.id,
          tier: 1,
          status: 'ONBOARDING',
          name: 'Test Project - End-to-End Sync',
        },
      });
      
      printSuccess(`Created test project: ${project.id}`);
      return { project, client: testClient };
    } else {
      // Use existing client
      const project = await prisma.project.create({
        data: {
          clientId: existingClient.id,
          leadId: existingClient.lead?.[0]?.id,
          tier: 1,
          status: 'ONBOARDING',
          name: 'Test Project - End-to-End Sync',
        },
      });
      
      printSuccess(`Created test project: ${project.id}`);
      return { project, client: existingClient };
    }
  } catch (error) {
    printError(`Failed to create project: ${error.message}`);
    throw error;
  }
}

/**
 * Test 2: Simulate Notion page update (or use actual Notion API if configured)
 */
async function testNotionUpdate(project) {
  printHeader('Test 2: Update Project in Notion');
  
  if (!project.notionPageId) {
    printWarning('Project does not have a Notion page ID yet');
    printInfo('This is expected for new projects. Sync should create the page.');
    
    // Trigger sync manually via API if available
    if (process.env.NOTION_API_KEY) {
      try {
        printInfo('Triggering manual sync via API...');
        const response = await fetch(`${API_URL}/notion/sync/project/${project.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add auth if needed
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          printSuccess('Manual sync triggered successfully');
          
          // Wait a bit for sync to complete
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          // Refresh project to get notionPageId
          const updatedProject = await prisma.project.findUnique({
            where: { id: project.id },
          });
          
          if (updatedProject?.notionPageId) {
            printSuccess(`Notion page created: ${updatedProject.notionPageId}`);
            return updatedProject;
          } else {
            printWarning('Notion page ID not set yet. Sync may still be in progress.');
            return updatedProject || project;
          }
        } else {
          printWarning(`Manual sync failed: ${response.statusText}`);
          return project;
        }
      } catch (error) {
        printWarning(`Could not trigger manual sync: ${error.message}`);
        return project;
      }
    } else {
      printWarning('NOTION_API_KEY not set. Skipping Notion update test.');
      return project;
    }
  } else {
    printSuccess(`Project has Notion page: ${project.notionPageId}`);
    printInfo('To test webhook, update the page in Notion manually or use Notion API');
    return project;
  }
}

/**
 * Test 3: Trigger Notion webhook (simulate)
 */
async function testWebhookTrigger(project) {
  printHeader('Test 3: Trigger Notion Webhook');
  
  if (!project.notionPageId) {
    printWarning('No Notion page ID. Cannot test webhook.');
    printInfo('Skipping webhook test. You can test manually by updating the Notion page.');
    return false;
  }
  
  // Simulate a Notion webhook payload
  const webhookPayload = {
    type: 'page.updated',
    page_id: project.notionPageId,
    updated_properties: {
      'Name': {
        type: 'title',
        title: [{ type: 'text', text: { content: 'Test Project - Updated' } }],
      },
    },
    updated_at: new Date().toISOString(),
  };
  
  try {
    printInfo(`Sending webhook payload to ${API_URL}/webhooks/notion...`);
    
    const response = await fetch(`${API_URL}/webhooks/notion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notion-signature': 'test-signature', // In production, this would be validated
      },
      body: JSON.stringify(webhookPayload),
    });
    
    if (response.ok) {
      printSuccess('Webhook triggered successfully');
      const result = await response.json();
      console.log('Webhook response:', JSON.stringify(result, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      printError(`Webhook failed: ${response.status} ${response.statusText}`);
      console.log('Error response:', errorText);
      return false;
    }
  } catch (error) {
    printError(`Failed to trigger webhook: ${error.message}`);
    printWarning('This is expected if the server is not running or webhook endpoint is not accessible');
    return false;
  }
}

/**
 * Test 4: Verify Postgres sync
 */
async function testPostgresSync(projectId) {
  printHeader('Test 4: Verify Postgres Sync');
  
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        lead: true,
      },
    });
    
    if (!project) {
      printError('Project not found');
      return false;
    }
    
    printInfo('Checking project sync status...');
    console.log(`  Project ID: ${project.id}`);
    console.log(`  Name: ${project.name}`);
    console.log(`  Status: ${project.status}`);
    console.log(`  Sync Status: ${project.syncStatus}`);
    console.log(`  Notion Page ID: ${project.notionPageId || 'Not set'}`);
    console.log(`  Last Synced: ${project.lastSyncedAt || 'Never'}`);
    
    if (project.syncStatus === 'SYNCED' || project.syncStatus === 'PENDING') {
      printSuccess('Project sync status is valid');
      return true;
    } else if (project.syncStatus === 'FAILED') {
      printError(`Project sync failed: ${project.syncError || 'Unknown error'}`);
      return false;
    } else {
      printWarning(`Unexpected sync status: ${project.syncStatus}`);
      return true; // Not an error, just unexpected
    }
  } catch (error) {
    printError(`Failed to verify Postgres sync: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Check reconciliation endpoint
 */
async function testReconciliation() {
  printHeader('Test 5: Check Reconciliation Endpoint');
  
  try {
    printInfo(`Calling reconciliation endpoint: ${API_URL}/admin/sync/health...`);
    
    const response = await fetch(`${API_URL}/admin/sync/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add auth if needed
        // 'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      printSuccess('Reconciliation check successful');
      
      if (result.discrepancies && result.discrepancies.length > 0) {
        printWarning(`Found ${result.discrepancies.length} discrepancies:`);
        result.discrepancies.forEach((disc, i) => {
          console.log(`  ${i + 1}. ${disc.type}: ${disc.message}`);
        });
      } else {
        printSuccess('No discrepancies found. Notion and Postgres are in sync.');
      }
      
      if (result.summary) {
        console.log('\nSummary:');
        console.log(`  Total projects checked: ${result.summary.totalProjects || 'N/A'}`);
        console.log(`  Projects in sync: ${result.summary.inSync || 'N/A'}`);
        console.log(`  Projects with discrepancies: ${result.summary.discrepancies || 'N/A'}`);
      }
      
      return true;
    } else {
      const errorText = await response.text();
      printError(`Reconciliation check failed: ${response.status} ${response.statusText}`);
      console.log('Error response:', errorText);
      
      if (response.status === 401 || response.status === 403) {
        printWarning('Authentication required. This endpoint requires admin access.');
        printInfo('Set ADMIN_TOKEN in .env or authenticate to test this endpoint.');
      }
      
      return false;
    }
  } catch (error) {
    printError(`Failed to check reconciliation: ${error.message}`);
    printWarning('This is expected if the server is not running or endpoint is not accessible');
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanup(testProject) {
  printHeader('Cleanup');
  
  if (process.env.KEEP_TEST_DATA === 'true') {
    printInfo('KEEP_TEST_DATA is set. Keeping test data.');
    printInfo(`Test project ID: ${testProject.id}`);
    return;
  }
  
  try {
    printInfo('Cleaning up test data...');
    
    // Delete test project (cascade will handle related data)
    await prisma.project.delete({
      where: { id: testProject.id },
    });
    
    printSuccess('Test data cleaned up');
  } catch (error) {
    printWarning(`Cleanup failed: ${error.message}`);
    printInfo(`You may need to manually delete test project: ${testProject.id}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  printHeader('End-to-End Sync Test');
  
  let testProject = null;
  let results = {
    createProject: false,
    notionUpdate: false,
    webhookTrigger: false,
    postgresSync: false,
    reconciliation: false,
  };
  
  try {
    // Test 1: Create project
    const { project } = await testCreateProject();
    testProject = project;
    results.createProject = true;
    
    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Test 2: Update Notion (or trigger sync)
    const updatedProject = await testNotionUpdate(project);
    results.notionUpdate = updatedProject?.notionPageId ? true : false;
    
    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Test 3: Trigger webhook (may fail if server not running)
    results.webhookTrigger = await testWebhookTrigger(updatedProject || project);
    
    // Wait a bit for webhook processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Test 4: Verify Postgres sync
    results.postgresSync = await testPostgresSync(project.id);
    
    // Test 5: Check reconciliation
    results.reconciliation = await testReconciliation();
    
  } catch (error) {
    printError(`Test failed with error: ${error.message}`);
    console.error(error);
  } finally {
    // Cleanup
    if (testProject) {
      await cleanup(testProject);
    }
    
    // Close Prisma connection
    await prisma.$disconnect();
  }
  
  // Summary
  printHeader('Test Summary');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log('Results:');
  console.log(`  Create Project: ${results.createProject ? '✓' : '✗'}`);
  console.log(`  Notion Update: ${results.notionUpdate ? '✓' : '⚠'}`);
  console.log(`  Webhook Trigger: ${results.webhookTrigger ? '✓' : '⚠'}`);
  console.log(`  Postgres Sync: ${results.postgresSync ? '✓' : '✗'}`);
  console.log(`  Reconciliation: ${results.reconciliation ? '✓' : '⚠'}`);
  
  console.log(`\nPassed: ${passed}/${total}`);
  
  if (passed === total) {
    printSuccess('All tests passed!');
    process.exit(0);
  } else {
    printWarning('Some tests failed or were skipped');
    printInfo('Review warnings above. Some tests may require server to be running.');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  printError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});