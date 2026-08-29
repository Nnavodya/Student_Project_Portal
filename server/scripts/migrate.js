const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// SECURITY FIX: TLS certificate validation is now ON by default
// (rejectUnauthorized: true). It can only be disabled by explicitly setting
// DB_REJECT_UNAUTHORIZED=false in .env — never hardcoded off. Disabling
// validation unconditionally exposes DB connections to MITM attacks.
const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'false' ? false : true } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
const pool = new Pool(poolConfig);

async function run() {
  try {
    // 1. Add the is_private column if it doesn't exist
    await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;');
    console.log('Ensured is_private column exists in notifications table.');

    // 2. Drop the old type check constraint
    await pool.query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;');
    
    // 3. Add the new comprehensive type check constraint
    await pool.query("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('like', 'follow', 'project_created', 'comment', 'user_registered', 'admin_action', 'admin_edit', 'admin_delete', 'admin_hide', 'admin_removal'));");
    console.log('Successfully updated notifications_type_check constraint with all types.');
    
  } catch (err) {
    console.error('Error during migration:', err.message);
  } finally {
    pool.end();
  }
}

run();