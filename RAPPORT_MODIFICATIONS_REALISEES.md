# Rapport des modifications réalisées sur le projet Smart Home

## 1. Contexte général

Le projet Smart Home est une application web de maison connectée composée de deux parties :

- un frontend développé avec React et Vite ;
- un backend développé avec Express.js ;
- une base de données PostgreSQL hébergée sur Supabase.

Au départ, le projet utilisait une base locale MySQL et des données fictives dans un fichier `mockData.js`. L’objectif principal des modifications a été de rendre le projet plus réaliste, partageable entre plusieurs personnes, et plus cohérent avec une vraie plateforme de maison connectée.

Les changements ont concerné :

- la migration de MySQL vers Supabase/PostgreSQL ;
- l’adaptation des routes backend ;
- la suppression progressive des données fictives ;
- la gestion des utilisateurs, profils et administrateurs ;
- la différenciation des niveaux d’accès ;
- la correction de bugs bloquants ;
- l’amélioration de l’interface ;
- le nettoyage du projet ;
- le push sur la branche GitHub `marwa`.

## 2. Migration de MySQL vers Supabase/PostgreSQL

### 2.1. Problème initial

Le projet utilisait une base de données MySQL locale. Cela posait un problème pour le travail en groupe : lorsqu’une autre personne récupérait le projet depuis GitHub, elle n’avait pas les mêmes données que celles présentes sur la machine locale.

Exemple du problème :

- les utilisateurs existaient uniquement sur la base locale ;
- les objets connectés créés localement n’étaient pas disponibles pour les autres ;
- la configuration dépendait de l’ordinateur de la personne qui lançait le projet.

### 2.2. Choix de Supabase

Supabase a été choisi car il fournit une base PostgreSQL hébergée en ligne. Cela permet à tous les membres du groupe d’utiliser la même base de données, à condition d’avoir les bons identifiants de connexion dans le fichier `.env`.

Supabase est compatible avec :

- React, côté frontend ;
- Express.js, côté backend ;
- PostgreSQL via le package `pg`.

### 2.3. Adaptation du fichier `.env`

Le fichier `backend/.env` a été adapté pour utiliser l’URL de connexion Supabase.

