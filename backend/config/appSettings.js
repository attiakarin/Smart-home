import pool from './db.js';

export const DEFAULT_SETTINGS = {
  platformName: 'Ma Maison Connectee',
  registrationAuto: false,
  pointsConnexion: 0.25,
  pointsConsultation: 0.5,
  themeColor: '#1a73e8',
  maintenanceMode: false,
};

let initialized = false;

// ─── Cache TTL (30s) pour éviter une requête DB à chaque appel API ───────────
const CACHE_TTL_MS = 30_000;
const settingsCache = new Map(); // key → { value, expiresAt }

function getCached(key) {
  const entry = settingsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { settingsCache.delete(key); return null; }
  return entry.value;
}

function setCache(key, value) {
  settingsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateSettingsCache(maisonId = null) {
  settingsCache.delete(getSettingsKey(maisonId));
}
// ─────────────────────────────────────────────────────────────────────────────

function getSettingsKey(maisonId) {
  return maisonId ? `maison:${maisonId}` : 'platform';
}

async function ensureSettingsTable() {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  initialized = true;
}

function normalizeSettings(settings = {}) {
  return {
    platformName: String(settings.platformName || DEFAULT_SETTINGS.platformName),
    registrationAuto: Boolean(settings.registrationAuto),
    pointsConnexion: Number(settings.pointsConnexion ?? DEFAULT_SETTINGS.pointsConnexion),
    pointsConsultation: Number(settings.pointsConsultation ?? DEFAULT_SETTINGS.pointsConsultation),
    themeColor: /^#[0-9a-f]{6}$/i.test(settings.themeColor || '')
      ? settings.themeColor
      : DEFAULT_SETTINGS.themeColor,
    maintenanceMode: Boolean(settings.maintenanceMode),
  };
}

export async function getAppSettings(maisonId = null) {
  await ensureSettingsTable();
  const key = getSettingsKey(maisonId);
  const cached = getCached(key);
  if (cached) return cached;
  const { rows } = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  const result = normalizeSettings(rows[0]?.value || DEFAULT_SETTINGS);
  setCache(key, result);
  return result;
}

export async function saveAppSettings(nextSettings, maisonId = null) {
  await ensureSettingsTable();
  const settings = normalizeSettings(nextSettings);
  const key = getSettingsKey(maisonId);
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(settings)]
  );
  // Invalide le cache après écriture
  invalidateSettingsCache(maisonId);
  return settings;
}
