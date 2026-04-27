import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// ─── GET /api/public/categories ────────────────────────────────────────────
// Retourne les catégories d'objets disponibles
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT id, nom, description, icone FROM categorie_objets ORDER BY nom'
    );
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/public/services ─────────────────────────────────────────────
// Retourne les services disponibles
router.get('/services', async (req, res) => {
  try {
    const { minLevel } = req.query;
    const levelToDb = {
      'Débutant': 'débutant',
      'Intermédiaire': 'intermédiaire',
      'Avancé': 'avancé',
      'Expert': 'expert',
    };
    let sql = 'SELECT id, name, description, service_type, min_niveau FROM services WHERE 1=1';
    const vals = [];

    if (minLevel) {
      sql += ' AND min_niveau = ?';
      vals.push(levelToDb[minLevel] || String(minLevel).toLowerCase());
    }

    sql += ' ORDER BY name';
    const [services] = await pool.query(sql, vals);
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/public/pieces ───────────────────────────────────────────────
// Retourne les pièces de la maison (publique)
router.get('/pieces', async (req, res) => {
  try {
    const [pieces] = await pool.query(
      'SELECT id, nom, description FROM piece_maison ORDER BY nom'
    );
    res.json(pieces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
