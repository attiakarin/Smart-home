# Fiche d'Utilisation — Smart Home

Application de gestion de maison connectée développée avec **React + Vite** (frontend) et **Express.js + PostgreSQL** (backend).

---

## Prérequis

- **Node.js** ≥ 18 — [https://nodejs.org/en/download](https://nodejs.org/en/download)
- **PostgreSQL** — base de données relationnelle requise pour le backend
- Un fichier `.env` dans `backend/` (voir `backend/.env.example`)

---

## Installation et Lancement

### Installation des dépendances

```bash
# Depuis la racine du projet
npm install
npm install --prefix backend
```

> ⚠️ Si `npm run dev` signale que `nodemon` n'est pas reconnu, exécuter : `npm install --prefix backend`

### Lancer l'application

**Mode complet** (frontend + backend en parallèle)
```bash
npm run dev
```

**Frontend uniquement**
```bash
npm run dev:frontend
```
Accessible sur **http://localhost:5173**

**Backend uniquement**
```bash
npm run dev:backend
```
API REST accessible sur **http://localhost:3000**

---

## Architecture des modules

L'application est organisée en **4 modules** avec des accès progressifs selon le niveau de l'utilisateur.

| Module         | URL                | Accès requis                          |
|----------------|--------------------|---------------------------------------|
| Information    | `/`                | Public (sans connexion)               |
| Visualisation  | `/tableau-de-bord` | Tout utilisateur connecté             |
| Gestion        | `/gestion`         | Niveau **Intermédiaire** minimum      |
| Administration | `/admin`           | Niveau **Expert** + rôle `admin`      |

---

## Comptes de test

Les comptes sont enregistrés en base de données PostgreSQL.

### Comptes approuvés

| Prénom | Login          | Mot de passe  | Niveau              | Accès                       |
|--------|----------------|---------------|---------------------|-----------------------------|
| Sophie | `admin_martin` | `Admin2026!`  | Expert (75 pts)     | Tout (admin inclus)         |
| Jérôme | `jerome_m`     | `Maison2026!` | Avancé (50 pts)     | Info + Visu + Gestion       |
| Léa    | `lea_martin`   | `Lea2026!`    | Intermédiaire (25 pts) | Info + Visu + Gestion    |
| Tom    | `tom_m`        | `Tom2026!`    | Débutant (0 pts)    | Info + Visu                 |

### Compte en attente
| Prénom | Login    | Mot de passe | Statut                                              |
|--------|----------|--------------|-----------------------------------------------------|
| Emma   | `emma_b` | `Emma2026!`  | Pending — connexion bloquée jusqu'à validation admin |

> **Conseil** : Commencer avec `admin_martin` pour explorer toutes les fonctionnalités.

---

## Système de niveaux et points

Chaque action rapporte des points qui débloquent des modules supplémentaires.

| Niveau        | Points requis | Couleur   | Modules accessibles                  |
|---------------|---------------|-----------|--------------------------------------|
| Débutant      | 0 pts         | Gris      | Information + Visualisation          |
| Intermédiaire | 25 pts        | Bleu      | + Module Gestion (activer/désactiver)|
| Avancé        | 50 pts        | Violet    | + Création/configuration d'objets, Rapports |
| Expert        | 75 pts        | Orange    | + Module Administration (si rôle admin) |

### Comment gagner des points

| Action       | Points gagnés |
|--------------|---------------|
| Connexion    | +0.25 pts     |
| Consultation | +0.50 pts     |

---

## Description des pages

### Module Information (public)
- **`/`** — Page d'accueil : présentation de la maison connectée
- **`/catalogue-maison`** — Catalogue public des objets connectés disponibles
- **`/energie`** — Page publique sur la gestion d'énergie
- **`/securite`** — Page publique sur la sécurité domicile
- **`/creer-maison`** — Création d'une nouvelle maison (premier admin)
- **`/inscription`** — Créer un compte (statut *pending* par défaut)
- **`/login`** — Connexion

### Module Visualisation
- **`/tableau-de-bord`** — Vue d'ensemble des objets, statistiques et accès rapides
- **`/objets`** — Liste de tous les objets connectés de la maison
- **`/objets/:id`** — Détail d'un objet : état, paramètres, historique
- **`/services`** — Services interactifs : confort, sécurité, énergie, automatisation (programmation horaire)
- **`/demandes-admin`** — Messagerie entre habitants et admin : créer/suivre une demande, recevoir une réponse
- **`/membres`** — Liste des membres du foyer avec niveaux et points
- **`/profil`** — Profil personnel, points et historique de connexion

### Module Gestion *(Intermédiaire minimum)*
- **`/gestion`** — Tableau de bord de gestion avancée
- **`/gestion/objet/:id`** — Contrôle et configuration détaillée d'un objet
- **`/gestion/rapports`** — Rapports de consommation et statistiques *(Avancé minimum)*

### Module Administration *(Expert + rôle admin)*
- **`/admin`** — Tableau de bord administrateur
- **`/admin/utilisateurs`** — Gestion des comptes : validation, modification, suppression
- **`/admin/objets`** — Ajout, modification et suppression des objets connectés
- **`/admin/consommation`** — Historique des dépassements de consommation et alertes
- **`/admin/parametres`** — Paramètres globaux : nom de la plateforme, couleur, inscriptions, mode maintenance

---

## Système de demandes (messagerie admin ↔ habitant)

La page **`/demandes-admin`** permet :

- **Habitant** : créer une demande (ajout objet, configuration, maintenance, droits, autre), suivre son statut, échanger des messages avec l'admin
- **Admin (Expert)** : voir toutes les demandes, répondre, changer le statut, attribuer des points bonus

| Statut    | Description                          |
|-----------|--------------------------------------|
| Nouvelle  | Demande soumise, pas encore traitée  |
| En cours  | Prise en charge par l'admin          |
| Traitée   | Demande résolue                      |
| Refusée   | Demande rejetée                      |

> Le badge de notification sur "Demandes" n'apparaît que pour les demandes au statut **Nouvelle** (non fermées).

---

## Services interactifs (`/services`)

La page Services permet d'appliquer des scénarios sur les objets compatibles :

| Service      | Types d'objets compatibles                     | Action disponible                    |
|--------------|------------------------------------------------|--------------------------------------|
| Confort      | Thermostat, Éclairage, Sèche-serviette         | Définir une température cible        |
| Sécurité     | Caméra, Capteur, Détecteur, Sécurité           | Activer la surveillance (mode)       |
| Énergie      | Tout objet actif                               | Passer en mode éco / désactiver      |
| Automatisation | Tout objet                                   | Programmer une plage horaire (jours + heures) |

> Les services nécessitent d'être connecté. L'application des scénarios appelle l'API backend.

---

## Persistance des données

Les données sont stockées en **base de données PostgreSQL** côté serveur. Seules quelques préférences légères sont conservées côté client :

| Clé localStorage   | Contenu                            |
|--------------------|------------------------------------|
| `sh_token`         | JWT d'authentification             |
| `sh_current_user`  | Données de l'utilisateur connecté  |
| `sh_settings`      | Cache des paramètres plateforme    |

> Pour se déconnecter et réinitialiser la session locale :
> ```js
> localStorage.clear(); location.reload();
> ```

---

## Stack technique

| Technologie      | Usage                              |
|------------------|------------------------------------|
| React 18         | Framework UI                       |
| Vite 5           | Bundler et serveur de dev          |
| React Router 6   | Navigation entre les pages         |
| Recharts         | Graphiques et visualisations       |
| Lucide React     | Icônes                             |
| Express.js 4     | API REST backend                   |
| PostgreSQL + pg  | Base de données relationnelle      |
| JWT + bcryptjs   | Authentification sécurisée         |
| express-validator| Validation des entrées API         |

---

## Notes pour les partenaires

- Les données sont persistées en **PostgreSQL** — aucune donnée mock n'est utilisée en production.
- Le fichier `backend/.env` doit contenir les variables `DB_*`, `JWT_SECRET` et `PORT`.
- Pour réinitialiser les données de test, utiliser les scripts dans `backend/scripts/`.
- Le compte `emma_b` est volontairement en statut `pending` pour illustrer le flux de validation admin.
- Le mode **maintenance** (activable depuis `/admin/parametres`) déconnecte tous les non-admins.
