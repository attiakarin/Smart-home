import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

const LEVEL_TO_DB = {
  Débutant: 'débutant',
  Intermédiaire: 'intermédiaire',
  Avancé: 'avancé',
  Expert: 'expert',
};

function inferFeature(type = '') {
  const normalized = type.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (['camera', 'securite', 'detecteur', 'serrure'].some(word => normalized.includes(word))) return 'sécurité';
  if (['thermostat', 'eclairage', 'lumiere', 'volet'].some(word => normalized.includes(word))) return 'confort';
  if (['energie', 'prise', 'compteur', 'solaire'].some(word => normalized.includes(word))) return 'énergie';
  if (['capteur'].some(word => normalized.includes(word))) return 'suivi';
  return 'automatisation';
}

function catalogDescription(type, feature) {
  const descriptions = {
    sécurité: 'Surveille les accès, détecte les mouvements ou renforce la protection du logement.',
    confort: 'Améliore le confort quotidien avec des réglages pilotables depuis la plateforme.',
    énergie: 'Aide à suivre, réduire ou automatiser la consommation énergétique.',
    suivi: 'Mesure les informations utiles de la maison pour mieux comprendre son environnement.',
    automatisation: 'Permet de déclencher des scénarios et routines selon les besoins de la maison.',
  };
  return descriptions[feature] || `Objet connecté de type ${type}, compatible avec la gestion centralisée de la maison.`;
}

router.get('/catalog', async (req, res) => {
  try {
    const { q, type, brand, feature, connectivity } = req.query;
    const values = [];
    const where = [];

    function addCondition(condition, value) {
      values.push(value);
      where.push(condition.replace('?', `$${values.length}`));
    }

    if (q) {
      values.push(`%${q}%`);
      const index = values.length;
      where.push(`(nom ILIKE $${index} OR type_obj ILIKE $${index} OR marque ILIKE $${index} OR description ILIKE $${index})`);
    }
    if (type) addCondition('type_obj = ?', type);
    if (brand) addCondition('marque = ?', brand);
    if (connectivity) addCondition('type_connexion = ?', connectivity);

    const sql = `
      SELECT
        MIN(id) AS id,
        type_obj,
        marque,
        type_connexion,
        COUNT(*)::int AS example_count,
        MIN(description) AS description
      FROM objets
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY type_obj, marque, type_connexion
      ORDER BY type_obj, marque
    `;

    const { rows } = await pool.query(sql, values);
    const catalog = rows
      .map(row => {
        const itemFeature = inferFeature(row.type_obj);
        return {
          id: `${row.type_obj}-${row.marque || 'generique'}-${row.type_connexion || 'standard'}`,
          name: `${row.type_obj} ${row.marque || ''}`.trim(),
          type: row.type_obj,
          brand: row.marque || 'Générique',
          connectivity: row.type_connexion || 'Non précisée',
          feature: itemFeature,
          description: row.description || catalogDescription(row.type_obj, itemFeature),
          exampleCount: row.example_count,
        };
      })
      .filter(item => !feature || item.feature === feature);

    res.json(catalog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/catalog/filters', async (_req, res) => {
  try {
    const [types, brands, connectivities] = await Promise.all([
      pool.query('SELECT DISTINCT type_obj AS value FROM objets WHERE type_obj IS NOT NULL ORDER BY type_obj'),
      pool.query('SELECT DISTINCT marque AS value FROM objets WHERE marque IS NOT NULL ORDER BY marque'),
      pool.query('SELECT DISTINCT type_connexion AS value FROM objets WHERE type_connexion IS NOT NULL ORDER BY type_connexion'),
    ]);

    res.json({
      types: types.rows.map(row => row.value),
      brands: brands.rows.map(row => row.value),
      connectivities: connectivities.rows.map(row => row.value),
      features: ['sécurité', 'confort', 'énergie', 'suivi', 'automatisation'],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, description, icone FROM categorie_objets ORDER BY nom'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const { minLevel, q, category } = req.query;
    const values = [];
    const where = [];

    function addCondition(condition, value) {
      values.push(value);
      where.push(condition.replace('?', `$${values.length}`));
    }

    if (minLevel) addCondition('services.min_niveau = ?', LEVEL_TO_DB[minLevel] || String(minLevel).toLowerCase());
    if (category) addCondition('services.service_type = ?', category);
    if (q) {
      values.push(`%${q}%`);
      const index = values.length;
      where.push(`(services.name ILIKE $${index} OR services.description ILIKE $${index} OR services.service_type ILIKE $${index})`);
    }

    const { rows } = await pool.query(
      `SELECT services.id, services.name, services.description, services.service_type, services.min_niveau,
              categorie_objets.nom AS categorie_nom
       FROM services
       LEFT JOIN categorie_objets ON categorie_objets.id = services.objet_categorie_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY services.name`,
      values
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/pieces', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, description FROM piece_maison ORDER BY nom'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
