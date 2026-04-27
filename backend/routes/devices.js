import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireModule } from '../middleware/auth.js';
import { mapDevice, mapDeviceInput, mapStatusToDb } from '../utils/deviceMapper.js';

const router = Router();

async function findRoomId(roomName) {
  if (!roomName) return null;
  const [rooms] = await pool.query('SELECT id FROM piece_maison WHERE nom = ? LIMIT 1', [roomName]);
  return rooms[0]?.id || null;
}

async function fetchDevice(id, maisonId) {
  const [rows] = await pool.query(
    `SELECT objets.*, piece_maison.nom AS piece_nom
     FROM objets
     LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
     WHERE objets.id = ?
       AND (objets.maison_id = ? OR ? IS NULL)`,
    [id, maisonId || null, maisonId || null]
  );
  if (!rows[0]) return null;

  const [configs] = await pool.query(
    'SELECT param_nom, param_valeur, param_type FROM config_objet WHERE objet_id = ?',
    [id]
  );
  const settings = configs.reduce((acc, item) => {
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
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE param_valeur = VALUES(param_valeur), param_type = VALUES(param_type)`,
      [deviceId, key, String(value), paramType]
    );
  }
}

router.get('/', authenticate, async (req, res) => {
  try {
    const [devices] = await pool.query(
      `SELECT objets.*, piece_maison.nom AS piece_nom
       FROM objets
       LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
       WHERE objets.maison_id = ? OR ? IS NULL
       ORDER BY objets.nom`,
      [req.user.maisonId || null, req.user.maisonId || null]
    );

    res.json(devices.map(mapDevice));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const device = await fetchDevice(req.params.id, req.user.maisonId);
    if (!device) return res.status(404).json({ error: 'Objet introuvable.' });

    const [history] = await pool.query(
      'SELECT valeur, unite, enregistre_a FROM historique_objet WHERE objt_id = ? ORDER BY enregistre_a DESC LIMIT 30',
      [req.params.id]
    );

    res.json({ ...device, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', authenticate, requireModule('gestion'), async (req, res) => {
  const input = mapDeviceInput(req.body);
  let { nom, type_obj, marque, piece_id, statut, type_connexion, signal_obj, batterie, energie_consommer, description } = input;

  if (!nom || !type_obj) return res.status(400).json({ error: 'Nom et type requis.' });

  try {
    if (!piece_id) piece_id = await findRoomId(req.body.room);
    if (!piece_id) {
      const [rooms] = await pool.query('SELECT id FROM piece_maison ORDER BY id LIMIT 1');
      piece_id = rooms[0]?.id;
    }

    const dbStatus = mapStatusToDb(statut || 'inactive');
    const [result] = await pool.query(
      `INSERT INTO objets (maison_id, nom, type_obj, marque, piece_id, statut, type_connexion, signal_obj, batterie, energie_consommer, description, date_creation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
      ]
    );

    await pool.query(
      'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES (?, ?, ?)',
      [result.insertId, dbStatus === 'Active' ? 1 : 0, 'etat']
    );
    await saveDeviceSettings(result.insertId, req.body.settings);

    const created = await fetchDevice(result.insertId, req.user.maisonId);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/:id', authenticate, requireModule('gestion'), async (req, res) => {
  const mapped = mapDeviceInput(req.body);
  const allowed = ['nom', 'type_obj', 'marque', 'piece_id', 'statut', 'type_connexion', 'signal_obj', 'batterie', 'energie_consommer', 'description'];
  const fields = [];
  const values = [];

  if (!mapped.piece_id && req.body.room) mapped.piece_id = await findRoomId(req.body.room);
  if (mapped.batterie === '') mapped.batterie = null;
  if (mapped.batterie !== undefined && mapped.batterie !== null) mapped.batterie = Number(mapped.batterie);
  if (mapped.energie_consommer !== undefined) mapped.energie_consommer = Number(mapped.energie_consommer || 0);

  for (const key of allowed) {
    if (mapped[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'statut' ? mapStatusToDb(mapped[key]) : mapped[key]);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier.' });

  try {
    await pool.query(
      `UPDATE objets SET ${fields.join(', ')} WHERE id = ? AND (maison_id = ? OR ? IS NULL)`,
      [...values, req.params.id, req.user.maisonId || null, req.user.maisonId || null]
    );

    if (mapped.statut !== undefined) {
      const dbStatus = mapStatusToDb(mapped.statut);
      await pool.query(
        'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES (?, ?, ?)',
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

router.patch('/:id/toggle', authenticate, requireModule('gestion'), async (req, res) => {
  try {
    await pool.query(
      `UPDATE objets
       SET statut = IF(statut = 'Active', 'Inactive', 'Active')
       WHERE id = ? AND (maison_id = ? OR ? IS NULL)`,
      [req.params.id, req.user.maisonId || null, req.user.maisonId || null]
    );

    const updated = await fetchDevice(req.params.id, req.user.maisonId);
    if (!updated) return res.status(404).json({ error: 'Objet introuvable.' });

    await pool.query(
      'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES (?, ?, ?)',
      [req.params.id, updated.status === 'active' ? 1 : 0, 'etat']
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', authenticate, requireModule('administration'), async (req, res) => {
  try {
    await pool.query(
      `DELETE historique_objet FROM historique_objet
       INNER JOIN objets ON objets.id = historique_objet.objt_id
       WHERE objets.id = ? AND (objets.maison_id = ? OR ? IS NULL)`,
      [req.params.id, req.user.maisonId || null, req.user.maisonId || null]
    );
    await pool.query(
      'DELETE FROM objets WHERE id = ? AND (maison_id = ? OR ? IS NULL)',
      [req.params.id, req.user.maisonId || null, req.user.maisonId || null]
    );
    res.json({ message: 'Objet supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const device = await fetchDevice(req.params.id, req.user.maisonId);
    if (!device) return res.status(404).json({ error: 'Objet introuvable.' });

    const [rows] = await pool.query(
      'SELECT valeur, unite, enregistre_a FROM historique_objet WHERE objt_id = ? ORDER BY enregistre_a ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
