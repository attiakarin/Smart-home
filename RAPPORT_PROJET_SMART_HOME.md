# Rapport du projet Smart Home

## 1. Objectif du projet

Le projet est une application web de maison connectee. Elle permet de creer une maison, d'inscrire des habitants avec un code d'acces, de valider les demandes depuis un compte administrateur, puis de consulter, configurer et suivre les objets connectes.

Le sujet demande quatre grands modules :

- **Information** : accueil public, recherche d'informations, inscription.
- **Visualisation** : connexion, profil, membres, objets/services consultables, niveaux, points et suivi des actions.
- **Gestion** : ajout/configuration d'objets, etats, rapports, statistiques et historique.
- **Administration** : gestion des utilisateurs, droits, validations, objets, parametres et rapports.

## 2. Fonctionnalites presentes

### Acces et comptes

- Une personne peut creer une maison depuis `/creer-maison`.
- Le createur devient automatiquement administrateur de la maison.
- Une personne peut s'inscrire comme habitant depuis `/inscription` avec le code d'acces de la maison.
- Un habitant inscrit reste en attente tant qu'un administrateur ne l'a pas valide.
- Un utilisateur en attente ne peut pas acceder a son compte.
- L'administrateur voit les demandes d'acces dans son tableau de bord et peut accepter, refuser, choisir le niveau et le role dans la maison.

### Accueil personnalise

- La route `/` affiche une page publique si personne n'est connecte.
- Si un utilisateur est connecte, `/` devient un accueil personnalise.
- L'accueil affiche les dernieres recherches, les verifications importantes, les objets recents et les actions possibles selon le role.

### Objets connectes

- Les objets sont lus depuis la base MySQL.
- Les objets sont rattaches a une maison avec `maison_id`.
- La page `/objets` permet de filtrer par mot-cle, type, piece et etat.
- La page detail permet de consulter l'etat d'un objet.
- Le module gestion permet d'ajouter un objet.
- La page `/gestion/objet/:id` permet de configurer un objet et d'enregistrer ses parametres.
- Les changements d'etat sont historises dans `historique_objet`.

### Services

- La page `/services` a ete ajoutee.
- Elle liste les services/outils disponibles.
- Elle permet de filtrer par mot-cle, type de service et niveau requis.

### Rapports

- La page `/gestion/rapports` affiche des statistiques sur les objets.
- Elle contient des cartes de synthese.
- Elle permet d'exporter un rapport CSV.

### Points et actions

- Les actions utilisateur sont envoyees au backend avec `/api/auth/log-action`.
- Les points et le nombre d'actions sont mis a jour apres une action.
- Le niveau utilisateur est recalcule cote frontend selon les points.

## 3. Lancement du projet

### Prerequis

- Node.js
- MySQL
- Une base nommee `smart_home_db` ou les variables `.env` adaptees.

### Installation

```bash
npm install
cd backend
npm install
```

### Base de donnees

Le script principal est :

```bash
backend/database/table.sql
```

Il cree les tables principales et insere des donnees de test.

### Lancement frontend + backend

Depuis la racine :

```bash
npm run dev:full
```

Le script lance :

- le backend Express sur `http://localhost:5000`
- le frontend Vite sur `http://localhost:5173`

### Compte de test

- Login : `admin`
- Mot de passe : `Admin2026!`
- Code maison : `MAISON2026`

## 4. Structure des fichiers

### Racine

- `package.json` : dependances et scripts du frontend.
- `vite.config.js` : configuration Vite et proxy `/api` vers le backend.
- `index.html` : point d'entree HTML de Vite.
- `src/main.jsx` : point d'entree React.
- `src/App.jsx` : routes principales de l'application.
- `scripts/dev.js` : lance frontend et backend en meme temps.
- `.gitignore` : exclut dependances, builds, logs et fichiers locaux.

### Frontend `src/`

- `src/services/api.js` : centralise les appels HTTP vers le backend.
- `src/context/AuthContext.jsx` : gere l'utilisateur connecte, les droits, les membres, les actions et le profil.
- `src/context/DevicesContext.jsx` : gere les objets connectes et synchronise avec l'API.
- `src/components/layout/Navbar.jsx` : barre de navigation, notifications admin et menu utilisateur.
- `src/components/layout/Footer.jsx` : pied de page.
- `src/index.css` : styles globaux.

### Pages publiques

- `src/pages/public/HomePage.jsx` : accueil public ou accueil personnalise quand l'utilisateur est connecte.
- `src/pages/public/LoginPage.jsx` : connexion.
- `src/pages/public/RegisterPage.jsx` : inscription habitant avec code maison.
- `src/pages/public/CreateHousePage.jsx` : creation d'une maison et du compte admin.
- `src/pages/public/EventsPage.jsx`, `PlacesPage.jsx`, `TransportsPage.jsx` : pages d'information/recherche.

### Module Visualisation

- `src/pages/visualisation/DashboardPage.jsx` : tableau de bord utilisateur/admin.
- `src/pages/visualisation/ProfilePage.jsx` : profil, informations personnelles, niveau et points.
- `src/pages/visualisation/MembersPage.jsx` : liste des membres valides de la maison.
- `src/pages/visualisation/DevicesListPage.jsx` : liste filtrable des objets.
- `src/pages/visualisation/DeviceDetailPage.jsx` : detail d'un objet.
- `src/pages/visualisation/ServicesPage.jsx` : liste filtrable des services/outils.

