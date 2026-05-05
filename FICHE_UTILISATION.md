# Fiche d'Utilisation — Smart Home

Application de gestion de maison connectée développée avec les frameworks **React + Vite**.

---
## Prérequis 

```bash
# Avoir installé Node.js. Si non, l'installer à cette adresse :
https://nodejs.org/en/download

```


---

## Installation et Lancement

### Installation des dépendances

**Option 1 : Installation complète** (frontend + backend)
```bash
npm install
npm install --prefix backend
```

**Option 2 : Installer uniquement le backend** *(si vous avez le problème `nodemon` non reconnu)*
```bash
npm install --prefix backend
```

> ⚠️ **Important** : Si `npm run dev` vous dit que `nodemon` n'est pas reconnu, c'est que les dépendances du backend ne sont pas installées. Exécutez `npm install --prefix backend`.

### Lancer l'application

**Mode complet** (frontend + backend ensemble)
```bash
npm run dev
```

**Frontend uniquement**
```bash
npm run dev:frontend
```
L'application sera accessible sur **http://localhost:5173**

**Backend uniquement**
```bash
npm run dev:backend
```
L'API sera accessible sur **http://localhost:3000** (voir configuration dans `backend/server.js`)

---

## Architecture des modules

L'application est organisée en **4 modules** avec des accès progressifs selon le niveau de l'utilisateur.

| Module          | URL                | Accès requis              |
|-----------------|--------------------|---------------------------|
| Information     | `/`                | Public (sans connexion)   |
| Visualisation   | `/tableau-de-bord` | Tous les utilisateurs connectés |
| Gestion         | `/gestion`         | Niveau **Avancé** ou **Expert** |
| Administration  | `/admin`           | Niveau **Expert** uniquement |

---

## Comptes de test

Ces comptes sont pré-chargés dans l'application (données mockées).

### Comptes approuvés

| Prénom   | Login            | Mot de passe  | Niveau        | Accès              |
|----------|------------------|---------------|---------------|--------------------|
| Sophie   | `admin_martin`   | `Admin2026!`  | Expert (75 pts)  | Tout (admin inclus) |
| Jérôme   | `jerome_m`       | `Maison2026!` | Avancé (50 pts) | Info + Visu + Gestion |
| Léa      | `lea_martin`     | `Lea2026!`    | Intermédiaire (25 pts) | Info + Visu |
| Tom      | `tom_m`          | `Tom2026!`    | Débutant (0 pts)     | Info + Visu |

### Compte en attente
| Prénom | Login     | Mot de passe | Statut  |
|--------|-----------|--------------|---------|
| Emma   | `emma_b`  | `Emma2026!`  | Pending — connexion bloquée jusqu'à validation par un admin |

> **Conseil** : Commencer avec `admin_martin` pour explorer toutes les fonctionnalités.

---

## Système de niveaux et points

Chaque action en application rapporte des points qui débloquent des modules supplémentaires.

| Niveau        | Points requis | Couleur   | Modules accessibles          |
|---------------|---------------|-----------|------------------------------|
| Débutant      | 0 pts         | Gris      | Information + Visualisation  |
| Intermédiaire | 25 pts        | Bleu      | Information + Visualisation  |
| Avancé        | 50 pts        | Violet    | + Module Gestion             |
| Expert        | 75 pts        | Orange    | + Module Administration      |

### Comment gagner des points

| Action          | Points gagnés |
|-----------------|---------------|
| Connexion       | +0.25 pts     |
| Consultation    | +0.50 pts     |

---

## Description des pages

### Module Information (public)
- **`/`** — Page d'accueil : présentation de la maison connectée
- **`/inscription`** — Créer un nouveau compte (statut *pending* par défaut)
- **`/login`** — Connexion à l'application

### Module Visualisation
- **`/tableau-de-bord`** — Vue d'ensemble des objets et statistiques
- **`/objets`** — Liste de tous les objets connectés
- **`/objets/:id`** — Détail d'un objet connecté avec son historique
- **`/membres`** — Liste des membres du foyer et leurs niveaux
- **`/profil`** — Profil personnel, points et historique de connexion

### Module Gestion *(Avancé/Expert)*
- **`/gestion`** — Tableau de bord de gestion avancée
- **`/gestion/objet/:id`** — Contrôle et configuration d'un objet
- **`/gestion/rapports`** — Rapports de consommation et statistiques

### Module Administration *(Expert uniquement)*
- **`/admin`** — Tableau de bord administrateur
- **`/admin/utilisateurs`** — Gestion des comptes (validation, suppression)
- **`/admin/appareils`** — Ajout et gestion des appareils
- **`/admin/parametres`** — Paramètres globaux de l'application

---

## Objets connectés disponibles

10 appareils sont pré-configurés dans la base de données mock.

| # | Nom                   | Type            | Pièce      | Marque       | Statut   |
|---|-----------------------|-----------------|------------|--------------|----------|
| 1 | Thermostat Salon      | Thermostat      | Salon      | Nest         | Actif    |
| 2 | Caméra Entrée         | Caméra          | Entrée     | Ring         | Actif    |
| 3 | Smart Bulb Chambre    | Éclairage       | Chambre    | Philips Hue  | Inactif  |
| 4 | Lave-Linge Connecté   | Électroménager  | Buanderie  | Samsung      | Actif    |
| 5 | Aspirateur Robot      | Robot           | Salon      | iRobot Roomba| Inactif  |
| 6 | Lave-Vaisselle        | Électroménager  | Cuisine    | Bosch        | Actif    |
| 7 | Serrure Connectée     | Sécurité        | Entrée     | Yale         | Actif    |
| 8 | Capteur CO₂ Cuisine   | Capteur         | Cuisine    | Airthings    | Actif    |
| 9 | Panneau Solaire       | Énergie         | Toit       | SolarEdge    | Actif    |
|10 | Thermostat Chambre    | Thermostat      | Chambre    | Honeywell    | Actif    |

---

## Persistance des données

Les données sont stockées dans le **localStorage** du navigateur sous les clés suivantes :

| Clé                | Contenu                          |
|--------------------|----------------------------------|
| `sh_users`         | Liste des utilisateurs           |
| `sh_current_user`  | Utilisateur actuellement connecté|
| `sh_devices`       | Liste des appareils              |

> Pour **réinitialiser** l'application, ouvrir la console du navigateur et exécuter :
> ```js
> localStorage.clear(); location.reload();
> ```

---

## Stack technique

| Technologie     | Usage                          |
|-----------------|-------------------------------|
| React 18        | Framework UI                  |
| Vite 5          | Bundler et serveur de dev     |
| React Router 6  | Navigation entre les pages    |
| Recharts        | Graphiques et visualisations  |
| Lucide React    | Icônes                        |

---

## Notes pour les partenaires

- **Aucune API ni base de données réelle** — tout est simulé via `mockData.js` et `localStorage`.
- Pour ajouter un utilisateur de test, modifier directement le tableau `USERS` dans `src/data/mockData.js`.
- Pour ajouter un appareil, modifier le tableau `DEVICES` dans `src/data/mockData.js`.
- Le compte `emma_b` est volontairement en statut `pending` pour illustrer le flux de validation admin.
