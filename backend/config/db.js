import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL est manquant dans backend/.env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
});

export async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    await pool.query('ALTER TABLE objets ADD COLUMN IF NOT EXISTS photo TEXT');
    console.log('PostgreSQL/Supabase connecte avec succes');
  } catch (err) {
    console.error('Erreur connexion PostgreSQL/Supabase :', err.message);
    process.exit(1);
  }
}

export default pool;
