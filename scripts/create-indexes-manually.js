/**
 * Manual Index Creation Script
 * 
 * This script creates all indexes defined in the Prisma schema directly in the database.
 * Use this if migrations aren't creating indexes (e.g., due to connection pooling issues).
 * 
 * Run: node scripts/create-indexes-manually.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Get direct connection URL (without pgbouncer for index creation)
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL?.replace('?pgbouncer=true', '');

if (!directUrl) {
  console.error('❌ DIRECT_URL not configured. Indexes need a direct connection (not pooled).');
  console.error('Add DIRECT_URL to .env with your Supabase direct connection string');
  console.error('Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
  process.exit(1);
}

// Create Prisma client with direct URL for index operations
const directPrisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

/**
 * Extract index definitions from Prisma schema
 * First pass: collect model -> table name mappings
 * Second pass: extract indexes with correct table names
 */
function extractIndexes() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  // First pass: collect model -> table name mappings
  const modelToTable = new Map();
  const lines = schemaContent.split('\n');
  let currentModel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect model
    if (line.startsWith('model ')) {
      currentModel = line.replace('model ', '').split(' ')[0];
      // Default: pluralize model name (e.g., User -> users, AuditLog -> audit_logs -> audit_log)
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
              const fieldName = f.split('(')[0].trim();
              return fieldName;
            }
            return f;
          })
          .map(f => {
            // Convert camelCase to snake_case for column names
            // Handle field names like userId -> user_id, createdAt -> created_at
            return f.replace(/([A-Z])/g, '_$1').toLowerCase();
          });
        
        // Generate index name
        const indexName = `${tableName}_${fields.join('_')}_idx`;
        
        indexes.push({
          model: currentModel,
          table: tableName,
          fields: fields,
          indexName: indexName.replace(/__+/g, '_').replace(/^_+/, '').replace(/_+$/, ''),
          line: i + 1,
        });
      }
    }
  }
  
  return indexes;
}

/**
 * Get actual column names from schema (handles @map directives)
 */
function getColumnName(fieldName, model, schemaContent) {
  // For now, use simple camelCase to snake_case conversion
  // This could be improved by parsing @map directives
  return fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Create index in database
 */
async function createIndex(index) {
  try {
    // Build CREATE INDEX SQL
    // Quote column names to handle reserved keywords and special characters
    const columns = index.fields.map(f => {
      // Quote column names to handle reserved keywords like "order"
      const colName = f;
      return `"${colName}"`;
    }).join(', ');
    
    const sql = `CREATE INDEX IF NOT EXISTS "${index.indexName}" ON "${index.table}"(${columns});`;
    
    console.log(`Creating index: ${index.indexName} on ${index.table}(${columns})`);
    await directPrisma.$executeRawUnsafe(sql);
    console.log(`  ✅ Created successfully`);
    return { success: true, skipped: false };
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
      console.log(`  ⚠️  Index ${index.indexName} already exists`);
      return { success: true, skipped: true };
    }
    console.error(`  ❌ Failed to create index ${index.indexName}:`, error.message);
    return { success: false, skipped: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('============================================================');
  console.log('  Manual Index Creation');
  console.log('============================================================\n');
  
  console.log('📋 Extracting indexes from schema...');
  const indexes = extractIndexes();
  console.log(`✅ Found ${indexes.length} indexes in schema\n`);
  
  console.log('🔗 Connecting to database...');
  try {
    await directPrisma.$connect();
    console.log('✅ Connected to database\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('Make sure DIRECT_URL is set correctly in .env');
    process.exit(1);
  }
  
  console.log('📝 Creating indexes...\n');
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];
  
  for (const index of indexes) {
    const result = await createIndex(index);
    if (result.success) {
      if (result.skipped) {
        skipped++;
      } else {
        created++;
      }
    } else {
      failed++;
      failures.push({ index: index.indexName, error: result.error });
    }
  }
  
  console.log('\n============================================================');
  console.log('  Summary');
  console.log('============================================================');
  console.log(`✅ Created: ${created}`);
  console.log(`⚠️  Skipped (already exist): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${indexes.length}\n`);
  
  if (failures.length > 0) {
    console.log('⚠️  Failed indexes:');
    failures.forEach(f => console.log(`  - ${f.index}: ${f.error}`));
    console.log('');
  }
  
  await directPrisma.$disconnect();
  
  if (failed > 0) {
    console.log('⚠️  Some indexes failed to create. This might be because:');
    console.log('  1. Tables don\'t exist yet (run migrations first)');
    console.log('  2. Column names don\'t match (check @map directives)');
    console.log('  3. Reserved keywords need quoting (already handled)');
    console.log('');
    console.log('Run "npm run verify-indexes" to see which indexes are missing.');
    process.exit(1);
  }
  
  console.log('✅ Index creation complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify indexes: npm run verify-indexes');
  console.log('  2. Start server: npm start');
  console.log('  3. Run tests: npm run test:e2e-sync');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
