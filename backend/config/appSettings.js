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
  const { rows } = await pool.query('SELECT value FROM app_settings WHERE key = $1', [getSettingsKey(maisonId)]);
  return normalizeSettings(rows[0]?.value || DEFAULT_SETTINGS);
}

export async function saveAppSettings(nextSettings, maisonId = null) {
  await ensureSettingsTable();
  const settings = normalizeSettings(nextSettings);
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [getSettingsKey(maisonId), JSON.stringify(settings)]
  );
  return settings;
}
