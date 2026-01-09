import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Query helper with proper typing
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
  return result;
}

// Get a client from the pool for transactions
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Initialize database - run migrations
export async function initializeDatabase(): Promise<void> {
  console.log('Initializing database...');

  // Create leads table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      project_address TEXT,
      budget_range VARCHAR(50) NOT NULL,
      timeline VARCHAR(50) NOT NULL,
      project_type VARCHAR(50) NOT NULL,
      has_survey BOOLEAN DEFAULT FALSE,
      has_drawings BOOLEAN DEFAULT FALSE,
      project_description TEXT,
      recommended_tier INTEGER NOT NULL CHECK (recommended_tier BETWEEN 1 AND 4),
      tier_reason TEXT,
      tier_confidence VARCHAR(20),
      needs_manual_review BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'new',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index on email for faster lookups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)
  `);

  // Create index on status for filtering
  await query(`
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)
  `);

  console.log('Database initialized successfully');
}

export default pool;
