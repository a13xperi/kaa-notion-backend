#!/usr/bin/env node
/**
 * Database Index Verification Script
 * 
 * Verifies that all indexes defined in the Prisma schema are actually
 * created in the database. This should be run after migrations are applied.
 * 
 * Usage:
 *   node scripts/verifyDatabaseIndexes.js
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

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

/**
 * Extract index definitions from Prisma schema
 * First pass: collect model -> table name mappings from @@map
 * Second pass: extract indexes with correct table names
 */
function extractSchemaIndexes() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  // First pass: collect model -> table name mappings from @@map
  const modelToTable = new Map();
  const lines = schemaContent.split('\n');
  let currentModel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect model
    if (line.startsWith('model ')) {
      currentModel = line.replace('model ', '').split(' ')[0];
      // Default: convert model name to snake_case table name
      const defaultTable = currentModel
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '') + 's';
      modelToTable.set(currentModel, defaultTable);
      continue;
    }
    
    // Detect @@map to get actual table name (overrides default)
    if (line.includes('@@map(')) {
      const mapMatch = line.match(/@@map\("([^"]+)"/);
      if (mapMatch && currentModel) {
        modelToTable.set(currentModel, mapMatch[1]);
      }
    }
  }
  
  // Second pass: extract indexes with correct table names
  const indexes = [];
  currentModel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect model
    if (line.startsWith('model ')) {
      currentModel = line.replace('model ', '').split(' ')[0];
      continue;
    }
    
    // Detect index
    if (line.startsWith('@@index')) {
      const indexMatch = line.match(/@@index\(\[([^\]]+)\]/);
      if (indexMatch && currentModel) {
        const tableName = modelToTable.get(currentModel);
        if (!tableName) {
          console.warn(`Warning: Could not determine table name for model ${currentModel}`);
          continue;
        }
        
        const fields = indexMatch[1]
          .split(',')
          .map(f => f.trim())
          .map(f => {
            // Handle function calls like createdAt(sort: Desc)
            if (f.includes('(')) {
              return f.split('(')[0].trim();
            }
            return f;
          })
          .map(f => {
            // Convert camelCase to snake_case for column names
            // Handle field names like userId -> user_id, createdAt -> created_at
            return f.replace(/([A-Z])/g, '_$1').toLowerCase();
          });
        
        indexes.push({
          model: currentModel,
          table: tableName,
          fields: fields,
          line: i + 1,
        });
      }
    }
  }
  
  return indexes;
}

/**
 * Query database for existing indexes
 */
async function getDatabaseIndexes() {
  try {
    // Get all indexes from the database
    // This query works for PostgreSQL (Supabase)
    const result = await prisma.$queryRaw`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique
      FROM
        pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE
        n.nspname = 'public'
        AND t.relkind = 'r'
        AND NOT ix.indisprimary
      ORDER BY
        t.relname, i.relname, a.attnum
    `;
    
    // Group by table and index
    const indexMap = new Map();
    
    for (const row of result) {
      const key = `${row.table_name}_${row.index_name}`;
      if (!indexMap.has(key)) {
        indexMap.set(key, {
          table: row.table_name,
          index: row.index_name,
          columns: [],
          unique: row.is_unique,
        });
      }
      indexMap.get(key).columns.push(row.column_name);
    }
    
    return Array.from(indexMap.values());
  } catch (error) {
    console.error('Error querying database indexes:', error);
    throw error;
  }
}

/**
 * Match schema indexes to database indexes
 * Uses actual table names from @@map directives
 */
function matchIndexes(schemaIndexes, dbIndexes) {
  const results = [];
  
  for (const schemaIndex of schemaIndexes) {
    // Use table name from schema (already extracted from @@map)
    const tableName = schemaIndex.table || schemaIndex.model.toLowerCase() + 's';
    
    const matchingDbIndex = dbIndexes.find(
      dbIndex => dbIndex.table === tableName &&
        arraysEqual(dbIndex.columns.sort(), schemaIndex.fields.sort())
    );
    
    results.push({
      schema: schemaIndex,
      database: matchingDbIndex || null,
      found: !!matchingDbIndex,
    });
  }
  
  return results;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

/**
 * Main verification function
 */
async function verifyIndexes() {
  console.log('\n🔍 Verifying Database Indexes\n');
  console.log('=' .repeat(60));
  
  try {
    // Test database connection
    printInfo('Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    printSuccess('Database connection successful\n');
    
    // Extract indexes from schema
    printInfo('Extracting indexes from Prisma schema...');
    const schemaIndexes = extractSchemaIndexes();
    printSuccess(`Found ${schemaIndexes.length} indexes in schema\n`);
    
    // Get indexes from database
    printInfo('Querying database for existing indexes...');
    const dbIndexes = await getDatabaseIndexes();
    printSuccess(`Found ${dbIndexes.length} indexes in database\n`);
    
    // Match indexes
    printInfo('Matching schema indexes with database indexes...\n');
    const matches = matchIndexes(schemaIndexes, dbIndexes);
    
    // Report results
    let foundCount = 0;
    let missingCount = 0;
    
    for (const match of matches) {
      if (match.found) {
        foundCount++;
        printSuccess(
          `${match.schema.model}.${match.schema.fields.join(', ')} → ${match.database.index}`
        );
      } else {
        missingCount++;
        printError(
          `${match.schema.model}.${match.schema.fields.join(', ')} → NOT FOUND`
        );
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:\n');
    console.log(`  Total indexes in schema: ${schemaIndexes.length}`);
    console.log(`  Indexes found in database: ${foundCount}`);
    console.log(`  Missing indexes: ${missingCount}`);
    
    if (missingCount > 0) {
      console.log('\n⚠️  WARNING: Some indexes are missing from the database.');
      console.log('   Run migrations to create missing indexes:');
      console.log('   npm run prisma:migrate');
      process.exit(1);
    } else {
      console.log('\n✅ All indexes are present in the database!');
      process.exit(0);
    }
  } catch (error) {
    printError(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyIndexes().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});