La connexion se fait avec une variable de type :

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=5000
```

Il a été expliqué qu’il faut remplacer `[YOUR-PASSWORD]` par le vrai mot de passe Supabase, sans garder les crochets.

### 2.4. Adaptation de `backend/config/db.js`

Le fichier de connexion à la base a été adapté pour PostgreSQL. L’objectif était de remplacer la logique MySQL par une connexion via `pg`.

Le backend utilise maintenant un pool PostgreSQL pour envoyer des requêtes SQL à Supabase.

## 3. Adaptation des routes backend à PostgreSQL

Plusieurs fichiers backend ont été modifiés pour fonctionner avec PostgreSQL :

- `backend/routes/auth.js`
- `backend/routes/devices.js`
- `backend/routes/users.js`
- `backend/middleware/auth.js`
- `backend/utils/deviceMapper.js`
- `backend/utils/userMapper.js`

### 3.1. Authentification

Les routes d’authentification ont été adaptées pour :

- se connecter avec PostgreSQL ;
- gérer les utilisateurs Supabase ;
- vérifier le statut du compte ;
- empêcher la connexion d’un compte en attente ;
- empêcher la connexion d’un compte refusé ;
- mettre à jour la dernière connexion ;
- ajouter des points de connexion ;
- recalculer le niveau utilisateur selon les points.

### 3.2. Inscription dans une maison

L’inscription a été corrigée pour respecter le fonctionnement suivant :

- si l’approbation automatique est désactivée, l’utilisateur est créé avec le statut `Attente` ;
- il ne doit pas être connecté automatiquement ;
- un message lui indique que sa demande a été envoyée à l’administrateur ;
- si l’approbation automatique est activée, le compte est directement approuvé ;
- dans ce cas, l’utilisateur reçoit un message indiquant que l’inscription a été validée automatiquement.

### 3.3. Création d’une maison

La création d’une maison a été corrigée après une erreur serveur liée à `maisonId`.

Le fonctionnement final est :

- un utilisateur peut créer une maison ;
- il devient automatiquement administrateur ;
- son compte est créé au niveau `Expert` ;
- un code d’accès maison est généré ;
- ce code peut être partagé avec les autres membres.

### 3.4. Gestion des objets

Les routes des objets connectés ont été adaptées pour PostgreSQL.

Corrections réalisées :

- création d’un objet ;
- modification d’un objet ;
- mise à jour du signal ;
- mise à jour de la batterie ;
- mise à jour de la dernière connexion ;
- activation ou désactivation d’un objet ;
- suppression d’un objet ;
- historique des objets.

Une erreur PostgreSQL a aussi été corrigée :

```text
column "statut" is of type statut_objet_enum but expression is of type text
```

Cette erreur venait du fait que PostgreSQL attendait une valeur enum `statut_objet_enum`, mais recevait du texte simple. La requête a donc été corrigée avec un cast vers l’enum PostgreSQL.

## 4. Script SQL PostgreSQL/Supabase

Un script PostgreSQL complet a été préparé pour créer la structure de la base de données.

Il contient :

- les tables principales ;
- les types enum PostgreSQL ;
- les relations entre tables ;
- les clés étrangères ;
- des données initiales ;
- une maison par défaut ;
- un utilisateur administrateur ;
- des utilisateurs habitants ;
- des pièces ;
- des modules ;
- des catégories d’objets ;
- des services ;
- des objets connectés ;
- des configurations d’objets ;
- des alertes ;
- des actions utilisateur.

Les principales tables sont :

- `maisons`
- `users`
- `piece_maison`
- `objets`
- `historique_objet`
- `historique_connexion`
- `modules`
- `module_access`
- `categorie_objets`
- `services`
- `alertes`
- `rapports`
- `config_objet`
- `app_settings`

## 5. Gestion de l’âge et de la date de naissance

### 5.1. Suppression du champ âge dans les formulaires

Le champ âge a été retiré des formulaires d’inscription et de modification du profil.

L’âge ne doit plus être saisi manuellement par l’utilisateur. Il est calculé automatiquement à partir de la date de naissance.

### 5.2. Calcul automatique de l’âge

Le backend calcule l’âge à partir de `date_naissance`.

Cela évite :

- les incohérences entre âge et date de naissance ;
- les erreurs de saisie ;
- les âges incorrects dans la base.

### 5.3. Sécurité âge minimum

Une règle a été ajoutée :

- pour s’inscrire soi-même ;
- pour créer une maison ;
- l’utilisateur doit avoir au moins 18 ans.

Si la personne a moins de 18 ans, un message d’erreur est affiché.

### 5.4. Exception pour les enfants ajoutés par un administrateur

Une exception a été ajoutée pour le cas où un administrateur ajoute lui-même un enfant dans sa maison.

Dans ce cas :

- l’enfant peut avoir moins de 18 ans ;
- il est ajouté directement par l’administrateur ;
- il appartient à la maison de l’administrateur ;
- son compte peut être approuvé immédiatement.

Cette logique est différente de l’inscription publique, qui reste limitée aux personnes majeures.

### 5.5. Blocage des dates futures

Les champs de date de naissance ont été sécurisés pour empêcher de choisir une date dans le futur.

Cette vérification existe :

- côté frontend, avec la propriété `max` sur l’input date ;
- côté backend, pour empêcher une valeur incorrecte envoyée manuellement.

## 6. Gestion du profil utilisateur

La page profil a été améliorée.

Modifications principales :

- consultation des informations personnelles ;
- modification du prénom ;
- modification du nom ;
- modification du pseudonyme ;
- modification du genre ;
- modification de la date de naissance ;
- calcul automatique de l’âge ;
- ajout d’une photo de profil ;
- suppression de la photo de profil ;
- changement de mot de passe.

Un bug de page blanche sur la page profil a été corrigé. Il était causé par une ligne d’import incorrecte dans `ProfilePage.jsx`.

## 7. Ajout de la photo de profil

Le champ `photo` existait déjà dans la base de données, mais il n’était pas encore exploité dans l’interface.

L’interface a été modifiée pour permettre :

- de choisir une photo ;
- de l’afficher dans le profil ;
- de l’afficher dans l’avatar de la barre de navigation ;
- de retirer la photo.

Une limite de taille a été ajoutée pour éviter d’envoyer des images trop lourdes.

## 8. Gestion des paramètres administrateur

Une page paramètres existe pour les administrateurs.

Plusieurs fonctionnalités ont été corrigées ou ajoutées :

- sauvegarde du nom de plateforme ;
- sauvegarde du nombre de points ;
- sauvegarde du mode maintenance ;
- sauvegarde de l’approbation automatique ;
- sauvegarde de la couleur de thème ;
- suppression définitive du compte administrateur connecté.

### 8.1. Table `app_settings`

La table `app_settings` sert à sauvegarder les paramètres de la plateforme ou d’une maison.

Elle permet notamment de stocker :

- le nom de la plateforme ;
- la couleur choisie ;
- l’état de l’approbation automatique ;
- le nombre de points par action ;
- le mode maintenance.

### 8.2. Couleur personnalisée

La couleur personnalisée ne doit s’appliquer qu’à l’administrateur connecté.

Un bug a été corrigé : auparavant, lorsqu’un administrateur changeait la couleur, elle restait visible même après déconnexion ou pour d’autres utilisateurs. Le comportement a été corrigé pour revenir à la couleur par défaut si l’utilisateur n’est pas l’administrateur concerné.

## 9. Gestion des inscriptions et approbations

Le système d’inscription a été ajusté pour gérer deux cas.

### 9.1. Approbation manuelle

Si l’administrateur n’a pas activé l’approbation automatique :

- l’utilisateur s’inscrit ;
- son compte est créé en attente ;
- il ne peut pas se connecter ;
- il voit le message :

```text
Votre demande a été envoyée à l'administrateur de la maison.
Vous pourrez vous connecter après validation.
```

### 9.2. Approbation automatique

Si l’administrateur a activé l’approbation automatique :

- le compte est directement approuvé ;
- l’utilisateur voit un message spécifique ;
- il peut accéder directement à son compte.

Message prévu :

```text
L'administrateur a confirmé l'inscription automatiquement.
Vous allez être redirigé vers votre compte.
```

## 10. Gestion administrateur des utilisateurs

La page de gestion des utilisateurs a été améliorée.

L’administrateur peut maintenant :

- voir les utilisateurs ;
- approuver un utilisateur ;
- refuser un utilisateur ;
- modifier le niveau ;
- modifier les points ;
- modifier les droits ;
- supprimer un utilisateur ;
- ajouter directement un utilisateur.

### 10.1. Ajout direct d’un utilisateur

Le bouton `Ajouter` existait déjà, mais le formulaire ne contenait pas tous les champs nécessaires. Cela provoquait des erreurs côté serveur.

Le formulaire a été complété avec :

- pseudonyme ;
- prénom ;
- nom ;
- email ;
- mot de passe ;
- rôle dans la maison ;
- genre ;
- date de naissance ;
- droits ;
- niveau ;
- points.

### 10.2. Route backend dédiée

Une route backend dédiée a été ajoutée :

```text
POST /api/users
```

Elle permet à l’administrateur de créer un utilisateur directement dans sa maison.

Cette route :

- hash le mot de passe ;
- associe l’utilisateur à la maison de l’admin ;
- crée le compte avec le statut approuvé ;
- permet d’ajouter un enfant ;
- évite de passer par l’inscription publique.

## 11. Différenciation des niveaux

Avant, les niveaux étaient trop similaires.

Le fonctionnement a été revu pour rendre la progression plus claire.

### 11.1. Débutant

Le niveau débutant correspond à un utilisateur qui consulte seulement.

Il peut :

- voir les objets ;
- voir les services ;
- consulter son profil ;
- voir les membres.

Il ne peut pas modifier les objets.

### 11.2. Intermédiaire

Le niveau intermédiaire peut commencer à interagir avec la maison.

Il peut :

- faire tout ce que fait un débutant ;
- accéder au module gestion ;
- activer ou désactiver un objet existant.

Il ne peut pas créer, modifier ou supprimer un objet.

### 11.3. Avancé

Le niveau avancé peut gérer les objets.

Il peut :

- faire tout ce que fait un intermédiaire ;
- créer un objet ;
- configurer un objet ;
- modifier les informations d’un objet ;
- accéder aux rapports.

Il ne peut pas gérer les utilisateurs ni les paramètres globaux.

### 11.4. Expert administrateur

Le niveau expert administrateur a accès à l’administration complète.

Il peut :

- faire tout ce que fait un avancé ;
- supprimer un objet ;
- gérer les utilisateurs ;
- modifier les points ;
- modifier les niveaux ;
- gérer les paramètres ;
- supprimer son propre compte administrateur.

### 11.5. Protection frontend et backend

Les permissions ont été appliquées :

- côté frontend, pour afficher ou cacher les boutons ;
- côté backend, pour protéger réellement les routes API.

Des permissions plus précises ont été créées :

- `device_toggle`
- `device_create`
- `device_config`
- `reports`
- `device_delete`
- `administration`
- `users_manage`
- `settings_manage`

## 12. Catalogue visiteur et page d’accueil

La page d’accueil visiteur a été repensée.

Avant, elle affichait des informations moins cohérentes avec une vraie maison connectée, comme des événements ou transports.

Elle a été orientée vers :

- la découverte de la maison connectée ;
- un catalogue d’objets connectés ;
- des services ;
- des guides ou informations ;
- des filtres et une barre de recherche.

L’objectif était qu’un visiteur comprenne :

- ce que propose la plateforme ;
- quels objets peuvent être ajoutés ;
- à quoi servent les services ;
- comment fonctionne une maison connectée.

## 13. Suppression progressive de `mockData.js`

Le projet utilisait initialement `mockData.js` comme base fictive.

Après migration vers Supabase :

- les objets viennent de la base Supabase ;
- les utilisateurs viennent de la base Supabase ;
- les services viennent de la base Supabase ;
- les paramètres viennent de la base Supabase.

Le dossier `src/` à la racine contenait une ancienne version du frontend. Il n’était plus utilisé par le vrai projet, qui utilise maintenant :

```text
frontend/src/
```

L’ancien dossier racine `src/` a donc été supprimé pour éviter les confusions.

Le dossier `scripts/` a été conservé car il sert à lancer le frontend et le backend ensemble avec :

```bash
npm run dev
```

## 14. Nettoyage du projet

Plusieurs fichiers non utilisés ont été supprimés :

- l’ancien dossier racine `src/` ;
- l’ancien `public/favicon.svg` racine.

Les dossiers importants conservés sont :

- `frontend/`
- `backend/`
- `scripts/`

Le dossier `scripts/` contient notamment `scripts/dev.js`, utilisé par le script principal :

```json
"dev": "node scripts/dev.js"
```

## 15. Correction du problème Nodemon

Un problème a été identifié :

```text
'nodemon' is not recognized
```

Ce problème apparaît si les dépendances du backend ne sont pas installées.

La solution recommandée est :

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
npm run dev
```

