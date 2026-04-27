# 📊 Documentation Complète de la Base de Données Smart Home

**Projet:** Maison Intelligente et Connectée  
**Version:** 1.0  
**Date:** 25 Avril 2026  
**Base de Données:** MySQL 5.7+

---

## 📑 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture Générale](#architecture-générale)
3. [Description des Tables](#description-des-tables)
4. [Relations entre les Tables](#relations-entre-les-tables)
5. [Exemples de Requêtes](#exemples-de-requêtes)

---

## 🎯 Vue d'ensemble

Cette base de données gère une **plateforme de maison intelligente** permettant aux utilisateurs de :
- S'inscrire et se connecter
- Consulter et contrôler des appareils connectés
- Générer des rapports
- Accumuler des points pour débloquer de nouvelles fonctionnalités
- Recevoir des alertes et notifications

### Concepts Clés

**4 Modes d'utilisateurs :**
- 🟢 **Visiteur** : Accès public, pas connecté
- 🟡 **Simple** : Débutant/Intermédiaire (consultation)
- 🟠 **Complexe** : Avancé (gestion)
- 🔴 **Admin** : Expert (administration totale)

**Système de Points :**
- Connexion : +0.25 points
- Consultation d'objet : +0.50 points
- Modification : +0.50 points
- Déblocage automatique quand points ≥ seuil niveau

---

## 🏗️ Architecture Générale

```
┌─────────────────────────────────────┐
│         UTILISATEURS (users)        │
│  - 4 niveaux : débutant → expert   │
│  - Système de points                │
│  - Gestion du profil                │
└──────────────────┬──────────────────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
    ┌────────┐ ┌────────┐ ┌──────────┐
    │Modules │ │Actions │ │Connexions│
    │ (droits)│ │(points)│ │ (suivi)  │
    └────────┘ └────────┘ └──────────┘

┌──────────────────────────────────────┐
│    APPAREILS CONNECTÉS (devices)    │
│  - Type, marque, état                │
│  - Batterie, énergie, connectivité   │
│  - Liés aux pièces (rooms)           │
└──────────────┬───────────────────────┘
               │
    ┌──────────┼──────────┬─────────┐
    ▼          ▼          ▼         ▼
┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐
│ Config │ │ Données│ │Alertes│ │Maintenance│
│(params)│ │(history)│ │(notif)│ │(planning)│
└────────┘ └────────┘ └──────┘ └────────┘

┌──────────────────────────────────────┐
│   INFRASTRUCTURE (modules, services)  │
│  - 4 modules                          │
│  - Contrôle d'accès                   │
│  - Services/outils                    │
└──────────────────────────────────────┘
```

---

## 📋 Description des Tables

### 1️⃣ TABLE : USERS (Utilisateurs)

**Objectif:** Gérer les utilisateurs/occupants de la maison

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  role ENUM('admin','habitant'),
  niveau ENUM('débutant','intermédiaire','avancé','expert'),
  points DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  photo TEXT,
  status ENUM('active','pending','rejected'),
  connexions INT NOT NULL DEFAULT 0,
  actions INT NOT NULL DEFAULT 0,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique auto-incrémenté | 1, 2, 3 |
| **login** | VARCHAR(50) | Identifiant unique pour connexion | `marie_dupont`, `jean_martin` |
| **password_hash** | VARCHAR(255) | Mot de passe chiffré en bcrypt (JAMAIS en clair!) | `$2a$12$PbPpGP...` |
| **email** | VARCHAR(100) | Email unique (récupération compte, notifications) | `marie@example.com` |
| **nom** | VARCHAR(100) | Nom de famille | `Dupont`, `Martin` |
| **prenom** | VARCHAR(100) | Prénom de l'utilisateur | `Marie`, `Jean` |
| **role** | ENUM | Rôle : admin OU habitant normal | `admin` ou `habitant` |
| **niveau** | ENUM | Niveau d'expérience/compétence | `débutant`, `intermédiaire`, `avancé`, `expert` |
| **points** | DECIMAL | Points accumulés (gagnés par actions) | 0.75, 3.50, 5.75 |
| **photo** | TEXT | Photo de profil (base64 ou chemin) | Base64 image ou `/uploads/photos/123.jpg` |
| **status** | ENUM | État de l'inscription | `pending` (en attente), `active` (approuvé), `rejected` |
| **connexions** | INT | Nombre total de connexions | 3, 8, 15 |
| **actions** | INT | Nombre total d'actions effectuées | 2, 6, 12 |
| **last_login** | DATETIME | Dernière connexion | `2026-04-25 14:30:00` |
| **created_at** | DATETIME | Date d'inscription | `2026-04-20 10:15:00` |

**Exemple de données :**
```
ID | login | email | nom | prenom | role | niveau | points | status | connexions
1  | admin | admin@smarthome.fr | Administrateur | Smart Home | admin | expert | 10.00 | active | ∞
2  | marie_dupont | marie@example.com | Dupont | Marie | habitant | débutant | 0.75 | active | 3
3  | jean_martin | jean@example.com | Martin | Jean | habitant | intermédiaire | 3.50 | active | 8
```

**Logique métier :**
- Le **login** doit être unique (deux utilisateurs ne peuvent pas avoir le même identifiant)
- Le **password_hash** ne stocke JAMAIS le mot de passe en clair (bcrypt)
- **niveau** détermine les modules accessibles
- **points** débloqent automatiquement les niveaux (0 → débutant, 3 → intermédiaire, 5 → avancé, 7 → expert)
- **status='pending'** signifie attente d'approbation admin
- **connexions** et **actions** sont incrémentés à chaque action pour le calcul des points

---

### 2️⃣ TABLE : ROOMS (Pièces de la Maison)

**Objectif:** Organiser les appareils par localisation

```sql
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **name** | VARCHAR(100) | Nom de la pièce (UNIQUE) | `Salon`, `Chambre`, `Cuisine` |
| **description** | TEXT | Description détaillée | `Pièce de vie principale avec canapé et TV` |
| **created_at** | DATETIME | Date de création | `2026-04-20 09:00:00` |

**Exemple de données :**
```
ID | name | description
1  | Salon | Pièce de vie principale
2  | Chambre | Chambre à coucher
3  | Cuisine | Espace cuisine
4  | Salle de bain | Salle de bain
5  | Entrée | Hall d'entrée
6  | Garage | Garage et stockage
7  | Couloir | Couloir et dégagements
```

**Logique métier :**
- Chaque **appareil** doit être assigné à une **pièce**
- Permet de **filtrer les appareils par localisation**
- Exemple requête : "Affiche-moi tous les appareils du Salon"

---

### 3️⃣ TABLE : DEVICES (Appareils Connectés)

**Objectif:** Stocker les informations sur tous les objets connectés

```sql
CREATE TABLE devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  brand VARCHAR(50),
  room_id INT NOT NULL,
  status ENUM('active','inactive'),
  connectivity VARCHAR(30),
  signal VARCHAR(20),
  battery INT,
  energy_consumption DECIMAL(8,2),
  description TEXT,
  last_seen DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **name** | VARCHAR(100) | Nom descriptif de l'appareil | `Thermostat Salon`, `Caméra Entrée` |
| **type** | VARCHAR(50) | Type/catégorie d'appareil | `Thermostat`, `Caméra`, `Éclairage` |
| **brand** | VARCHAR(50) | Marque du fabricant | `Nest`, `Ring`, `Philips Hue` |
| **room_id** | INT | Lien à la pièce (FOREIGN KEY) | 1 (Salon), 5 (Entrée) |
| **status** | ENUM | État de fonctionnement | `active` (fonctionne), `inactive` (éteint) |
| **connectivity** | VARCHAR(30) | Type de connexion | `Wi-Fi`, `Zigbee`, `Bluetooth` |
| **signal** | VARCHAR(20) | Force du signal de connexion | `Fort`, `Moyen`, `Faible` |
| **battery** | INT | Niveau de batterie (%) | 47, 61, 75, NULL (pas de batterie) |
| **energy_consumption** | DECIMAL(8,2) | Consommation énergétique (kWh) | 1.20, 0.50, 2.10 |
| **description** | TEXT | Description longue de l'appareil | `Thermostat intelligent pour réguler la température` |
| **last_seen** | DATETIME | Dernière communication avec l'appareil | `2026-04-25 14:30:00` |
| **created_at** | DATETIME | Date d'ajout à la plateforme | `2026-04-20 10:00:00` |

**Exemple de données :**
```
ID | name | type | brand | room_id | status | connectivity | battery | energy_consumption
1  | Thermostat Salon | Thermostat | Nest | 1 | active | Wi-Fi | NULL | 1.20
2  | Caméra Entrée | Caméra | Ring | 5 | active | Wi-Fi | 47 | 0.50
3  | Ampoule Chambre | Éclairage | Philips Hue | 2 | active | Zigbee | NULL | 0.09
4  | Lave-Linge | Électroménager | Samsung | 3 | active | Wi-Fi | NULL | 2.10
```

**Logique métier :**
- **Centre du projet** : tous les autres objets se rapportent aux appareils
- **room_id** lie l'appareil à une pièce (clé étrangère)
- **status** permet de détecter les appareils défaillants
- **battery** null = appareil branché sur secteur
- **signal** = indicateur de santé du réseau
- **last_seen** = détaut de déconnexion

---

### 4️⃣ TABLE : DEVICE_HISTORY (Historique des Données)

**Objectif:** Tracer l'évolution des mesures de chaque appareil

```sql
CREATE TABLE device_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  value DECIMAL(10,2),
  unit VARCHAR(20),
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique du record | 1, 2, 3 |
| **device_id** | INT | Lien à l'appareil (FOREIGN KEY) | 1 (Thermostat Salon) |
| **value** | DECIMAL(10,2) | Valeur mesurée | 21.5, 800, 65 |
| **unit** | VARCHAR(20) | Unité de mesure | `°C`, `kWh`, `%`, `L/min` |
| **recorded_at** | DATETIME | Moment de la mesure | `2026-04-25 14:30:00` |

**Exemple de données :**
```
ID | device_id | value | unit | recorded_at
1  | 1 (Thermostat) | 21.5 | °C | 2026-04-25 14:30:00
2  | 1 (Thermostat) | 21.3 | °C | 2026-04-25 14:31:00
3  | 2 (Caméra) | 450 | pixels | 2026-04-25 14:30:15
4  | 4 (Lave-Linge) | 2.10 | kWh | 2026-04-25 15:00:00
```

**Logique métier :**
- **Série temporelle** : enregistre chaque mesure avec le timestamp
- Même table pour **tous types de données** (flexible)
- Permet de créer des **graphiques d'évolution** (température jour/semaine/mois)
- Exemple : "Quelle était la température du salon il y a 7 jours à 14h30 ?"

---

### 5️⃣ TABLE : LOGIN_HISTORY (Historique des Connexions)

**Objectif:** Tracer chaque connexion d'utilisateur

```sql
CREATE TABLE login_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **user_id** | INT | Lien à l'utilisateur (FOREIGN KEY) | 2 (Marie) |
| **login_time** | DATETIME | Moment de la connexion | `2026-04-25 14:30:00` |

**Exemple de données :**
```
ID | user_id | login_time
1  | 2 | 2026-04-25 14:30:00
2  | 2 | 2026-04-25 10:15:00
3  | 3 | 2026-04-25 14:35:00
```

**Logique métier :**
- **Trace CHAQUE connexion** (audit/sécurité)
- Utilisé pour **compter les points** (0.25 pts/connexion)
- Admin peut voir "qui s'est connecté quand" (rapports)
- Détecte les **accès suspects**

---

### 6️⃣ TABLE : MODULES (Liste des Modules)

**Objectif:** Définir les 4 modules de la plateforme

```sql
CREATE TABLE modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  ordre INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3, 4 |
| **name** | VARCHAR(50) | Nom du module (UNIQUE) | `Information`, `Visualisation`, `Gestion`, `Administration` |
| **description** | TEXT | Description du module | `Gestion du profil et consultation des objets` |
| **icon** | VARCHAR(50) | Icône à afficher | `info`, `dashboard`, `settings`, `admin` |
| **ordre** | INT | Ordre d'affichage dans le menu | 1, 2, 3, 4 |
| **created_at** | DATETIME | Date de création | `2026-04-20 09:00:00` |

**Exemple de données :**
```
ID | name | description | ordre
1  | Information | Accès aux informations et recherche (visiteurs) | 1
2  | Visualisation | Gestion du profil et consultation des objets | 2
3  | Gestion | Configuration et gestion des objets connectés | 3
4  | Administration | Administration complète de la plateforme | 4
```

**Logique métier :**
- **Maître des droits d'accès** : chaque utilisateur n'accède que s'il a les droits
- Les 4 modules sont les **sections principales du site**
- Les droits sont définis dans `module_access`

---

### 7️⃣ TABLE : MODULE_ACCESS (Droits d'Accès)

**Objectif:** Définir qui accède à quel module selon le niveau

```sql
CREATE TABLE module_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  niveau ENUM('débutant','intermédiaire','avancé','expert'),
  module_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_niveau_module (niveau, module_id),
  FOREIGN KEY (module_id) REFERENCES modules(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **niveau** | ENUM | Niveau de l'utilisateur | `débutant`, `intermédiaire`, `avancé`, `expert` |
| **module_id** | INT | Lien au module (FOREIGN KEY) | 1, 2, 3, 4 |
| **created_at** | DATETIME | Date de création | `2026-04-20 09:00:00` |

**Exemple de données :**
```
ID | niveau | module_id | Signification
1  | débutant | 1 | Débutant a accès à Information
2  | débutant | 2 | Débutant a accès à Visualisation
3  | intermédiaire | 1 | Intermédiaire a accès à Information
4  | intermédiaire | 2 | Intermédiaire a accès à Visualisation
5  | avancé | 1 | Avancé a accès à Information
6  | avancé | 2 | Avancé a accès à Visualisation
7  | avancé | 3 | Avancé a accès à Gestion ⭐
8  | expert | 1 | Expert a accès à Information
9  | expert | 2 | Expert a accès à Visualisation
10 | expert | 3 | Expert a accès à Gestion
11 | expert | 4 | Expert a accès à Administration ⭐⭐
```

**Logique métier :**
- **Contrôle d'accès centralisé** : une seule table pour tous les droits
- `UNIQUE KEY` garantit pas de doublons (1 entrée par niveau-module)
- Accès hiérarchique :
  - 🟢 Débutant/Intermédiaire : Information + Visualisation
  - 🟠 Avancé : + Gestion
  - 🔴 Expert : + Administration

---

### 8️⃣ TABLE : DEVICE_CATEGORIES (Catégories d'Appareils)

**Objectif:** Organiser les appareils par catégorie

```sql
CREATE TABLE device_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **name** | VARCHAR(100) | Nom de la catégorie (UNIQUE) | `Thermostat`, `Éclairage`, `Sécurité` |
| **description** | TEXT | Description détaillée | `Thermostats et régulation thermique` |
| **icon** | VARCHAR(50) | Icône à afficher | `thermometer`, `lightbulb`, `shield` |
| **created_at** | DATETIME | Date de création | `2026-04-20 09:00:00` |

**Exemple de données :**
```
ID | name | description
1  | Thermostat | Thermostats et régulation thermique
2  | Éclairage | Ampoules et systèmes d'éclairage connectés
3  | Sécurité | Caméras, serrures et détecteurs
4  | Capteurs | Capteurs de température, humidité, etc.
5  | Électroménager | Appareils électroménagers connectés
6  | Énergie | Compteurs et panneaux solaires
```

**Logique métier :**
- Permet les **filtres de recherche avancée**
- Example : "Montre-moi tous les appareils d'Éclairage"
- Utilisé dans `services` pour lier services à catégories

---

### 9️⃣ TABLE : USER_ACTIONS (Historique des Actions)

**Objectif:** Tracer chaque action pour le système de points

```sql
CREATE TABLE user_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action_type ENUM('connexion','consultation_objet','modification_objet','creation_objet','suppression_objet','autres'),
  action_details VARCHAR(255),
  points_earned DECIMAL(4,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_action (user_id, created_at)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **user_id** | INT | Lien à l'utilisateur (FOREIGN KEY) | 2 (Marie) |
| **action_type** | ENUM | Type d'action effectuée | `connexion`, `consultation_objet`, `modification_objet` |
| **action_details** | VARCHAR(255) | Détails/description de l'action | `Consultation du Thermostat Salon` |
| **points_earned** | DECIMAL(4,2) | Points gagnés pour cette action | 0.25, 0.50, 0.75 |
| **created_at** | DATETIME | Moment de l'action | `2026-04-25 14:30:00` |

**Exemple de données :**
```
ID | user_id | action_type | action_details | points_earned | created_at
1  | 2 | connexion | Connexion Web | 0.25 | 2026-04-25 14:30:00
2  | 2 | consultation_objet | Consul. Thermostat Salon | 0.50 | 2026-04-25 14:31:00
3  | 3 | connexion | Connexion Web | 0.25 | 2026-04-25 14:35:00
4  | 3 | consultation_objet | Consul. Caméra Entrée | 0.50 | 2026-04-25 14:36:00
5  | 3 | modification_objet | Modif. Température | 0.50 | 2026-04-25 14:37:00
```

**Logique métier :**
- **Moteur du système de points**
- Chaque action gagne des points :
  - Connexion : +0.25 pts
  - Consultation : +0.50 pts
  - Modification : +0.50 pts
- Points accumulés → déblocage automatique des niveaux
- Permet les **rapports** ("Marie a 15 actions ce mois")

**Système de Points :**
```
0 → 3 pts = Passage Débutant → Intermédiaire
3 → 5 pts = Passage Intermédiaire → Avancé (débloque Gestion)
5 → 7 pts = Passage Avancé → Expert (débloque Administration)
```

---

### 🔟 TABLE : DEVICE_CONFIGURATIONS (Configuration des Appareils)

**Objectif:** Stocker les paramètres personnalisables de chaque appareil

```sql
CREATE TABLE device_configurations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  param_name VARCHAR(100) NOT NULL,
  param_value VARCHAR(255),
  param_type ENUM('température','temps','nombre','texte','booléen'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **device_id** | INT | Lien à l'appareil (FOREIGN KEY) | 1 (Thermostat Salon) |
| **param_name** | VARCHAR(100) | Nom du paramètre | `température_cible`, `luminosité`, `mode` |
| **param_value** | VARCHAR(255) | Valeur du paramètre | `21`, `80`, `automatique` |
| **param_type** | ENUM | Type de données du param | `température`, `nombre`, `texte`, `booléen` |
| **created_at** | DATETIME | Date de création | `2026-04-20 09:00:00` |
| **updated_at** | DATETIME | Date de dernière modification | `2026-04-25 14:30:00` |

**Exemple de données :**
```
ID | device_id (Appareil) | param_name | param_value | param_type
1  | 1 (Thermostat) | température_cible | 21 | température
2  | 1 (Thermostat) | mode | automatique | texte
3  | 3 (Ampoule) | luminosité | 80 | nombre
4  | 3 (Ampoule) | couleur | blanc_chaud | texte
5  | 5 (Capteur) | seuil_humidité | 60 | nombre
6  | 6 (Serrure) | accès_smartphone | activé | booléen
7  | 8 (Prise) | suivi_consommation | activé | booléen
```

**Logique métier :**
- **Configuration flexible** : chaque appareil a ses propres paramètres
- Thermostat : température_cible, mode (automatique/manuel)
- Ampoule : luminosité (0-100), couleur (chaud/froid)
- Même table pour **TOUS types** de params = flexible et extensible
- `param_type` aide à la validation frontend

---

### 1️⃣1️⃣ TABLE : REPORTS (Rapports Générés)

**Objectif:** Stocker les rapports générés par les utilisateurs

```sql
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  report_title VARCHAR(200) NOT NULL,
  report_type ENUM('consommation','utilisation','statistiques','maintenance'),
  report_content LONGTEXT,
  file_path VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **user_id** | INT | Qui a généré le rapport (FOREIGN KEY) | 3 (Sophia) |
| **report_title** | VARCHAR(200) | Titre du rapport | `Consommation Mars 2026` |
| **report_type** | ENUM | Type de rapport | `consommation`, `utilisation`, `statistiques` |
| **report_content** | LONGTEXT | Contenu (HTML/JSON/Text) | HTML formaté ou JSON |
| **file_path** | VARCHAR(255) | Chemin du fichier généré | `/reports/rapport_123.pdf` |
| **created_at** | DATETIME | Quand a été généré | `2026-04-25 15:00:00` |

**Exemple de données :**
```
ID | user_id | report_title | report_type | file_path
1  | 3 | Consommation Mars 2026 | consommation | /reports/conso_2026_03.pdf
2  | 3 | Utilisation des appareils | utilisation | /reports/util_123.pdf
3  | 1 | Statistiques admin | statistiques | /reports/stats_admin.pdf
```

**Logique métier :**
- Génération de rapports PDF/CSV/JSON
- Module "Gestion" et "Administration" peuvent générer
- Historique complet des rapports
- Téléchargement possible

---

### 1️⃣2️⃣ TABLE : SERVICES (Services/Outils Disponibles)

**Objectif:** Lister les services/outils accessibles aux utilisateurs

```sql
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  service_type ENUM('énergie','confort','sécurité','maintenance','autre'),
  device_category_id INT,
  min_level ENUM('débutant','intermédiaire','avancé','expert'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_category_id) REFERENCES device_categories(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **name** | VARCHAR(150) | Nom du service | `Contrôle de température` |
| **description** | TEXT | Description détaillée | `Régulation automatique de la température` |
| **service_type** | ENUM | Type de service | `confort`, `énergie`, `sécurité`, `maintenance` |
| **device_category_id** | INT | Catégorie liée (FOREIGN KEY) | 1 (Thermostat) |
| **min_level** | ENUM | Niveau minimum requis | `débutant`, `avancé`, `expert` |
| **created_at** | DATETIME | Date de création | `2026-04-20 09:00:00` |

**Exemple de données :**
```
ID | name | service_type | min_level | Accessibilité
1  | Contrôle de température | confort | débutant | ✓ Débutant
2  | Gestion d'énergie | énergie | intermédiaire | ✓ Intermédiaire
3  | Surveillance sécurité | sécurité | intermédiaire | ✓ Intermédiaire
4  | Automatisation | autre | avancé | ✓ Avancé
5  | Rapports détaillés | autre | expert | ✓ Expert
6  | Maintenance | maintenance | avancé | ✓ Avancé
```

**Logique métier :**
- **Liste des services** proposés par la plateforme
- Contrôle d'accès par service (niveau minimum requis)
- Facilite l'affichage "Services disponibles selon ton niveau"

---

### 1️⃣3️⃣ TABLE : ALERTS (Alertes/Notifications)

**Objectif:** Gérer les alertes et notifications

```sql
CREATE TABLE alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  device_id INT,
  alert_type ENUM('batterie_faible','maintenance','surconsommation','deconnexion','autre'),
  alert_message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **user_id** | INT | Pour quel utilisateur (FOREIGN KEY) | 2 (Marie) |
| **device_id** | INT | À propos de quel appareil (FOREIGN KEY) | 2 (Caméra Entrée) |
| **alert_type** | ENUM | Type d'alerte | `batterie_faible`, `maintenance`, `surconsommation` |
| **alert_message** | TEXT | Message à afficher | `La caméra Entrée a une batterie faible (47%)` |
| **is_read** | BOOLEAN | Lue ou non lue | `FALSE` (nouvelle), `TRUE` (lue) |
| **created_at** | DATETIME | Quand l'alerte s'est déclenchée | `2026-04-25 14:30:00` |

**Exemple de données :**
```
ID | user_id | device_id (Appareil) | alert_type | alert_message | is_read
1  | 2 | 2 (Caméra) | batterie_faible | Batterie 47% | TRUE
2  | 3 | 7 (Détecteur) | maintenance | Maintenance prévue | FALSE
```

**Logique métier :**
- **Notifications intelligentes** : système d'alertes proactif
- Alertes automatiques si batterie < 20%, consommation anormale, etc.
- `is_read` permet les **badges de notifications** (nombre d'alertes non lues)
- Utilisateurs voient les alertes importantes
- Admin reçoit alertes concernant toute la plateforme

---

### 1️⃣4️⃣ TABLE : DEVICE_MAINTENANCE (Maintenance Planifiée)

**Objectif:** Gérer la maintenance préventive des appareils

```sql
CREATE TABLE device_maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  maintenance_date DATETIME,
  maintenance_type VARCHAR(100),
  status ENUM('planifiée','en_cours','complétée'),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | INT | Identifiant unique | 1, 2, 3 |
| **device_id** | INT | Quel appareil (FOREIGN KEY) | 7 (Détecteur Fumée) |
| **maintenance_date** | DATETIME | Date planifiée de la maintenance | `2026-05-10 10:00:00` |
| **maintenance_type** | VARCHAR(100) | Type de maintenance | `Batterie`, `Nettoyage`, `Vérification` |
| **status** | ENUM | État de la maintenance | `planifiée`, `en_cours`, `complétée` |
| **notes** | TEXT | Détails/commentaires | `Remplacer batterie CR2032` |
| **created_at** | DATETIME | Quand la maintenance a été planifiée | `2026-04-20 09:00:00` |

**Exemple de données :**
```
ID | device_id | maintenance_date | maintenance_type | status | notes
1  | 7 | 2026-05-10 10:00 | Batterie | planifiée | Remplacer pile CR2032
2  | 2 | 2026-05-15 15:00 | Nettoyage | planifiée | Nettoyer lentille caméra
3  | 1 | 2026-04-28 14:00 | Vérification | en_cours | Test de connexion
```

**Logique métier :**
- **Maintenance préventive** : planifier les révisions
- Module "Gestion" peut créer des maintenances
- Admin reçoit des alertes si maintenance dépassée
- Permet un suivi complet de l'historique de maintenance

---

## 🔗 Relations entre les Tables

```
users ← → login_history
  ↓
  ├─ role (admin/habitant)
  ├─ niveau (débutant/intermédiaire/avancé/expert)
  └─ points (accumulés via user_actions)

devices ← → device_history
  ↓       (mesures enregistrées)
  └─ room_id → rooms

user_actions
  ↓
  user_id → users

device_configurations
  ↓
  device_id → devices

module_access
  ├─ niveau (utilisateurs)
  └─ module_id → modules

services
  └─ device_category_id → device_categories

device_categories
  ← utilisé par services

alerts
  ├─ user_id → users
  └─ device_id → devices

device_maintenance
  └─ device_id → devices

reports
  └─ user_id → users
```

---

## 📊 Exemples de Requêtes

### Afficher tous les appareils du Salon
```sql
SELECT d.* FROM devices d
JOIN rooms r ON d.room_id = r.id
WHERE r.name = 'Salon' AND d.status = 'active';
```

### Compter les points gagnés par Marie
```sql
SELECT SUM(points_earned) as total_points 
FROM user_actions 
WHERE user_id = 2;
```

### Afficher les alertes non lues de Marie
```sql
SELECT * FROM alerts 
WHERE user_id = 2 AND is_read = FALSE 
ORDER BY created_at DESC;
```

### Obtenir l'évolution température du Salon (7 derniers jours)
```sql
SELECT d.name, dh.value, dh.recorded_at 
FROM device_history dh
JOIN devices d ON dh.device_id = d.id
WHERE d.room_id = 1 AND dh.recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY dh.recorded_at;
```

### Vérifier les modules accessibles pour un utilisateur
```sql
SELECT m.name FROM modules m
JOIN module_access ma ON m.id = ma.module_id
WHERE ma.niveau = (SELECT niveau FROM users WHERE id = 2);
```

---

## 🔐 Sécurité et Bonnes Pratiques

✅ **À FAIRE :**
- Toujours utiliser `password_hash` (bcrypt, jamais en clair)
- Valider les entrées utilisateur côté serveur
- Utiliser des FOREIGN KEYS pour l'intégrité
- Indexer les colonnes fréquemment cherchées
- Faire des sauvegardes régulières
- Chiffrer les données sensibles en transit (HTTPS)

❌ **À ÉVITER :**
- Stocker les mots de passe en clair
- Négliger la validation des données
- Ignorer les FOREIGN KEYS
- Supprimer des données sans sauvegarde
- Exposer les détails d'erreurs aux utilisateurs

---

## 📝 Conclusion

Cette base de données a été conçue pour :
- ✅ Gérer 4 types d'utilisateurs avec droits hiérarchiques
- ✅ Implémenter un système de points pour déblocage de niveaux
- ✅ Tracer toutes les actions/connexions
- ✅ Stocker les données d'appareils et leur historique
- ✅ Générer des rapports et alertes
- ✅ Organiser les appareils par pièce et catégorie
- ✅ Gérer la maintenance préventive

Elle est **flexible, extensible et sécurisée** pour supporter le projet Smart Home selon le cahier des charges.

---

**Document créé le:** 25 Avril 2026  
**Version:** 1.0  
**Auteur:** Système d'Intelligence Artificielle  
**Licence:** Libre d'utilisation pour le projet Smart Home
