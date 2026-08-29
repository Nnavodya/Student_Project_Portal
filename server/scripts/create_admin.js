require('node:dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'false' ? false : true },
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);
const bcrypt = require('bcryptjs');

async function addAdmin(email, rawPassword) {
  const query = `
    INSERT INTO users (name, email, role, admin_verified, password) 
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO UPDATE 
    SET password = EXCLUDED.password, 
        role = EXCLUDED.role, 
        admin_verified = EXCLUDED.admin_verified,
        name = EXCLUDED.name;
  `;

  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const values = [
      'Admin User', // name
      email,
      'admin',      // role
      true,         // admin_verified
      hashedPassword
    ];
    
    await pool.query(query, values);
    console.log(`✅ Admin user '${email}' inserted/updated successfully in Neon Database!`);
    console.log(`🔑 You can now login locally using:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${rawPassword}`);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await pool.end();
  }
}

const email = process.argv[2] || process.env.ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Usage: node create_admin.js <email> <password>');
  console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  process.exit(1);
}

addAdmin(email, password);
