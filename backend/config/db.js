import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3307,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'home2026',
  database: process.env.DB_NAME     || 'smart_home_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: '+00:00',
});

export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connecté avec succès');
    conn.release();
    await ensureSchema();
  } catch (err) {
    console.error('❌ Erreur connexion MySQL :', err.message);
    process.exit(1);
  }
}

async function ensureSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS maisons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(100) NOT NULL,
      code_acces VARCHAR(20) NOT NULL UNIQUE,
      date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS historique_connexion (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      heure_co DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY fk_his_co(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role_maison'`
  );

  if (columns.length === 0) {
    await pool.query(
      "ALTER TABLE users ADD COLUMN role_maison VARCHAR(50) NOT NULL DEFAULT 'autre' AFTER rolee"
    );
    console.log('Colonne users.role_maison ajoutée');
  }

  const [maisonColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'maison_id'`
  );

  if (maisonColumns.length === 0) {
    await pool.query(
      "ALTER TABLE users ADD COLUMN maison_id INT NULL AFTER role_maison"
    );
    console.log('Colonne users.maison_id ajoutée');
  }

  const [objetMaisonColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'objets'
       AND COLUMN_NAME = 'maison_id'`
  );

  if (objetMaisonColumns.length === 0) {
    await pool.query(
      "ALTER TABLE objets ADD COLUMN maison_id INT NULL AFTER id"
    );
    console.log('Colonne objets.maison_id ajoutée');
  }

  await pool.query(
    "INSERT IGNORE INTO maisons (id, nom, code_acces) VALUES (1, 'Maison principale', 'MAISON2026')"
  );
  await pool.query('UPDATE users SET maison_id = 1 WHERE maison_id IS NULL');
  await pool.query('UPDATE objets SET maison_id = 1 WHERE maison_id IS NULL');

  const [configIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'config_objet'
       AND INDEX_NAME = 'uk_config_objet_param'`
  );
  if (configIndexes.length === 0) {
    await pool.query('ALTER TABLE config_objet ADD UNIQUE KEY uk_config_objet_param (objet_id, param_nom)');
  }

  await seedAdminTestDevices();
}

async function seedAdminTestDevices() {
  await pool.query(
    `INSERT IGNORE INTO objets
      (id, maison_id, nom, type_obj, marque, piece_id, statut, type_connexion, signal_obj, batterie, energie_consommer, description, derniere_connexion)
     VALUES
      (9, 1, 'Station Meteo Jardin', 'Capteur', 'Netatmo', 1, 'Active', 'Wi-Fi', 'Fort', 88, 0.03, 'Station meteo connectee pour temperature, humidite et pression.', NOW()),
      (10, 1, 'Detecteur Mouvement Couloir', 'Securite', 'Aqara', 7, 'Active', 'Zigbee', 'Fort', 72, 0.01, 'Detecteur de mouvement pour automatisations nocturnes.', NOW()),
      (11, 1, 'Prise Bureau', 'Prise', 'TP-Link', 1, 'Inactive', 'Wi-Fi', 'Moyen', NULL, 0.12, 'Prise connectee pour mesurer la consommation du bureau.', NOW()),
      (12, 1, 'Ampoule Cuisine Plan', 'Eclairage', 'Philips Hue', 3, 'Active', 'Zigbee', 'Fort', NULL, 0.08, 'Eclairage connecte du plan de travail.', NOW()),
      (13, 1, 'Thermostat Salle de Bain', 'Thermostat', 'Honeywell', 4, 'Inactive', 'Wi-Fi', 'Moyen', 64, 0.70, 'Thermostat programmable pour la salle de bain.', NOW()),
      (14, 1, 'Camera Garage', 'Camera', 'Ring', 6, 'Active', 'Wi-Fi', 'Faible', 31, 0.45, 'Camera connectee du garage.', NOW()),
      (15, 1, 'Arrosage Jardin', 'Robot', 'Gardena', 1, 'Inactive', 'Wi-Fi', 'Moyen', 56, 0.30, 'Programmateur intelligent pour arrosage automatique.', NOW()),
      (16, 1, 'Capteur Fuite Eau', 'Capteur', 'Fibaro', 4, 'Active', 'Z-Wave', 'Fort', 91, 0.01, 'Capteur de fuite sous le lavabo.', NOW()),
      (17, 1, 'Volets Salon', 'Securite', 'Somfy', 1, 'Active', 'Zigbee', 'Fort', NULL, 0.20, 'Commande connectee des volets du salon.', NOW()),
      (18, 1, 'Purificateur Air Chambre', 'Electromenager', 'Dyson', 2, 'Active', 'Wi-Fi', 'Fort', NULL, 1.10, 'Purificateur air connecte avec suivi de qualite.', NOW()),
      (19, 1, 'Compteur Energie', 'Energie', 'Shelly', 6, 'Active', 'Wi-Fi', 'Fort', NULL, 0.00, 'Suivi de la consommation electrique generale.', NOW()),
      (20, 1, 'Detecteur Fumee Chambre', 'Detecteur', 'Nest', 2, 'Active', 'Wi-Fi', 'Fort', 79, 0.01, 'Detecteur de fumee connecte dans la chambre.', NOW())`
  );

  await pool.query(
    `INSERT IGNORE INTO config_objet (objet_id, param_nom, param_valeur, param_type)
     VALUES
      (9, 'seuil_humidite', '65', 'nombre'),
      (10, 'sensibilite', 'moyenne', 'texte'),
      (12, 'luminosite', '75', 'nombre'),
      (12, 'couleur', 'blanc chaud', 'texte'),
      (13, 'temperature_cible', '22', 'nombre'),
      (13, 'mode', 'eco', 'texte'),
      (14, 'detection_mouvement', 'active', 'texte'),
      (15, 'planning', 'matin', 'texte'),
      (17, 'position', '80', 'nombre'),
      (18, 'mode', 'automatique', 'texte'),
      (19, 'alerte_surconsommation', 'active', 'texte')`
  );
}

export default pool;
