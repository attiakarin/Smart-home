DROP DATABASE IF EXISTS smart_home_db;
CREATE DATABASE IF NOT EXISTS smart_home_db;
USE smart_home_db;

CREATE TABLE IF NOT EXISTS maisons (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nom             VARCHAR(100) NOT NULL,
  code_acces      VARCHAR(20) NOT NULL UNIQUE,
  date_creation   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pseudonyme           VARCHAR(50)  NOT NULL UNIQUE,
  mot_de_passe   VARCHAR(255) NOT NULL,
  email           VARCHAR(100) NOT NULL UNIQUE,
  nom             VARCHAR(100) NOT NULL,
  prenom          VARCHAR(100) NOT NULL,
  age             INT,
  genre ENUM('-', 'F', 'H') DEFAULT '-',
  date_naissance  DATE,
  rolee  ENUM('admin','habitant') NOT NULL DEFAULT 'habitant',
  role_maison     VARCHAR(50) NOT NULL DEFAULT 'autre',
  maison_id       INT,
  niveau          ENUM('Débutant','Intermédiaire','Avancé','Expert') NOT NULL DEFAULT 'Débutant',
  points          DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  photo           TEXT,
  statut          ENUM('Attente','Approuvé','Refusé') NOT NULL DEFAULT 'Attente',
  connexions      INT NOT NULL DEFAULT 0,
  actions         INT NOT NULL DEFAULT 0,
  derniere_connexion      DATETIME,
  date_creation     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_user_maison(maison_id) REFERENCES maisons(id) ON DELETE SET NULL
);

