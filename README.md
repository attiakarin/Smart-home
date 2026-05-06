# Smart Home — Documentation

Application web de maison connectée développée avec **React + Vite** (frontend) et **Express.js + PostgreSQL** (backend).

---

## Sommaire

1. [Présentation du projet](#1-présentation-du-projet)
2. [Prérequis et installation](#2-prérequis-et-installation)
3. [Architecture des modules](#3-architecture-des-modules)
4. [Comptes de test](#4-comptes-de-test)
5. [Système de niveaux et points](#5-système-de-niveaux-et-points)
6. [Description des pages](#6-description-des-pages)
7. [Services interactifs](#7-services-interactifs)
8. [Système de demandes](#8-système-de-demandes)
9. [Structure des fichiers](#9-structure-des-fichiers)
10. [Base de données](#10-base-de-données)
11. [Stack technique](#11-stack-technique)
12. [Notes](#12-notes)

---

## 1. Présentation du projet

Le projet permet de :

- créer une maison et un compte administrateur ;
- inscrire des habitants avec un code d'accès ;
- valider les inscriptions depuis le compte admin ;
- consulter, configurer et suivre des objets connectés ;
- appliquer des services/scénarios (confort, sécurité, énergie, automatisation) ;
- échanger des demandes entre habitants et admin.

Les quatre modules principaux sont :

- **Information** : accueil public, catalogue, inscription.
- **Visualisation** : tableau de bord, objets, services, demandes, membres, profil.
- **Gestion** : ajout/configuration d'objets, rapports, statistiques.
- **Administration** : utilisateurs, droits, paramètres, alertes consommation.

---

## 2. Prérequis et installation

### Prérequis

- **Node.js** ≥ 18 — [https://nodejs.org/en/download](https://nodejs.org/en/download)
- **PostgreSQL** (ou Supabase) — base de données relationnelle
- Un fichier `backend/.env` (voir `backend/.env.example`)

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3000
```

### Installation

```bash
# Depuis la racine du projet
npm install
npm install --prefix backend
```

> ⚠️ Si `nodemon` n'est pas reconnu : `npm install --prefix backend`

### Lancement

| Commande | Résultat |
|---|---|
| `npm run dev` | Frontend + backend en parallèle |
| `npm run dev:frontend` | Frontend uniquement → http://localhost:5173 |
| `npm run dev:backend` | Backend uniquement → http://localhost:3000 |
| `npm run build` | Build de production frontend |

---

## 3. Architecture des modules

| Module | URL | Accès requis |
|---|---|---|
| Information | `/` | Public (sans connexion) |
| Visualisation | `/tableau-de-bord` | Tout utilisateur connecté |
| Gestion | `/gestion` | Niveau **Intermédiaire** minimum |
| Administration | `/admin` | Niveau **Expert** + rôle `admin` |

---

## 4. Comptes de test

| Prénom | Login | Mot de passe | Niveau | Accès |
|---|---|---|---|---|
| Sophie | `admin_martin` | `Admin2026!` | Expert (75 pts) | Tout (admin inclus) |
| Jérôme | `jerome_m` | `Maison2026!` | Avancé (50 pts) | Info + Visu + Gestion |
| Léa | `lea_martin` | `Lea2026!` | Intermédiaire (25 pts) | Info + Visu + Gestion |
| Tom | `tom_m` | `Tom2026!` | Débutant (0 pts) | Info + Visu |
| Emma | `emma_b` | `Emma2026!` | — | Pending (bloqué) |

> Commencer avec `admin_martin` pour explorer toutes les fonctionnalités.

---

## 5. Système de niveaux et points

| Niveau | Points requis | Droits supplémentaires |
|---|---|---|
| Débutant | 0 pts | Visualisation |
| Intermédiaire | 25 pts | Activer/désactiver les objets |
| Avancé | 50 pts | Créer/configurer les objets, rapports |
| Expert | 75 pts | Administration (si rôle admin) |

| Action | Points |
|---|---|
| Connexion | +0,25 pts |
| Consultation | +0,50 pts |

Le niveau est recalculé automatiquement côté backend après chaque action.

---

## 6. Description des pages

### Module Information (public)

| URL | Description |
|---|---|
| `/` | Accueil public ou personnalisé si connecté |
| `/catalogue-maison` | Catalogue des objets connectés disponibles |
| `/energie` | Page publique énergie |
| `/securite` | Page publique sécurité |
| `/creer-maison` | Création d'une maison (premier admin) |
| `/inscription` | Inscription habitant avec code maison |
| `/login` | Connexion |

### Module Visualisation

| URL | Description |
|---|---|
| `/tableau-de-bord` | Vue d'ensemble, statistiques et accès rapides |
| `/objets` | Liste filtrée des objets connectés |
| `/objets/:id` | Détail d'un objet : état, paramètres, historique |
| `/services` | Services interactifs (confort, sécurité, énergie, automatisation) |
| `/demandes-admin` | Messagerie habitants ↔ admin |
| `/membres` | Liste des membres du foyer avec niveaux |
| `/profil` | Profil, points, photo, historique de connexion |

### Module Gestion *(Intermédiaire minimum)*

| URL | Description |
|---|---|
| `/gestion` | Tableau de bord de gestion avancée |
| `/gestion/objet/:id` | Contrôle et configuration détaillée |
| `/gestion/rapports` | Statistiques et export CSV *(Avancé minimum)* |

### Module Administration *(Expert + rôle admin)*

| URL | Description |
|---|---|
| `/admin` | Tableau de bord admin, demandes d'accès |
| `/admin/utilisateurs` | Validation, modification, suppression des comptes |
| `/admin/objets` | Ajout, modification, suppression des objets |
| `/admin/consommation` | Historique des dépassements et alertes |
| `/admin/parametres` | Nom plateforme, couleur, inscriptions, mode maintenance |

---

## 7. Services interactifs

La page `/services` permet d'appliquer des scénarios sur les objets compatibles :

| Service | Objets compatibles | Action |
|---|---|---|
| Confort | Thermostat, Éclairage, Sèche-serviette | Température cible par objet |
| Sécurité | Caméra, Capteur, Détecteur, Sécurité | Activer la surveillance (mode) |
| Énergie | Tout objet actif | Passer en mode éco / désactiver |
| Automatisation | Tout objet | Programmer plage horaire (jours + heures) |

---

## 8. Système de demandes

La page `/demandes-admin` centralise la messagerie entre habitants et admin.

- **Habitant** : créer une demande, suivre le statut, échanger des messages.
- **Admin (Expert)** : voir toutes les demandes, répondre, changer le statut, attribuer des points.

| Statut | Description |
|---|---|
| `nouvelle` | Soumise, pas encore traitée |
| `en_cours` | Prise en charge par l'admin |
| `traitee` | Résolue |
| `refusee` | Rejetée |

> Le badge de notification n'apparaît que pour les demandes au statut **nouvelle**.

---

## 9. Structure des fichiers

```
Smart-home/
├── package.json          # Scripts racine (dev, build, lint)
├── scripts/dev.js        # Lance frontend + backend en parallèle
├── backend/
│   ├── server.js         # Serveur Express, CORS, routes
│   ├── config/
│   │   ├── db.js         # Connexion PostgreSQL (pool)
│   │   └── mailer.js     # Configuration email
│   ├── middleware/
│   │   └── auth.js       # JWT + contrôle des modules
│   ├── routes/
│   │   ├── auth.js       # Login, inscription, création maison, profil
│   │   ├── users.js      # Membres et gestion des utilisateurs
│   │   ├── devices.js    # CRUD objets, états, configurations, historique
│   │   ├── requests.js   # Demandes admin ↔ habitants
│   │   ├── house.js      # Configuration et consommation maison
│   │   ├── settings.js   # Paramètres plateforme
│   │   └── public.js     # Catégories, pièces, services publics
│   └── utils/
│       ├── userMapper.js    # SQL → format frontend utilisateur
│       └── deviceMapper.js  # SQL → format frontend objet
└── frontend/
    ├── vite.config.js    # Proxy /api → backend
    └── src/
        ├── App.jsx                        # Routes principales
        ├── services/api.js               # Tous les appels HTTP
        ├── context/
        │   ├── AuthContext.jsx           # Utilisateur, droits, demandes, paramètres
        │   └── DevicesContext.jsx        # Objets connectés
        ├── components/layout/
        │   ├── Navbar.jsx                # Navigation, badges de notification
        │   └── Footer.jsx
        ├── pages/public/                 # Module Information
        ├── pages/visualisation/          # Module Visualisation
        ├── pages/gestion/                # Module Gestion
        └── pages/admin/                  # Module Administration
```

---

## 10. Base de données

La base PostgreSQL est hébergée sur Supabase. Les tables principales sont créées automatiquement au démarrage via `CREATE TABLE IF NOT EXISTS`.

### Tables principales

| Table | Description |
|---|---|
| `maisons` | Maisons (`id`, `nom`, `code_acces`, `date_creation`) |
| `users` | Comptes (`pseudonyme`, `email`, `niveau`, `points`, `statut`, `rolee`, `maison_id`, `photo`) |
| `objets` | Objets connectés (`nom`, `type_obj`, `marque`, `piece_id`, `statut`, `energie_consommer`) |
| `config_objet` | Paramètres configurables des objets (`param_nom`, `param_valeur`, `param_type`) |
| `historique_objet` | Historique des états et mesures des objets |
| `historique_connexion` | Trace de chaque connexion utilisateur |
| `demandes_admin` | Demandes habitants → admin avec messages et statuts |
| `demande_messages` | Messages d'échange par demande |
| `app_settings` | Paramètres plateforme (nom, couleur, maintenance, points, inscriptions auto) |
| `piece_maison` | Pièces de la maison |
| `consommation_history` | Historique des dépassements de consommation |

### Règles métier importantes

- **Mots de passe** : hashés avec `bcryptjs`, jamais stockés en clair.
- **Authentification** : JWT (`Authorization: Bearer <token>`), expiration configurable.
- **Âge minimum** : 18 ans pour toute inscription publique ou création de maison (exception : admin ajoutant un enfant).
- **Niveau** : calculé automatiquement côté backend selon les points (0 / 25 / 50 / 75 pts).
- **Couleur de thème** : s'applique uniquement à l'admin connecté ; réinitialisée à la déconnexion.
- **Mode maintenance** : déconnecte tous les non-admins.

---

## 11. Stack technique

| Technologie | Usage |
|---|---|
| React 18 | Framework UI |
| Vite 5 | Bundler et serveur de dev |
| React Router 6 | Navigation |
| Recharts | Graphiques |
| Lucide React | Icônes |
| Express.js 4 | API REST backend |
| PostgreSQL + pg | Base de données |
| Supabase | Hébergement PostgreSQL partagé |
| JWT + bcryptjs | Authentification sécurisée |
| express-validator | Validation des entrées API |

---

## 12. Notes

- Le fichier `backend/.env` est requis et ne doit pas être commité.
- Pour réinitialiser la session locale : `localStorage.clear(); location.reload();`
- Pour réinitialiser les données de test, utiliser les scripts dans `backend/scripts/`.
- Le compte `emma_b` est volontairement en statut `pending` pour illustrer le flux de validation admin.
- Le proxy Vite redirige `/api` vers le backend (configurable dans `frontend/vite.config.js`).