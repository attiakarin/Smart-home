import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testCatalogAPI() {
  try {
    console.log('Test de l\'API GET /catalog...\n');
    
    // Test 1: Récupérer tous les éléments du catalogue
    const allRes = await pool.query('SELECT id, nom, marque, feature FROM catalogue_visiteur ORDER BY id');
    console.log(`✓ Total d'éléments dans le catalogue: ${allRes.rows.length}`);
    console.log('Éléments:');
    allRes.rows.forEach(row => {
      console.log(`  - ID ${row.id}: ${row.nom} (${row.marque}) - ${row.feature}`);
    });

    // Test 2: Test des filtres
    console.log('\n\nTest des filtres:');
    const typesRes = await pool.query('SELECT DISTINCT type_obj FROM catalogue_visiteur');
    console.log(`Types disponibles: ${typesRes.rows.map(r => r.type_obj).join(', ')}`);

    const brandsRes = await pool.query('SELECT DISTINCT marque FROM catalogue_visiteur ORDER BY marque');
    console.log(`Marques disponibles: ${brandsRes.rows.map(r => r.marque).join(', ')}`);

    const connectRes = await pool.query('SELECT DISTINCT type_connexion FROM catalogue_visiteur');
    console.log(`Connectivités: ${connectRes.rows.map(r => r.type_connexion).join(', ')}`);

    // Test 3: Vérifier les features
    const featuresRes = await pool.query('SELECT DISTINCT feature FROM catalogue_visiteur');
    console.log(`Catégories: ${featuresRes.rows.map(r => r.feature).filter(f => f).join(', ')}`);

    // Test 4: Vérifier les photos
    console.log('\n\nVérification des photos:');
    const photosRes = await pool.query('SELECT nom, photo FROM catalogue_visiteur WHERE photo IS NOT NULL');
    console.log(`Éléments avec photos: ${photosRes.rows.length}/12`);

    // Test 5: Vérifier objets table
    console.log('\n\nVérification de la table objets:');
    const objetsRes = await pool.query('SELECT COUNT(*) FROM objets WHERE user_id IS NULL');
    console.log(`Éléments publics dans objets (user_id IS NULL): ${objetsRes.rows[0].count} ✓`);

  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await pool.end();
  }
}

testCatalogAPI();