-- ─── Pièces de la maison ───────────────────────────────────
CREATE TABLE IF NOT EXISTS piece_maison (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nom            VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Objets connectés (Appareils) ──────────────────────────
CREATE TABLE IF NOT EXISTS objets (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  maison_id           INT,
  nom                VARCHAR(100) NOT NULL,
  type_obj                VARCHAR(50)  NOT NULL,
  marque               VARCHAR(50),
  piece_id            INT NOT NULL,
  statut              ENUM('Active','Inactive') NOT NULL DEFAULT 'Inactive',
  type_connexion        VARCHAR(30),
  signal_obj              VARCHAR(20),
  batterie             INT,
  energie_consommer  DECIMAL(8,2) DEFAULT 0.00,
  description         TEXT,
  derniere_connexion           DATETIME,
  date_creation          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_objt(piece_id) REFERENCES piece_maison(id) ON DELETE CASCADE,
  FOREIGN KEY fk_objet_maison(maison_id) REFERENCES maisons(id) ON DELETE CASCADE
);

-- ─── Historique des données des objets ─────────────────────
CREATE TABLE IF NOT EXISTS historique_objet (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  objt_id   INT NOT NULL,
  valeur      DECIMAL(10,2),
  unite        VARCHAR(20),
  enregistre_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_his_objt(objt_id) REFERENCES objets(id) ON DELETE CASCADE
);

-- ─── Historique de connexion ───────────────────────────────
CREATE TABLE IF NOT EXISTS historique_connexion (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  heure_co  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_his_co(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Modules de la plateforme (admin,intérmédiaire,débutant ou avancé) ──────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nom            VARCHAR(50) NOT NULL UNIQUE,
  description     TEXT,
  icone            VARCHAR(50),
  ordre           INT NOT NULL DEFAULT 0,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Accès aux modules par niveau ──────────────────────────
CREATE TABLE IF NOT EXISTS module_access (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  niveau          ENUM('débutant','intermédiaire','avancé','expert') NOT NULL,
  module_id       INT NOT NULL,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_niveau_module (niveau, module_id),
  FOREIGN KEY fk_module(module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- ─── Catégories d'objets connectés ────────────────────────
CREATE TABLE IF NOT EXISTS categorie_objets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nom            VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  icone            VARCHAR(50),
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Historique des actions utilisateurs ───────────────────
CREATE TABLE IF NOT EXISTS user_actions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  type_action     ENUM('connexion','consultation_objet','modification_objet','creation_objet','suppression_objet','autres') NOT NULL,
  action_details  VARCHAR(255),
  points          DECIMAL(4,2) DEFAULT 0.00,
  date_cration      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_user_actions(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_action (user_id, date_cration)
);

-- ─── Configuration/Paramètres des objets ───────────────────
CREATE TABLE IF NOT EXISTS config_objet (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  objet_id        INT NOT NULL,
  param_nom       VARCHAR(100) NOT NULL,
  param_valeur    VARCHAR(255),
  param_type      ENUM('température','temps','nombre','texte','booléen') DEFAULT 'texte',
  date_creation   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mise_a_jour      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_objt(objet_id) REFERENCES objets(id) ON DELETE CASCADE,
  UNIQUE KEY uk_config_objet_param (objet_id, param_nom)
);

-- ─── Rapports générés ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS rapports (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  rapport_titre    VARCHAR(200) NOT NULL,
  rapport_type     ENUM('consommation','utilisation','statistiques','maintenance') NOT NULL,
  rapport_descrip  LONGTEXT,
  chemin_fichier   VARCHAR(255),
  date_creation    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_rapport_user(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Services/Outils disponibles ───────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  service_type    ENUM('énergie','confort','sécurité','maintenance','autre') NOT NULL,
  objet_categorie_id   INT,
  min_niveau       ENUM('débutant','intermédiaire','avancé','expert') NOT NULL DEFAULT 'débutant',
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (objet_categorie_id) REFERENCES categorie_objets(id) ON DELETE SET NULL
);

-- ─── Alertes et notifications ──────────────────────────────
CREATE TABLE IF NOT EXISTS alertes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT,
  objt_id       INT,
  alerte_type      ENUM('batterie_faible','maintenance','surconsommation','deconnexion','autre') NOT NULL,
  alerte_message   TEXT NOT NULL,
  lue         BOOLEAN DEFAULT FALSE,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_alerte_user(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_alerte_objt(objt_id) REFERENCES objets(id) ON DELETE CASCADE
);

-- ─── Maintenance des appareils ────────────────────────────
CREATE TABLE IF NOT EXISTS main_objet (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  objet_id       INT NOT NULL,
  main_date DATETIME,
  main_type VARCHAR(100),
  statut         ENUM('planifiée','en_cours','complétée') DEFAULT 'planifiée',
  note           TEXT,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_objt(objet_id) REFERENCES objets(id) ON DELETE CASCADE
);

-- Maison de démonstration
INSERT IGNORE INTO maisons (id, nom, code_acces)
VALUES (1, 'Maison principale', 'MAISON2026');

-- Utilisateur Admin (mot de passe : Admin2026!)
-- Hash bcrypt généré pour 'Admin2026!'
-- Utilisateur Admin
INSERT IGNORE INTO users (pseudonyme, mot_de_passe, email, nom, prenom, rolee, role_maison, maison_id, niveau, points, statut)
VALUES (
  'admin',
  '$2a$12$PbPpGP.Kq8QJvNlqPBPEIOk1V/DkWOMkDNEOKBNj.3e3IvdPJDNEO',
  'admin@smarthome.fr',
  'Administrateur',
  'Smart Home',
  'admin',
  'admin',
  1,
  'Expert',
  10.00,
  'Approuvé'
);

-- Utilisateurs exemple
INSERT IGNORE INTO users (pseudonyme, mot_de_passe, email, nom, prenom, rolee, role_maison, maison_id, niveau, points, statut, connexions, actions)
VALUES 
('marie_dupont', '$2a$12$PbPpGP.Kq8QJvNlqPBPEIOk1V/DkWOMkDNEOKBNj.3e3IvdPJDNEO', 'marie@example.com', 'Dupont', 'Marie', 'habitant', 'mère', 1, 'Débutant', 0.75, 'Approuvé', 3, 2),
('jean_martin', '$2a$12$PbPpGP.Kq8QJvNlqPBPEIOk1V/DkWOMkDNEOKBNj.3e3IvdPJDNEO', 'jean@example.com', 'Martin', 'Jean', 'habitant', 'père', 1, 'Intermédiaire', 3.50, 'Approuvé', 8, 6),
('sophia_bernard', '$2a$12$PbPpGP.Kq8QJvNlqPBPEIOk1V/DkWOMkDNEOKBNj.3e3IvdPJDNEO', 'sophia@example.com', 'Bernard', 'Sophia', 'habitant', 'enfant', 1, 'Avancé', 5.75, 'Approuvé', 15, 12);

-- Pièces de la maison
INSERT IGNORE INTO piece_maison (id, nom, description) VALUES
(1, 'Salon', 'Pièce de vie principale'),
(2, 'Chambre', 'Chambre à coucher'),
(3, 'Cuisine', 'Espace cuisine'),
(4, 'Salle de bain', 'Salle de bain'),
(5, 'Entrée', 'Hall d\'entrée'),
(6, 'Garage', 'Garage et stockage'),
(7, 'Couloir', 'Couloir et dégagements');

-- Modules de la plateforme
INSERT IGNORE INTO modules (id, nom, description, icone, ordre) VALUES
(1, 'Information', 'Accès aux informations et recherche', 'info', 1),
(2, 'Visualisation', 'Gestion du profil et consultation des objets', 'dashboard', 2),
(3, 'Gestion', 'Configuration et gestion des objets connectés', 'settings', 3),
(4, 'Administration', 'Administration complète de la plateforme', 'admin', 4);

-- Accès aux modules par niveau
INSERT IGNORE INTO module_access (niveau, module_id) VALUES
('débutant', 1),
('débutant', 2),
('intermédiaire', 1),
('intermédiaire', 2),
('avancé', 1),
('avancé', 2),
('avancé', 3),
('expert', 1),
('expert', 2),
('expert', 3),
('expert', 4);

-- Catégories d'objets
INSERT IGNORE INTO categorie_objets (id, nom, description, icone) VALUES
(1, 'Thermostat', 'Thermostats et régulation thermique', 'thermometer'),
(2, 'Éclairage', 'Ampoules et systèmes d\'éclairage connectés', 'lightbulb'),
(3, 'Sécurité', 'Caméras, serrures et détecteurs', 'shield'),
(4, 'Capteurs', 'Capteurs de température, humidité, etc.', 'sensor'),
(5, 'Électroménager', 'Appareils électroménagers connectés', 'appliance'),
(6, 'Énergie', 'Compteurs et panneaux solaires', 'zap');

-- Services/Outils disponibles
INSERT IGNORE INTO services (id, name, description, service_type, objet_categorie_id, min_niveau) VALUES
(1, 'Contrôle de température', 'Régulation automatique de la température intérieure', 'confort', 1, 'débutant'),
(2, 'Gestion d\'énergie', 'Suivi et optimisation de la consommation énergétique', 'énergie', 6, 'intermédiaire'),
(3, 'Surveillance sécurité', 'Monitoring des caméras et capteurs de sécurité', 'sécurité', 3, 'intermédiaire'),
(4, 'Automatisation', 'Création de scénarios et automatisations', 'autre', NULL, 'avancé'),
(5, 'Rapports détaillés', 'Génération de rapports d\'utilisation avancés', 'autre', NULL, 'expert'),
(6, 'Maintenance', 'Gestion et planification de la maintenance', 'maintenance', NULL, 'avancé');

-- Objets connectés
INSERT IGNORE INTO objets (id, maison_id, nom, type_obj, marque, piece_id, statut,type_connexion, signal_obj, batterie, energie_consommer,description, derniere_connexion)
VALUES
(1, 1, 'Thermostat Salon', 'Thermostat', 'Nest', 1, 'Active', 'Wi-Fi', 'Fort', NULL, 1.20, 'Thermostat intelligent pour réguler la température', '2026-04-25 14:30:00'),
(2, 1, 'Caméra Entrée', 'Caméra', 'Ring', 5, 'Active', 'Wi-Fi', 'Moyen', 47, 0.50, 'Caméra de surveillance de l\'entrée', '2026-04-25 14:25:00'),
(3, 1, 'Ampoule Chambre', 'Éclairage', 'Philips Hue', 2, 'Active', 'Zigbee', 'Fort', NULL, 0.09, 'Ampoule connectée avec contrôle de couleur', '2026-04-25 12:00:00'),
(4, 1, 'Lave-Linge', 'Électroménager', 'Samsung', 3, 'Active', 'Wi-Fi', 'Fort', NULL, 2.10, 'Lave-linge programmable à distance', '2026-04-24 18:00:00'),
(5, 1, 'Capteur Salon', 'Capteur', 'Netatmo', 1, 'Active', 'Wi-Fi', 'Fort', NULL, 0.02, 'Capteur de température et humidité', '2026-04-25 14:32:00'),
(6, 1, 'Serrure Connectée', 'Sécurité', 'August', 5, 'Active', 'Bluetooth', 'Fort', 61, 0.05, 'Serrure intelligente avec accès smartphone', '2026-04-25 14:20:00'),
(7, 1, 'Détecteur Fumée', 'Détecteur', 'Nest', 1, 'Active', 'Wi-Fi', 'Fort', 75, 0.01, 'Détecteur de fumée et monoxyde de carbone', '2026-04-25 10:00:00'),
(8, 1, 'Prise Intelligente', 'Prise', 'TP-Link', 3, 'Active', 'Wi-Fi', 'Fort', NULL, 0.00, 'Prise connectée avec suivi consommation', '2026-04-25 14:35:00');

-- Configuration des objets
INSERT IGNORE INTO config_objet (objet_id, param_nom, param_valeur, param_type) VALUES
(1, 'température_cible', '21', 'température'),
(1, 'mode', 'automatique', 'texte'),
(3, 'luminosité', '80', 'nombre'),
(3, 'couleur', 'blanc_chaud', 'texte'),
(5, 'seuil_humidité', '60', 'nombre'),
(6, 'accès_smartphone', 'activé', 'booléen'),
(8, 'suivi_consommation', 'activé', 'booléen');

-- Alertes exemples
INSERT IGNORE INTO alertes (user_id, objt_id, alerte_type, alerte_message, lue) VALUES
(2, 2, 'batterie_faible', 'La caméra Entrée a une batterie faible (47%)', TRUE),
(3, 7, 'maintenance', 'Le détecteur de fumée nécessite une maintenance prévue', FALSE);

-- Historique des actions
INSERT IGNORE INTO user_actions (user_id, type_action, action_details, points) VALUES
(2, 'connexion', 'Connexion depuis navigateur Web', 0.25),
(2, 'consultation_objet', 'Consultation du Thermostat Salon', 0.50),
(3, 'connexion', 'Connexion depuis navigateur Web', 0.25),
(3, 'consultation_objet', 'Consultation de la Caméra Entrée', 0.50),
(3, 'modification_objet', 'Modification de la température cible du thermostat', 0.50);
