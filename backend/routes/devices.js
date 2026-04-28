import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireModule } from '../middleware/auth.js';
import { mapDevice, mapDeviceInput, mapStatusToDb } from '../utils/deviceMapper.js';

const router = Router();

async function findRoomId(roomName) {
  if (!roomName) return null;
  const { rows } = await pool.query('SELECT id FROM piece_maison WHERE nom = $1 LIMIT 1', [roomName]);
  return rows[0]?.id || null;
}

async function fetchDevice(id, maisonId) {
  const { rows } = await pool.query(
    `SELECT objets.*, piece_maison.nom AS piece_nom
     FROM objets
     LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
     WHERE objets.id = $1
       AND (objets.maison_id = $2 OR $2 IS NULL)`,
    [id, maisonId || null]
  );
  if (!rows[0]) return null;

  const configs = await pool.query(
    'SELECT param_nom, param_valeur, param_type FROM config_objet WHERE objet_id = $1',
    [id]
  );
  const settings = configs.rows.reduce((acc, item) => {
    acc[item.param_nom] = item.param_valeur;
    return acc;
  }, {});

  return { ...mapDevice(rows[0]), settings };
}

async function saveDeviceSettings(deviceId, settings = {}) {
  const entries = Object.entries(settings).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return;

  for (const [key, value] of entries) {
    const paramType = typeof value === 'number' ? 'nombre' : typeof value === 'boolean' ? 'booléen' : 'texte';
    await pool.query(
      `INSERT INTO config_objet (objet_id, param_nom, param_valeur, param_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (objet_id, param_nom)
       DO UPDATE SET param_valeur = EXCLUDED.param_valeur, param_type = EXCLUDED.param_type`,
      [deviceId, key, String(value), paramType]
    );
  }
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT objets.*, piece_maison.nom AS piece_nom
       FROM objets
       LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
       WHERE objets.maison_id = $1 OR $1 IS NULL
       ORDER BY objets.nom`,
      [req.user.maisonId || null]
    );

    res.json(rows.map(mapDevice));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const device = await fetchDevice(req.params.id, req.user.maisonId);
    if (!device) return res.status(404).json({ error: 'Objet introuvable.' });

    const { rows } = await pool.query(
      'SELECT valeur, unite, enregistre_a FROM historique_objet WHERE objt_id = $1 ORDER BY enregistre_a DESC LIMIT 30',
      [req.params.id]
    );

    res.json({ ...device, history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', authenticate, requireModule('device_create'), async (req, res) => {
  const input = mapDeviceInput(req.body);
  let { nom, type_obj, marque, piece_id, statut, type_connexion, signal_obj, batterie, energie_consommer, description, derniere_connexion } = input;

  if (!nom || !type_obj) return res.status(400).json({ error: 'Nom et type requis.' });

  try {
    if (!piece_id) piece_id = await findRoomId(req.body.room);
    if (!piece_id) {
      const { rows } = await pool.query('SELECT id FROM piece_maison ORDER BY id LIMIT 1');
      piece_id = rows[0]?.id;
    }

    const dbStatus = mapStatusToDb(statut || 'inactive');
    const result = await pool.query(
      `INSERT INTO objets (
        maison_id, nom, type_obj, marque, piece_id, statut, type_connexion,
        signal_obj, batterie, energie_consommer, description, derniere_connexion, date_creation
      )
      VALUES ($1, $2, $3, $4, $5, $6::statut_objet_enum, $7, $8, $9, $10, $11, COALESCE($12, NOW()), NOW())
      RETURNING id`,
      [
        req.user.maisonId || null,
        nom,
        type_obj,
        marque || null,
        piece_id || null,
        dbStatus,
        type_connexion || null,
        signal_obj || null,
        batterie != null && batterie !== '' ? batterie : null,
        energie_consommer || 0,
        description || '',
        derniere_connexion || null,
      ]
    );

    const deviceId = result.rows[0].id;
    await pool.query(
      'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES ($1, $2, $3)',
      [deviceId, dbStatus === 'Active' ? 1 : 0, 'etat']
    );
    await saveDeviceSettings(deviceId, req.body.settings);

    const created = await fetchDevice(deviceId, req.user.maisonId);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/:id', authenticate, requireModule('device_config'), async (req, res) => {
  const mapped = mapDeviceInput(req.body);
  const allowed = ['nom', 'type_obj', 'marque', 'piece_id', 'statut', 'type_connexion', 'signal_obj', 'batterie', 'energie_consommer', 'description', 'derniere_connexion'];
  const fields = [];
  const values = [];

  if (!mapped.piece_id && req.body.room) mapped.piece_id = await findRoomId(req.body.room);
  if (mapped.batterie === '') mapped.batterie = null;
  if (mapped.batterie !== undefined && mapped.batterie !== null) mapped.batterie = Number(mapped.batterie);
  if (mapped.energie_consommer !== undefined) mapped.energie_consommer = Number(mapped.energie_consommer || 0);

  for (const key of allowed) {
    if (mapped[key] !== undefined) {
      values.push(key === 'statut' ? mapStatusToDb(mapped[key]) : mapped[key]);
      fields.push(key === 'statut' ? `${key} = $${values.length}::statut_objet_enum` : `${key} = $${values.length}`);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier.' });

  try {
    values.push(req.params.id, req.user.maisonId || null);
    await pool.query(
      `UPDATE objets SET ${fields.join(', ')}
       WHERE id = $${values.length - 1} AND (maison_id = $${values.length} OR $${values.length} IS NULL)`,
      values
    );

    if (mapped.statut !== undefined) {
      const dbStatus = mapStatusToDb(mapped.statut);
      await pool.query(
        'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES ($1, $2, $3)',
        [req.params.id, dbStatus === 'Active' ? 1 : 0, 'etat']
      );
    }
    await saveDeviceSettings(req.params.id, req.body.settings);

    const updated = await fetchDevice(req.params.id, req.user.maisonId);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.patch('/:id/toggle', authenticate, requireModule('device_toggle'), async (req, res) => {
  try {
    await pool.query(
      `UPDATE objets
       SET statut = (
         CASE WHEN statut = 'Active'::statut_objet_enum
         THEN 'Inactive'
         ELSE 'Active'
         END
       )::statut_objet_enum
       WHERE id = $1 AND (maison_id = $2 OR $2 IS NULL)`,
      [req.params.id, req.user.maisonId || null]
    );

    const updated = await fetchDevice(req.params.id, req.user.maisonId);
    if (!updated) return res.status(404).json({ error: 'Objet introuvable.' });

    await pool.query(
      'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES ($1, $2, $3)',
      [req.params.id, updated.status === 'active' ? 1 : 0, 'etat']
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', authenticate, requireModule('device_delete'), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM historique_objet
       USING objets
       WHERE objets.id = historique_objet.objt_id
         AND objets.id = $1
         AND (objets.maison_id = $2 OR $2 IS NULL)`,
      [req.params.id, req.user.maisonId || null]
    );
    await pool.query(
      'DELETE FROM objets WHERE id = $1 AND (maison_id = $2 OR $2 IS NULL)',
      [req.params.id, req.user.maisonId || null]
    );
    res.json({ message: 'Objet supprime.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const device = await fetchDevice(req.params.id, req.user.maisonId);
    if (!device) return res.status(404).json({ error: 'Objet introuvable.' });

    const { rows } = await pool.query(
      'SELECT valeur, unite, enregistre_a FROM historique_objet WHERE objt_id = $1 ORDER BY enregistre_a ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
