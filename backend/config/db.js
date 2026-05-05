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
    await pool.query('ALTER TABLE objets ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL');

    // Table des règles d'automatisation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automatisation_regles (
        id                   SERIAL PRIMARY KEY,
        objet_id             INT NOT NULL REFERENCES objets(id) ON DELETE CASCADE,
        maison_id            INT REFERENCES maisons(id) ON DELETE CASCADE,
        heure_declenchement  TIME NOT NULL,
        action               TEXT NOT NULL CHECK (action IN ('activer', 'desactiver')),
        jours_actifs         TEXT NOT NULL DEFAULT 'lun,mar,mer,jeu,ven',
        active               BOOLEAN NOT NULL DEFAULT true,
        cree_le              TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('PostgreSQL/Supabase connecte avec succes');
  } catch (err) {
    console.error('Erreur connexion PostgreSQL/Supabase :', err.message);
    process.exit(1);
  }
}

export default pool;
