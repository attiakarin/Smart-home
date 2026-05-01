import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupPublicItems() {
  try {
    console.log('Suppression des éléments du catalogue public de la table objets...');
    
    // Supprimer Télé Samsung (ID 30) qui a user_id = NULL
    const deleteRes = await pool.query(
      'DELETE FROM objets WHERE id = 30 AND user_id IS NULL'
    );
    
    console.log(`✓ ${deleteRes.rowCount} élément(s) supprimé(s)`);

    // Vérifier le résultat
    const checkRes = await pool.query('SELECT COUNT(*) FROM objets WHERE user_id IS NULL');
    console.log(`Éléments publics restants dans objets: ${checkRes.rows[0].count}`);
    
    // Vérifier qu'on a bien 12 éléments dans catalogue_visiteur
    const catalogRes = await pool.query('SELECT COUNT(*) FROM catalogue_visiteur');
    console.log(`Éléments dans catalogue_visiteur: ${catalogRes.rows[0].count}`);
    
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await pool.end();
  }
}

cleanupPublicItems();
