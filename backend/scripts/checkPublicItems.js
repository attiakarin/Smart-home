import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPublicItems() {
  try {
    console.log('Recherche d\'éléments du catalogue public dans la table objets...');
    const res = await pool.query(
      "SELECT id, nom, user_id FROM objets WHERE user_id IS NULL OR user_id IS NOT NULL LIMIT 20"
    );
    
    if (res.rows.length > 0) {
      console.log('\nEléments trouvés avec user_id = NULL ou valeurs publiques:');
      res.rows.forEach(row => {
        console.log(`  ID: ${row.id}, Nom: ${row.nom}, User ID: ${row.user_id}`);
      });
    } else {
      console.log('Aucun élément trouvé.');
    }

    // Afficher le total
    const countRes = await pool.query('SELECT COUNT(*) FROM objets WHERE user_id IS NULL');
    console.log(`\nTotal d'éléments avec user_id = NULL: ${countRes.rows[0].count}`);
    
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await pool.end();
  }
}

checkPublicItems();
