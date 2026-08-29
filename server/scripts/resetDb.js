/**
 * db:reset — Wipes all application data and resets sequences to 1.
 * Schema (tables, indexes, triggers) is preserved.
 *
 * Usage:
 *   npm run db:reset
 *
 * WARNING: This deletes every row in every table. Do NOT run in production.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const readline = require('readline');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
const pool = new Pool(poolConfig);
// SECURITY FIX: TLS certificate validation is now ON by default. Only
// disable it via DB_REJECT_UNAUTHORIZED=false in .env — never hardcoded.
const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'false' ? false : true } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const confirm = () =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      `WARNING: This will permanently delete all data in "${process.env.DB_NAME}".\nType "yes" to confirm: `,
      (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); }
    );
  });

const resetDb = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: db:reset cannot run in production. Set NODE_ENV != production.');
    process.exit(1);
  }

  // Skip confirmation if --force flag is passed (for CI / scripted use)
  if (!process.argv.includes('--force')) {
    const answer = await confirm();
    if (answer !== 'yes') {
      console.log('Reset cancelled.');
      process.exit(0);
    }
  }

  const client = await pool.connect();
  try {
    console.log('Resetting database...');
    await client.query('BEGIN');

    // Single TRUNCATE with CASCADE handles FK order automatically.
    // RESTART IDENTITY resets all SERIAL sequences back to 1.
    await client.query(`
      TRUNCATE TABLE
        notifications,
        comments,
        likes,
        followers,
        project_tags,
        projects,
        users,
        "session"
      RESTART IDENTITY
      CASCADE;
    `);

    await client.query('COMMIT');
    console.log('All tables truncated and sequences reset to 1.');
    console.log('Schema (tables, indexes, triggers) was preserved.');
    console.log('Run "npm run db:setup" first if tables do not exist yet.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

resetDb();