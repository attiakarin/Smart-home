import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireModule } from '../middleware/auth.js';
import { mapDevice, mapDeviceInput, mapStatusToDb } from '../utils/deviceMapper.js';
import { computeConsumption, getTopConsumer, saveMonthlyConsumption, getConfig } from './house.js';

const router = Router();

function normalizePhoto(photo) {
  if (photo === undefined) return undefined;
  if (photo === null || photo === '') return null;
  if (typeof photo !== 'string' || !photo.startsWith('data:image/')) {
    const error = new Error('La photo doit etre une image.');
    error.status = 400;
    throw error;
  }
  if (Buffer.byteLength(photo, 'utf8') > 1_000_000) {
    const error = new Error('La photo doit faire moins de 1 Mo.');
    error.status = 400;
    throw error;
  }
  return photo;
}

async function findRoomId(roomName) {
  if (!roomName) return null;
  const normalizedRoom = String(roomName).trim();
  if (!normalizedRoom) return null;
  const { rows } = await pool.query('SELECT id FROM piece_maison WHERE LOWER(nom) = LOWER($1) LIMIT 1', [normalizedRoom]);
  if (rows[0]?.id) return rows[0].id;
  const created = await pool.query(
    'INSERT INTO piece_maison (nom, description) VALUES ($1, $2) RETURNING id',
    [normalizedRoom, `Piece configuree pour une maison connectee.`]
  );
  return created.rows[0]?.id || null;
}

async function fetchDevice(id, user) {
  const { rows } = await pool.query(
    `SELECT objets.*, piece_maison.nom AS piece_nom
     FROM objets
     LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
     WHERE objets.id = $1
       AND (objets.maison_id = $2 OR $2 IS NULL)`,
    [id, user?.maisonId || null]
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

  const hist = await pool.query(
    'SELECT valeur, unite, enregistre_a, description FROM historique_objet WHERE objt_id = $1 ORDER BY enregistre_a ASC LIMIT 30',
    [id]
  );
  const history = hist.rows.map(r => ({
    value: Number(r.valeur),
    unit: r.unite,
    date: r.enregistre_a,
    description: r.description || null,
  }));

  return { ...mapDevice(rows[0]), settings, history };
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
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur.' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const device = await fetchDevice(req.params.id, req.user);
    if (!device) return res.status(404).json({ error: 'Objet introuvable.' });

    const { rows: histRows } = await pool.query(
      'SELECT valeur, unite, enregistre_a, description FROM historique_objet WHERE objt_id = $1 ORDER BY enregistre_a ASC LIMIT 30',
      [req.params.id]
    );
    const history = histRows.map(r => ({
      value: Number(r.valeur),
      unit: r.unite,
      date: r.enregistre_a,
      description: r.description || null,
    }));

    res.json({ ...device, history });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur.' });
  }
});

router.post('/', authenticate, requireModule('device_create'), async (req, res) => {
  const input = mapDeviceInput(req.body);
  let { nom, type_obj, marque, piece_id, statut, type_connexion, signal_obj, batterie, energie_consommer, description, photo, derniere_connexion } = input;

  if (!nom || !type_obj) return res.status(400).json({ error: 'Nom et type requis.' });

  try {
    if (!piece_id) piece_id = await findRoomId(req.body.room);
    if (!piece_id) {
      const { rows } = await pool.query('SELECT id FROM piece_maison ORDER BY id LIMIT 1');
      piece_id = rows[0]?.id;
    }
    photo = normalizePhoto(photo);

    const dbStatus = mapStatusToDb(statut || 'inactive');
    const result = await pool.query(
      `INSERT INTO objets (
        maison_id, user_id, nom, type_obj, marque, piece_id, statut, type_connexion,
        signal_obj, batterie, energie_consommer, description, photo, derniere_connexion, date_creation
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::statut_objet_enum, $8, $9, $10, $11, $12, $13, COALESCE($14, NOW()), NOW())
      RETURNING id`,
      [
        req.user.maisonId || null,
        req.user.id || null,
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
        photo || null,
        derniere_connexion || null,
      ]
    );

    const deviceId = result.rows[0].id;
    await pool.query(
      'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES ($1, $2, $3)',
      [deviceId, dbStatus === 'Active' ? 1 : 0, 'etat']
    );
    await saveDeviceSettings(deviceId, req.body.settings);

    const created = await fetchDevice(deviceId, req.user);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur.' });
  }
});