Il a été précisé que `nodemon` ne doit pas forcément être installé globalement. Il doit être présent dans les dépendances de développement du backend.

## 16. Correction des accents et de l’encodage

Plusieurs problèmes d’accents sont apparus dans l’interface :

- caractères affichés comme `CrÃ©er` ;
- caractères affichés comme `cr�er` ;
- textes avec accents mal encodés.

Plusieurs fichiers ont été corrigés pour retrouver des textes lisibles en français.

Exemples :

- `Créer ma maison`
- `Prénom`
- `Rôle`
- `Déjà un compte ?`
- `Vous devez avoir au moins 18 ans pour créer une maison.`

## 17. Correction des pages blanches

Plusieurs pages blanches ont été corrigées.

### 17.1. Page inscription et création maison

Des lignes incorrectes avaient été insérées dans les fichiers :

- `CreateHousePage.jsx`
- `RegisterPage.jsx`

Elles provoquaient une erreur React/Vite.

Les imports ont été corrigés.

### 17.2. Page profil

La page profil affichait une page blanche à cause d’un import cassé.

Le problème a été corrigé dans :

```text
frontend/src/pages/visualisation/ProfilePage.jsx
```

## 18. Correction de l’icône maison

L’icône maison affichée sur l’accueil avait un fond bleu.