### Module Gestion

- `src/pages/gestion/GestionDashboard.jsx` : gestion globale des objets.
- `src/pages/gestion/AddDeviceModal.jsx` : formulaire d'ajout d'objet.
- `src/pages/gestion/GestionDevicePage.jsx` : configuration complete d'un objet.
- `src/pages/gestion/ReportsPage.jsx` : statistiques et export CSV.

### Module Administration

- `src/pages/admin/AdminDashboard.jsx` : demandes d'acces et actions admin rapides.
- `src/pages/admin/AdminUsers.jsx` : gestion des utilisateurs.
- `src/pages/admin/AdminDevices.jsx` : gestion administrative des objets.
- `src/pages/admin/AdminSettings.jsx` : parametres admin.

### Backend `backend/`

- `backend/server.js` : cree le serveur Express, configure CORS, JSON et routes API.
- `backend/config/db.js` : connexion MySQL, migrations legeres et insertion d'objets de test.
- `backend/config/mailer.js` : configuration d'envoi email.
- `backend/middleware/auth.js` : authentification JWT et controle des modules.
- `backend/utils/userMapper.js` : conversion entre format SQL utilisateur et format frontend.
- `backend/utils/deviceMapper.js` : conversion entre format SQL objet et format frontend.
- `backend/routes/auth.js` : login, inscription, creation maison, profil, action log.
- `backend/routes/users.js` : membres de la maison et administration des utilisateurs.
- `backend/routes/devices.js` : CRUD objets, etats, configurations et historique.
- `backend/routes/public.js` : categories, pieces et services publics.
- `backend/database/table.sql` : schema SQL complet.
- `backend/database/add_role_maison.sql` : migration pour ajouter le role dans la maison.

## 5. Tables SQL principales

### `maisons`

Stocke les maisons.

- `id`
- `nom`
- `code_acces`
- `date_creation`

### `users`

Stocke les comptes.

- `id`
- `pseudonyme`
- `mot_de_passe`
- `email`
- `nom`
- `prenom`
- `age`
- `genre`
- `date_naissance`
- `rolee` : `admin` ou `habitant`
- `role_maison` : role familial ou fonction dans la maison
- `maison_id`
- `niveau`
- `points`
- `photo`
- `statut` : en attente, approuve, rejete
- `connexions`
- `actions`
- `derniere_connexion`

### `objets`

Stocke les objets connectes.

- `id`
- `maison_id`
- `nom`
- `type_obj`
- `marque`
- `piece_id`
- `statut`
- `type_connexion`
- `signal_obj`
- `batterie`
- `energie_consommer`
- `description`
- `derniere_connexion`

### `config_objet`

Stocke les parametres configurables des objets.

- `id`
- `objet_id`
- `param_nom`
- `param_valeur`
- `param_type`
- `date_modification`

### `historique_objet`

Historique des changements d'etat des objets.

- `id`
- `objet_id`
- `etat`
- `valeur`
- `date_mesure`

### `historique_connexion`

Historique des connexions utilisateur.

- `id`
- `user_id`
- `heure_co`
- `ip_adresse`

### `services`

Services et outils consultables.

- `id`
- `name`
- `description`
- `service_type`
- `objet_categorie_id`
- `min_niveau`
- `date_creation`

### Autres tables utiles

- `piece_maison` : pieces ou zones de la maison.
- `categorie_objets` : categories des objets.
- `modules` : modules fonctionnels.
- `module_access` : droits par niveau.
- `alertes` : alertes et notifications.
- `rapports` : rapports generes.
- `main_objet` : maintenance des objets.

## 6. Correspondance avec le sujet

| Exigence | Etat |
| --- | --- |
| Accueil public et recherche | Present |
| Inscription | Present |
| Validation d'inscription | Present |
| Connexion avec login/mot de passe | Present |
| Profil modifiable | Present |
| Consultation des membres | Present |
| Recherche objets avec filtres | Present |
| Recherche services avec filtres | Present |
| Niveaux, points, actions | Present |
| Ajout d'objet | Present |
| Configuration d'objet | Present |
| Etats et historique | Present |
| Rapports/statistiques | Present |
| Administration utilisateurs | Present |
| Gestion droits et roles | Present |
| Responsive design | Present via CSS responsive |

## 7. Elements inutiles ou a ne pas rendre

- `node_modules/` et `backend/node_modules/` : necessaires localement, mais a ne pas rendre dans un depot ou une archive finale.
- `dist/` : dossier genere par `npm run build`, peut etre regenere.
- `logs/` : dossier de logs de developpement.
- `frontend/` : ancien projet Vite separe. L'application actuelle utilise le dossier `src/` a la racine. Ce dossier a ete supprime pour eviter le doublon.

## 8. Ameliorations possibles

- Ajouter un vrai envoi email lors de la validation ou du refus d'un habitant.
- Ajouter une page dediee aux alertes.
- Ajouter une gestion avancee des sauvegardes de base de donnees.
- Ajouter des tests automatises frontend/backend.
- Ajouter une page d'administration complete des categories et services.
