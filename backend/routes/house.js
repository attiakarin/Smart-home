import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireModule } from '../middleware/auth.js';
import { getAppSettings, saveAppSettings } from '../config/appSettings.js';

const router = Router();

const DEFAULT_ROOMS = ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Entree', 'Garage', 'Couloir'];

async function ensureHouseTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS maison_config (
      maison_id INT PRIMARY KEY REFERENCES maisons(id) ON DELETE CASCADE,
      logement_type VARCHAR(20) NOT NULL DEFAULT 'maison',
      nb_pieces INT NOT NULL DEFAULT 1,
      budget_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
      pieces JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consommation_mensuelle (
      id SERIAL PRIMARY KEY,
      maison_id INT NOT NULL REFERENCES maisons(id) ON DELETE CASCADE,
      mois CHAR(7) NOT NULL,
      consommation_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
      budget_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
      maintenance_declenchee BOOLEAN NOT NULL DEFAULT FALSE,
      alerte_at TIMESTAMP,
      resolu_at TIMESTAMP,
      top_objet_id INT REFERENCES objets(id) ON DELETE SET NULL,
      top_objet_nom VARCHAR(120),
      top_objet_conso NUMERIC(10,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (maison_id, mois)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consommation_alertes (
      id SERIAL PRIMARY KEY,
      maison_id INT NOT NULL REFERENCES maisons(id) ON DELETE CASCADE,
      mois CHAR(7) NOT NULL,
      consommation_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
      budget_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
      alerte_at TIMESTAMP NOT NULL DEFAULT NOW(),
      resolu_at TIMESTAMP,
      top_objet_id INT REFERENCES objets(id) ON DELETE SET NULL,
      top_objet_nom VARCHAR(120),
      top_objet_conso NUMERIC(10,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS consommation_alertes_active_idx
    ON consommation_alertes (maison_id)
    WHERE resolu_at IS NULL
  `);
  await pool.query('ALTER TABLE consommation_mensuelle ADD COLUMN IF NOT EXISTS alerte_at TIMESTAMP');
  await pool.query('ALTER TABLE consommation_mensuelle ADD COLUMN IF NOT EXISTS resolu_at TIMESTAMP');
  await pool.query('ALTER TABLE consommation_mensuelle ADD COLUMN IF NOT EXISTS top_objet_id INT REFERENCES objets(id) ON DELETE SET NULL');
  await pool.query('ALTER TABLE consommation_mensuelle ADD COLUMN IF NOT EXISTS top_objet_nom VARCHAR(120)');
  await pool.query('ALTER TABLE consommation_mensuelle ADD COLUMN IF NOT EXISTS top_objet_conso NUMERIC(10,2) NOT NULL DEFAULT 0');
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
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizePieces(body) {
  const nbPieces = Math.max(1, Number(body.nbPieces || body.nb_pieces || 1));
  const rawPieces = Array.isArray(body.pieces) ? body.pieces : [];
  const pieces = rawPieces
    .map(piece => String(piece || '').trim())
    .filter(Boolean)
    .slice(0, 30);

  if (pieces.length > 0) return pieces;
  return Array.from({ length: nbPieces }, (_, index) => DEFAULT_ROOMS[index] || `Piece ${index + 1}`);
}

function mapConfig(row) {
  if (!row) return null;
  return {
    maisonId: row.maison_id,
    housingType: row.logement_type,
    nbPieces: Number(row.nb_pieces || 0),
    budgetKwh: Number(row.budget_kwh || 0),
    pieces: Array.isArray(row.pieces) ? row.pieces : [],
    updatedAt: row.updated_at,
  };
}

async function getConfig(maisonId) {
  await ensureHouseTables();
  const { rows } = await pool.query('SELECT * FROM maison_config WHERE maison_id = $1', [maisonId]);
  return mapConfig(rows[0]);
}

async function computeConsumption(maisonId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(GREATEST(COALESCE(energie_consommer, 0), 0)), 0)::numeric AS total
     FROM objets
     WHERE maison_id = $1
       AND user_id IS NOT NULL
       AND statut = 'Active'::statut_objet_enum`,
    [maisonId]
  );
  let total = Number(rows[0]?.total || 0);

  // Si aucun appareil n'est lié à un utilisateur, on tente un repli
  // en comptant tous les appareils actifs de la maison (cas des listes publiques).
  if (total === 0) {
    const { rows: rows2 } = await pool.query(
      `SELECT COALESCE(SUM(GREATEST(COALESCE(energie_consommer, 0), 0)), 0)::numeric AS total
       FROM objets
       WHERE maison_id = $1
         AND statut = 'Active'::statut_objet_enum`,
      [maisonId]
    );
    total = Number(rows2[0]?.total || 0);
  }

  return total;
}

async function getTopConsumer(maisonId) {
  const { rows } = await pool.query(
    `SELECT objets.id, objets.nom, COALESCE(objets.energie_consommer, 0)::numeric AS consommation,
            piece_maison.nom AS piece_nom
     FROM objets
     LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
     WHERE objets.maison_id = $1
       AND objets.user_id IS NOT NULL
       AND objets.statut = 'Active'::statut_objet_enum
     ORDER BY COALESCE(objets.energie_consommer, 0) DESC, objets.nom ASC
     LIMIT 1`,
    [maisonId]
  );
  if (rows[0]) return rows[0];

  // Fallback: if no user-linked device found, consider any active device (public or unassigned)
  const { rows: rows2 } = await pool.query(
    `SELECT objets.id, objets.nom, COALESCE(objets.energie_consommer, 0)::numeric AS consommation,
            piece_maison.nom AS piece_nom
     FROM objets
     LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
     WHERE objets.maison_id = $1
       AND objets.statut = 'Active'::statut_objet_enum
     ORDER BY COALESCE(objets.energie_consommer, 0) DESC, objets.nom ASC
     LIMIT 1`,
    [maisonId]
  );
  return rows2[0] || null;
}

async function upsertActiveConsumptionAlert(maisonId, month, consumption, budget, topConsumer) {
  const active = await pool.query(
    `SELECT *
     FROM consommation_alertes
     WHERE maison_id = $1
       AND resolu_at IS NULL
     ORDER BY alerte_at DESC
     LIMIT 1`,
    [maisonId]
  );

  if (active.rows[0]) {
    const { rows } = await pool.query(
      `UPDATE consommation_alertes
       SET mois = $1,
           consommation_kwh = $2,
           budget_kwh = $3,
           top_objet_id = $4,
           top_objet_nom = $5,
           top_objet_conso = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        month,
        consumption,
        budget,
        topConsumer?.id || null,
        topConsumer?.nom || null,
        Number(topConsumer?.consommation || 0),
        active.rows[0].id,
      ]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO consommation_alertes (
       maison_id, mois, consommation_kwh, budget_kwh,
       top_objet_id, top_objet_nom, top_objet_conso
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      maisonId,
      month,
      consumption,
      budget,
      topConsumer?.id || null,
      topConsumer?.nom || null,
      Number(topConsumer?.consommation || 0),
    ]
  );
  return rows[0];
}

async function resolveActiveConsumptionAlert(maisonId) {
  const { rows } = await pool.query(
    `UPDATE consommation_alertes
     SET resolu_at = NOW(),
         updated_at = NOW()
     WHERE maison_id = $1
       AND resolu_at IS NULL
     RETURNING *`,
    [maisonId]
  );
  return rows[0] || null;
}

async function ensureMaintenanceRequest(maisonId, consumption, budget, topConsumer) {
  const month = currentMonthKey();
  const title = `Depassement consommation ${month}`;
  const exists = await pool.query(
    `SELECT id FROM demandes_admin
     WHERE maison_id = $1
       AND type_demande = 'maintenance'
       AND titre = $2
     LIMIT 1`,
    [maisonId, title]
  );
  const messageText = `La consommation mensuelle a atteint ${Number(consumption).toFixed(2)} kWh (seuil: ${Number(budget).toFixed(2)} kWh, depassement: ${Number(consumption - budget).toFixed(2)} kWh). Objet le plus consommateur: ${topConsumer?.nom || 'non identifie'} (${Number(topConsumer?.consommation || 0).toFixed(2)} kWh). Le mode maintenance a ete active automatiquement.`;
  if (exists.rows[0]) {
    // Mettre a jour le message si la demande existe deja pour refléter la nouvelle valeur
    await pool.query(
      `UPDATE demandes_admin
       SET message = $1, priorite = 'haute', statut = 'nouvelle', date_maj = NOW()
       WHERE id = $2`,
      [messageText, exists.rows[0].id]
    );
    return;
  }

  const admin = await pool.query(
    `SELECT id FROM users
     WHERE maison_id = $1 AND rolee = 'admin'
     ORDER BY id ASC
     LIMIT 1`,
    [maisonId]
  );

  await pool.query(
    `INSERT INTO demandes_admin (maison_id, user_id, type_demande, titre, message, priorite)
     VALUES ($1, $2, 'maintenance', $3, $4, 'haute')`,
    [
      maisonId,
      admin.rows[0]?.id || null,
      title,
      messageText,
    ]
  );
}

async function resolveMaintenanceRequest(maisonId) {
  const month = currentMonthKey();
  const title = `Depassement consommation ${month}`;
  await pool.query(
    `UPDATE demandes_admin
     SET statut = 'traitee',
         reponse_admin = COALESCE(NULLIF(reponse_admin, ''), 'Le probleme de consommation est resolu automatiquement.'),
         reponse_lue = FALSE,
         date_maj = NOW()
     WHERE maison_id = $1
       AND type_demande = 'maintenance'
       AND titre = $2
       AND statut IN ('nouvelle', 'en_cours')`,
    [maisonId, title]
  );
}

async function saveMonthlyConsumption(maisonId, consumption, budget, topConsumer) {
  const month = currentMonthKey();
  const exceeded = budget > 0 && consumption > budget;
  const previous = await pool.query(
    `SELECT *
     FROM consommation_mensuelle
     WHERE maison_id = $1 AND mois = $2
     LIMIT 1`,
    [maisonId, month]
  );
  const previousWasExceeded =
    Number(previous.rows[0]?.budget_kwh || 0) > 0 &&
    Number(previous.rows[0]?.consommation_kwh || 0) > Number(previous.rows[0]?.budget_kwh || 0) &&
    !previous.rows[0]?.resolu_at;
  const alertTimestampSql = exceeded && !previousWasExceeded ? 'NOW()' : 'consommation_mensuelle.alerte_at';

  const { rows } = await pool.query(
    `INSERT INTO consommation_mensuelle (
       maison_id, mois, consommation_kwh, budget_kwh, maintenance_declenchee,
       alerte_at, top_objet_id, top_objet_nom, top_objet_conso, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END, $6, $7, $8, NOW())
     ON CONFLICT (maison_id, mois)
     DO UPDATE SET consommation_kwh = EXCLUDED.consommation_kwh,
                   budget_kwh = EXCLUDED.budget_kwh,
                   maintenance_declenchee = consommation_mensuelle.maintenance_declenchee OR EXCLUDED.maintenance_declenchee,
                   alerte_at = CASE
                     WHEN EXCLUDED.maintenance_declenchee THEN ${alertTimestampSql}
                     ELSE consommation_mensuelle.alerte_at
                   END,
                   resolu_at = CASE
                     WHEN NOT EXCLUDED.maintenance_declenchee AND consommation_mensuelle.maintenance_declenchee THEN COALESCE(consommation_mensuelle.resolu_at, NOW())
                     WHEN EXCLUDED.maintenance_declenchee THEN NULL
                     ELSE consommation_mensuelle.resolu_at
                   END,
                   top_objet_id = EXCLUDED.top_objet_id,
                   top_objet_nom = EXCLUDED.top_objet_nom,
                   top_objet_conso = EXCLUDED.top_objet_conso,
                   updated_at = NOW()
     RETURNING *`,
    [
      maisonId,
      month,
      consumption,
      budget,
      exceeded,
      topConsumer?.id || null,
      topConsumer?.nom || null,
      Number(topConsumer?.consommation || 0),
    ]
  );

  let activeAlert = null;
  if (exceeded) {
    activeAlert = await upsertActiveConsumptionAlert(maisonId, month, consumption, budget, topConsumer);
    const settings = await getAppSettings(maisonId);
    // Assurer que le mode maintenance est active pour la maison
    await saveAppSettings({ ...settings, maintenanceMode: true }, maisonId);
    await ensureMaintenanceRequest(maisonId, consumption, budget, topConsumer);
  } else {
    const resolvedAlert = await resolveActiveConsumptionAlert(maisonId);
    const settings = await getAppSettings(maisonId);
    // Si la consommation n'est plus depassee mais que le record montre un declenchement,
    // desactiver le mode maintenance pour la maison.
    if (rows[0]?.maintenance_declenchee) {
      await saveAppSettings({ ...settings, maintenanceMode: false }, maisonId);
    }
    await resolveMaintenanceRequest(maisonId);
    if (resolvedAlert && rows[0]) {
      rows[0].resolu_at = resolvedAlert.resolu_at;
    }
  }

  if (activeAlert && rows[0]) {
    rows[0].alerte_at = activeAlert.alerte_at;
    rows[0].resolu_at = activeAlert.resolu_at;
  }

  return rows[0];
}

function mapConsumptionAlert(row) {
  return {
    id: row.id,
    maisonId: row.maison_id,
    month: row.mois,
    consumptionKwh: Number(row.consommation_kwh || 0),
    budgetKwh: Number(row.budget_kwh || 0),
    exceeded: Number(row.budget_kwh || 0) > 0 && Number(row.consommation_kwh || 0) > Number(row.budget_kwh || 0),
    maintenanceTriggered: true,
    alertAt: row.alerte_at,
    resolvedAt: row.resolu_at,
    resolved: Boolean(row.resolu_at) || !(Number(row.budget_kwh || 0) > 0 && Number(row.consommation_kwh || 0) > Number(row.budget_kwh || 0)),
    topDevice: row.top_objet_id ? {
      id: row.top_objet_id,
      name: row.top_objet_nom,
      consumptionKwh: Number(row.top_objet_conso || 0),
    } : null,
    updatedAt: row.updated_at,
  };
}

function makeWarnings(devices, budget) {
  if (!budget) return [];
  return devices
    .filter(device => Number(device.energie_consommer || 0) > 0)
    .sort((a, b) => Number(b.energie_consommer || 0) - Number(a.energie_consommer || 0))
    .slice(0, 3)
    .map(device => ({
      deviceId: device.id,
      deviceName: device.nom,
      room: device.piece_nom || '',
      consumptionKwh: Number(device.energie_consommer || 0),
      message: `Attention, ${device.nom} risque d'augmenter la consommation mensuelle.`,
    }));
}

router.use(authenticate);

router.get('/config', async (req, res) => {
  try {
    const config = await getConfig(req.user.maisonId);
    res.json(config || {
      maisonId: req.user.maisonId,
      housingType: 'maison',
      nbPieces: DEFAULT_ROOMS.length,
      budgetKwh: 0,
      pieces: DEFAULT_ROOMS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/config', requireModule('administration'), async (req, res) => {
  try {
    await ensureHouseTables();
    const housingType = req.body.housingType === 'appartement' ? 'appartement' : 'maison';
    const nbPieces = Math.max(1, Number(req.body.nbPieces || 1));
    const budgetKwh = Math.max(0, Number(req.body.budgetKwh || 0));
    const pieces = normalizePieces({ ...req.body, nbPieces });

    const { rows } = await pool.query(
      `INSERT INTO maison_config (maison_id, logement_type, nb_pieces, budget_kwh, pieces, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT (maison_id)
       DO UPDATE SET logement_type = EXCLUDED.logement_type,
                     nb_pieces = EXCLUDED.nb_pieces,
                     budget_kwh = EXCLUDED.budget_kwh,
                     pieces = EXCLUDED.pieces,
                     updated_at = NOW()
       RETURNING *`,
      [req.user.maisonId, housingType, nbPieces, budgetKwh, JSON.stringify(pieces)]
    );
    res.json(mapConfig(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/consumption', async (req, res) => {
  try {
    await ensureHouseTables();
    const config = await getConfig(req.user.maisonId);
    const budget = Number(config?.budgetKwh || 0);
    const consumption = await computeConsumption(req.user.maisonId);
    const topConsumer = await getTopConsumer(req.user.maisonId);
    const monthly = await saveMonthlyConsumption(req.user.maisonId, consumption, budget, topConsumer);
    const devicesResult = await pool.query(
      `SELECT objets.id, objets.nom, objets.energie_consommer, piece_maison.nom AS piece_nom
       FROM objets
       LEFT JOIN piece_maison ON piece_maison.id = objets.piece_id
       WHERE objets.maison_id = $1
         AND objets.user_id IS NOT NULL
         AND objets.statut = 'Active'::statut_objet_enum`,
      [req.user.maisonId]
    );

    res.json({
      month: monthly.mois,
      consumptionKwh: Number(monthly.consommation_kwh || 0),
      budgetKwh: Number(monthly.budget_kwh || 0),
      exceeded: Number(monthly.budget_kwh || 0) > 0 && Number(monthly.consommation_kwh || 0) > Number(monthly.budget_kwh || 0),
      maintenanceTriggered: Boolean(monthly.maintenance_declenchee),
      alertAt: monthly.alerte_at,
      resolvedAt: monthly.resolu_at,
      resolved: Boolean(monthly.resolu_at) || !(Number(monthly.budget_kwh || 0) > 0 && Number(monthly.consommation_kwh || 0) > Number(monthly.budget_kwh || 0)),
      updatedAt: monthly.updated_at,
      warnings: makeWarnings(devicesResult.rows, budget),
      topDevice: topConsumer ? {
        id: topConsumer.id,
        name: topConsumer.nom,
        consumptionKwh: Number(topConsumer.consommation || 0),
        room: topConsumer.piece_nom || '',
      } : null,
      config,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/consumption/history', requireModule('administration'), async (req, res) => {
  try {
    await ensureHouseTables();
    const config = await getConfig(req.user.maisonId);
    const budget = Number(config?.budgetKwh || 0);
    const consumption = await computeConsumption(req.user.maisonId);
    const topConsumer = await getTopConsumer(req.user.maisonId);
    await saveMonthlyConsumption(req.user.maisonId, consumption, budget, topConsumer);

    const { rows } = await pool.query(
      `SELECT *
       FROM consommation_alertes
       WHERE maison_id = $1
       ORDER BY alerte_at DESC
       LIMIT 24`,
      [req.user.maisonId]
    );
    res.json(rows.map(mapConsumptionAlert));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
export { computeConsumption, getTopConsumer, saveMonthlyConsumption, getConfig };