router.put('/:id', authenticate, requireModule('device_config'), async (req, res) => {
  const mapped = mapDeviceInput(req.body);
  const allowed = ['nom', 'type_obj', 'marque', 'piece_id', 'statut', 'type_connexion', 'signal_obj', 'batterie', 'energie_consommer', 'description', 'photo', 'derniere_connexion'];
  const fields = [];
  const values = [];

  if (!mapped.piece_id && req.body.room) mapped.piece_id = await findRoomId(req.body.room);
  if (mapped.batterie === '') mapped.batterie = null;
  if (mapped.batterie !== undefined && mapped.batterie !== null) mapped.batterie = Number(mapped.batterie);
  if (mapped.energie_consommer !== undefined) mapped.energie_consommer = Number(mapped.energie_consommer || 0);
  try {
    mapped.photo = normalizePhoto(mapped.photo);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  for (const key of allowed) {
    if (mapped[key] !== undefined) {
      values.push(key === 'statut' ? mapStatusToDb(mapped[key]) : mapped[key]);
      fields.push(key === 'statut' ? `${key} = $${values.length}::statut_objet_enum` : `${key} = $${values.length}`);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier.' });

  try {
    values.push(req.params.id, req.user.maisonId || null);
    const updatedRows = await pool.query(
      `UPDATE objets SET ${fields.join(', ')}
       WHERE id = $${values.length - 1} AND (maison_id = $${values.length} OR $${values.length} IS NULL)`,
      values
    );
    if (updatedRows.rowCount === 0) return res.status(404).json({ error: 'Objet introuvable.' });

    if (mapped.statut !== undefined || req.body.serviceLabel) {
      const dbStatus = mapped.statut !== undefined ? mapStatusToDb(mapped.statut) : null;
      const val = dbStatus ? (dbStatus === 'Active' ? 1 : 0) : 1;
      const description = req.body.serviceLabel || null;
      await pool.query(
        'INSERT INTO historique_objet (objt_id, valeur, unite, description) VALUES ($1, $2, $3, $4)',
        [req.params.id, val, dbStatus ? 'etat' : 'service', description]
      );
      try {
        const config = await getConfig(req.user.maisonId);
        const budget = Number(config?.budgetKwh || 0);
        const consumption = await computeConsumption(req.user.maisonId);
        const topConsumer = await getTopConsumer(req.user.maisonId);
        await saveMonthlyConsumption(req.user.maisonId, consumption, budget, topConsumer);
      } catch (e) {
        console.error('Erreur mise a jour consommation apres changement statut:', e);
      }
    }
    await saveDeviceSettings(req.params.id, req.body.settings);

    const updated = await fetchDevice(req.params.id, req.user);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── Règles d'automatisation ────────────────────────────────────────────────

/**
 * POST /api/devices/:id/automation-rules
 * Crée une règle d'automatisation pour un objet connecté.
 * Body : { heure: "HH:MM", action_auto: "activer"|"desactiver", jours: ["lun","mar",...] }
 *
 * Requête PostgreSQL (Supabase) :
 *   INSERT INTO automatisation_regles (objet_id, maison_id, heure_declenchement, action, jours_actifs)
 *   VALUES ($1, $2, $3::time, $4, $5) RETURNING *
 *
 *   + upsert dans config_objet pour accès en temps réel par l'objet
 */
router.post('/:id/automation-rules', authenticate, requireModule('device_config'), async (req, res) => {
  const { heure, action_auto, jours } = req.body;

  if (!heure || !action_auto) {
    return res.status(400).json({ error: 'Champs requis : heure, action_auto.' });
  }
  if (!['activer', 'desactiver'].includes(action_auto)) {
    return res.status(400).json({ error: 'action_auto doit être "activer" ou "desactiver".' });
  }

  const joursStr = Array.isArray(jours) && jours.length > 0
    ? jours.join(',')
    : 'lun,mar,mer,jeu,ven';

  try {
    // Vérifie que l'objet appartient bien à la maison de l'utilisateur
    const { rows: objs } = await pool.query(
      'SELECT id FROM objets WHERE id = $1 AND (maison_id = $2 OR $2 IS NULL)',
      [req.params.id, req.user.maisonId || null]
    );
    if (objs.length === 0) return res.status(404).json({ error: 'Objet introuvable.' });

    // Crée la règle dans la table dédiée
    const { rows } = await pool.query(
      `INSERT INTO automatisation_regles
         (objet_id, maison_id, heure_declenchement, action, jours_actifs)
       VALUES ($1, $2, $3::time, $4, $5)
       RETURNING id, objet_id, heure_declenchement, action, jours_actifs, active, cree_le`,
      [req.params.id, req.user.maisonId || null, heure, action_auto, joursStr]
    );

    // Reflète aussi dans config_objet pour que le frontend puisse lire l'état
    await saveDeviceSettings(req.params.id, {
      automatisation:      'active',
      alerte_push:         'active',
      heure_declenchement: heure,
      action_auto,
      jours_actifs:        joursStr,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/**
 * GET /api/devices/:id/automation-rules
 * Retourne les règles d'automatisation actives d'un objet.
 *
 * Requête PostgreSQL :
 *   SELECT * FROM automatisation_regles
 *   WHERE objet_id = $1 AND (maison_id = $2 OR $2 IS NULL) AND active = true
 *   ORDER BY cree_le DESC
 */
router.get('/:id/automation-rules', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, objet_id, heure_declenchement, action, jours_actifs, active, cree_le
       FROM automatisation_regles
       WHERE objet_id = $1 AND (maison_id = $2 OR $2 IS NULL) AND active = true
       ORDER BY cree_le DESC`,
      [req.params.id, req.user.maisonId || null]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/**
 * DELETE /api/devices/:id/automation-rules/:ruleId
 * Désactive (soft delete) une règle d'automatisation.
 */
router.delete('/:id/automation-rules/:ruleId', authenticate, requireModule('device_config'), async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE automatisation_regles SET active = false
       WHERE id = $1 AND objet_id = $2 AND (maison_id = $3 OR $3 IS NULL)`,
      [req.params.ruleId, req.params.id, req.user.maisonId || null]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Règle introuvable.' });
    res.json({ message: 'Règle désactivée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── Toggle statut ─────────────────────────────────────────────────────────

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

    const updated = await fetchDevice(req.params.id, req.user);
    if (!updated) return res.status(404).json({ error: 'Objet introuvable.' });

    await pool.query(
      'INSERT INTO historique_objet (objt_id, valeur, unite) VALUES ($1, $2, $3)',
      [req.params.id, updated.status === 'active' ? 1 : 0, 'etat']
    );

    try {
      const config = await getConfig(req.user.maisonId);
      const budget = Number(config?.budgetKwh || 0);
      const consumption = await computeConsumption(req.user.maisonId);
      const topConsumer = await getTopConsumer(req.user.maisonId);
      await saveMonthlyConsumption(req.user.maisonId, consumption, budget, topConsumer);
    } catch (e) {
      console.error('Erreur mise a jour consommation apres toggle:', e);
    }

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
    const deleted = await pool.query(
      'DELETE FROM objets WHERE id = $1 AND (maison_id = $2 OR $2 IS NULL)',
      [req.params.id, req.user.maisonId || null]
    );
    if (deleted.rowCount === 0) return res.status(404).json({ error: 'Objet introuvable.' });
    res.json({ message: 'Objet supprime.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const device = await fetchDevice(req.params.id, req.user);
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
