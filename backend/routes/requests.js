import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireModule } from '../middleware/auth.js';

const router = Router();

const VALID_TYPES = new Set(['ajout_objet', 'configuration', 'maintenance', 'droits', 'autre']);
const VALID_PRIORITIES = new Set(['basse', 'normale', 'haute']);
const VALID_STATUSES = new Set(['nouvelle', 'en_cours', 'traitee', 'refusee']);
const LEVEL_POINTS = {
  debutant: 3,
  intermediaire: 2.5,
  avance: 2,
  expert: 0,
};

async function ensureRequestsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demandes_admin (
      id SERIAL PRIMARY KEY,
      maison_id INT REFERENCES maisons(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type_demande VARCHAR(40) NOT NULL DEFAULT 'autre',
      titre VARCHAR(120) NOT NULL,
      message TEXT NOT NULL,
      priorite VARCHAR(20) NOT NULL DEFAULT 'normale',
      statut VARCHAR(20) NOT NULL DEFAULT 'nouvelle',
      reponse_admin TEXT,
      reponse_lue BOOLEAN NOT NULL DEFAULT TRUE,
      traite_par INT REFERENCES users(id) ON DELETE SET NULL,
      date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
      date_maj TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE demandes_admin ADD COLUMN IF NOT EXISTS reponse_lue BOOLEAN NOT NULL DEFAULT TRUE');
  await pool.query('ALTER TABLE demandes_admin ADD COLUMN IF NOT EXISTS utile_validee BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('ALTER TABLE demandes_admin ADD COLUMN IF NOT EXISTS points_attribues NUMERIC(6,2) NOT NULL DEFAULT 0');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demande_messages (
      id SERIAL PRIMARY KEY,
      demande_id INT NOT NULL REFERENCES demandes_admin(id) ON DELETE CASCADE,
      auteur_id INT REFERENCES users(id) ON DELETE SET NULL,
      auteur_role VARCHAR(20) NOT NULL DEFAULT 'habitant',
      message TEXT NOT NULL,
      date_creation TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function normalizeLevel(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function computeLevel(points) {
  if (points >= 75) return 'Expert';
  if (points >= 50) return 'Avanc\u00e9';
  if (points >= 25) return 'Interm\u00e9diaire';
  return 'D\u00e9butant';
}

function bonusForLevel(level) {
  const normalized = normalizeLevel(level);
  if (normalized.includes('debutant') || normalized.includes('butant')) return LEVEL_POINTS.debutant;
  if (normalized.includes('intermediaire') || normalized.includes('diaire')) return LEVEL_POINTS.intermediaire;
  if (normalized.includes('avance') || normalized.includes('avanc')) return LEVEL_POINTS.avance;
  return LEVEL_POINTS[normalized] || 0;
}

function mapRequest(row) {
  return {
    id: row.id,
    maisonId: row.maison_id,
    userId: row.user_id,
    type: row.type_demande,
    title: row.titre,
    message: row.message,
    priority: row.priorite,
    status: row.statut,
    adminReply: row.reponse_admin || '',
    replyRead: Boolean(row.reponse_lue),
    handledBy: row.traite_par,
    usefulValidated: Boolean(row.utile_validee),
    awardedPoints: Number(row.points_attribues || 0),
    closed: ['traitee', 'refusee'].includes(row.statut),
    createdAt: row.date_creation,
    updatedAt: row.date_maj,
    requester: {
      login: row.demandeur_login,
      prenom: row.demandeur_prenom,
      nom: row.demandeur_nom,
      niveau: row.demandeur_niveau,
    },
    admin: row.admin_login ? {
      login: row.admin_login,
      prenom: row.admin_prenom,
      nom: row.admin_nom,
    } : null,
    messages: [],
  };
}

async function attachMessages(requests) {
  if (requests.length === 0) return requests;
  const ids = requests.map(request => request.id);
  const { rows } = await pool.query(
    `SELECT demande_messages.*,
            users.pseudonyme AS auteur_login,
            users.prenom AS auteur_prenom,
            users.nom AS auteur_nom
     FROM demande_messages
     LEFT JOIN users ON users.id = demande_messages.auteur_id
     WHERE demande_id = ANY($1::int[])
     ORDER BY date_creation ASC, id ASC`,
    [ids]
  );
  const byRequestId = rows.reduce((acc, row) => {
    const key = String(row.demande_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      id: row.id,
      requestId: row.demande_id,
      authorId: row.auteur_id,
      authorRole: row.auteur_role,
      message: row.message,
      createdAt: row.date_creation,
      author: row.auteur_login ? {
        login: row.auteur_login,
        prenom: row.auteur_prenom,
        nom: row.auteur_nom,
      } : null,
    });
    return acc;
  }, {});
  return requests.map(request => ({
    ...request,
    messages: byRequestId[String(request.id)] || [{
      id: `initial-${request.id}`,
      requestId: request.id,
      authorId: request.userId,
      authorRole: 'habitant',
      message: request.message,
      createdAt: request.createdAt,
      author: request.requester,
    }],
  }));
}

async function fetchRequests(whereSql, values) {
  await ensureRequestsTable();
  const { rows } = await pool.query(
    `SELECT demandes_admin.*,
            demandeur.pseudonyme AS demandeur_login,
            demandeur.prenom AS demandeur_prenom,
            demandeur.nom AS demandeur_nom,
            demandeur.niveau AS demandeur_niveau,
            admin.pseudonyme AS admin_login,
            admin.prenom AS admin_prenom,
            admin.nom AS admin_nom
     FROM demandes_admin
     LEFT JOIN users demandeur ON demandeur.id = demandes_admin.user_id
     LEFT JOIN users admin ON admin.id = demandes_admin.traite_par
     ${whereSql}
     ORDER BY
       CASE demandes_admin.statut
         WHEN 'nouvelle' THEN 1
         WHEN 'en_cours' THEN 2
         WHEN 'traitee' THEN 3
         ELSE 4
       END,
       demandes_admin.date_creation DESC`,
    values
  );
  return attachMessages(rows.map(mapRequest));
}

router.use(authenticate);

router.get('/mine', async (req, res) => {
  try {
    const requests = await fetchRequests(
      `WHERE demandes_admin.maison_id = $1
       AND (demandes_admin.user_id = $2 OR demandes_admin.type_demande = 'maintenance')`,
      [req.user.maisonId, req.user.id]
    );
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/mine/read-replies', async (req, res) => {
  try {
    await ensureRequestsTable();
    await pool.query(
      `UPDATE demandes_admin
       SET reponse_lue = TRUE
       WHERE user_id = $1
         AND maison_id = $2
         AND reponse_admin IS NOT NULL
         AND reponse_admin <> ''`,
      [req.user.id, req.user.maisonId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureRequestsTable();
    const type = VALID_TYPES.has(req.body.type) ? req.body.type : 'autre';
    const priority = VALID_PRIORITIES.has(req.body.priority) ? req.body.priority : 'normale';
    const title = String(req.body.title || '').trim();
    const message = String(req.body.message || '').trim();

    if (!title || !message) {
      return res.status(400).json({ error: 'Titre et message requis.' });
    }
    if (title.length > 120) {
      return res.status(400).json({ error: 'Le titre doit faire 120 caractères maximum.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO demandes_admin (maison_id, user_id, type_demande, titre, message, priorite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.user.maisonId, req.user.id, type, title, message, priority]
    );

    await pool.query(
      `INSERT INTO demande_messages (demande_id, auteur_id, auteur_role, message)
       VALUES ($1, $2, 'habitant', $3)`,
      [rows[0].id, req.user.id, message]
    );

    const created = await fetchRequests('WHERE demandes_admin.id = $1', [rows[0].id]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/', requireModule('administration'), async (req, res) => {
  try {
    const requests = await fetchRequests(
      'WHERE demandes_admin.maison_id = $1 OR $1 IS NULL',
      [req.user.maisonId || null]
    );
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.patch('/:id', requireModule('administration'), async (req, res) => {
  try {
    await ensureRequestsTable();
    const status = VALID_STATUSES.has(req.body.status) ? req.body.status : undefined;
    const adminReply = req.body.adminReply !== undefined ? String(req.body.adminReply || '').trim() : undefined;
    const awardUseful = Boolean(req.body.awardUseful);

    if (!status && adminReply === undefined && !awardUseful) {
      return res.status(400).json({ error: 'Aucune modification fournie.' });
    }

    const fields = ['date_maj = NOW()', 'traite_par = $1'];
    const values = [req.user.id];
    if (status) {
      values.push(status);
      fields.push(`statut = $${values.length}`);
    }
    if (adminReply !== undefined) {
      values.push(adminReply);
      fields.push(`reponse_admin = $${values.length}`);
      fields.push(`reponse_lue = ${adminReply ? 'FALSE' : 'TRUE'}`);
    }
    values.push(req.params.id, req.user.maisonId || null);

    const { rows } = await pool.query(
      `UPDATE demandes_admin
       SET ${fields.join(', ')}
       WHERE id = $${values.length - 1}
         AND (maison_id = $${values.length} OR $${values.length} IS NULL)
       RETURNING id`,
      values
    );

    if (!rows[0]) return res.status(404).json({ error: 'Demande introuvable.' });

    if (adminReply) {
      await pool.query(
        `INSERT INTO demande_messages (demande_id, auteur_id, auteur_role, message)
         VALUES ($1, $2, 'admin', $3)`,
        [rows[0].id, req.user.id, adminReply]
      );
    }

    if (status === 'traitee' && awardUseful) {
      const requestResult = await pool.query(
        `SELECT demandes_admin.user_id, demandes_admin.utile_validee, users.points, users.niveau
         FROM demandes_admin
         JOIN users ON users.id = demandes_admin.user_id
         WHERE demandes_admin.id = $1`,
        [rows[0].id]
      );
      const request = requestResult.rows[0];
      const bonus = request && !request.utile_validee ? bonusForLevel(request.niveau) : 0;
      if (bonus > 0) {
        const nextPoints = Number(request.points || 0) + bonus;
        const nextLevel = computeLevel(nextPoints);
        await pool.query(
          'UPDATE users SET points = $1, niveau = $2 WHERE id = $3',
          [nextPoints, nextLevel, request.user_id]
        );
        await pool.query(
          'UPDATE demandes_admin SET utile_validee = TRUE, points_attribues = $1 WHERE id = $2',
          [bonus, rows[0].id]
        );
      }
    }

    const updated = await fetchRequests('WHERE demandes_admin.id = $1', [rows[0].id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/:id/messages', async (req, res) => {
  try {
    await ensureRequestsTable();
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message requis.' });

    const { rows } = await pool.query(
      `SELECT id, user_id, maison_id, statut
       FROM demandes_admin
       WHERE id = $1
         AND maison_id = $2
         AND ($3 = TRUE OR user_id = $4)`,
      [req.params.id, req.user.maisonId, req.user.rolee === 'admin', req.user.id]
    );
    const request = rows[0];
    if (!request) return res.status(404).json({ error: 'Demande introuvable.' });
    if (['traitee', 'refusee'].includes(request.statut)) {
      return res.status(400).json({ error: 'Cette conversation est fermee.' });
    }

    const isAdmin = req.user.rolee === 'admin';
    await pool.query(
      `INSERT INTO demande_messages (demande_id, auteur_id, auteur_role, message)
       VALUES ($1, $2, $3, $4)`,
      [request.id, req.user.id, isAdmin ? 'admin' : 'habitant', message]
    );

    const fields = ['date_maj = NOW()'];
    if (isAdmin) fields.push('reponse_lue = FALSE', 'traite_par = $2', 'reponse_admin = $3');
    await pool.query(
      `UPDATE demandes_admin
       SET ${fields.join(', ')}
       WHERE id = $1`,
      isAdmin ? [request.id, req.user.id, message] : [request.id]
    );

    const updated = await fetchRequests('WHERE demandes_admin.id = $1', [request.id]);
    res.status(201).json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