Le fichier SVG a été remplacé pour avoir uniquement une maison sans fond bleu.

Fichier concerné :

```text
frontend/public/favicon.svg
```

Le nouveau SVG utilise un fond transparent.

## 19. Mail automatique

Une fonctionnalité d’envoi automatique d’email avait été envisagée.

L’idée était :

- envoyer un mail lors d’une inscription ;
- envoyer un mail lors de l’acceptation dans une maison.

Finalement, cette fonctionnalité a été retirée à la demande du projet.

Les éléments liés à `mailer.js` ont donc été supprimés.

## 20. Push GitHub

Les modifications ont été poussées sur la branche GitHub :

```text
marwa
```

Dépôt :

```text
https://github.com/attiakarin/Smart-home.git
```

Un rebase a été nécessaire car la branche distante contenait déjà des changements.

Commandes effectuées :

```bash
git pull --rebase origin marwa
git push origin marwa
```

Dernier commit poussé :

```text
c4aa7e9 Polish smart home permissions and cleanup
```

## 21. Vérifications effectuées

Plusieurs vérifications ont été faites pendant le développement :

```bash
node --check backend/routes/auth.js
node --check backend/routes/users.js
node --check backend/routes/devices.js
node --check backend/middleware/auth.js
npm --prefix frontend run build
```

Le build Vite a parfois nécessité une exécution normale hors sandbox à cause d’une erreur Windows `EPERM` liée à `esbuild`, mais le build final est passé correctement.

## 22. Résultat final

Le projet est maintenant plus cohérent avec une vraie application de maison connectée.

Les principales améliorations sont :

- base de données partagée avec Supabase ;
- suppression de la dépendance aux données fictives ;
- authentification plus robuste ;
- gestion réelle des comptes en attente ;
- création de maison fonctionnelle ;
- gestion administrateur plus complète ;
- ajout d’enfants par l’administrateur ;
- photo de profil ;
- âge calculé automatiquement ;
- sécurité sur l’âge minimum ;
- niveaux mieux différenciés ;
- permissions protégées côté backend ;
- interface visiteur plus cohérente ;
- paramètres administrateur sauvegardés ;
- nettoyage des anciens fichiers ;
- projet poussé sur GitHub.

## 23. Conclusion

Les modifications ont permis de faire évoluer le projet d’une application principalement basée sur des données locales ou fictives vers une application plus réaliste, connectée à une base de données distante et utilisable par plusieurs membres.

Le projet est maintenant mieux structuré, plus cohérent fonctionnellement, et plus proche d’un vrai système de gestion de maison connectée.
