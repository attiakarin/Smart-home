import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { getAppSettings } from '../config/appSettings.js';
import { mapUser } from '../utils/userMapper.js';

const router = Router();

const LEVELS = {
  'Débutant': 0,
  'Intermédiaire': 25,
  'Avancé': 50,
  Expert: 75,
};

function generateHouseCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function computeLevel(points) {
  if (points >= LEVELS.Expert) return 'Expert';
  if (points >= LEVELS['Avancé']) return 'Avancé';
  if (points >= LEVELS['Intermédiaire']) return 'Intermédiaire';
  return 'Débutant';
}

function normalizeDateOnly(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return String(value).slice(0, 10);
}

function calculateAge(dateValue) {
  if (!dateValue) return null;
  const birthDate = new Date(dateValue);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function isFutureDate(dateValue) {
  if (!dateValue) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;
  date.setHours(0, 0, 0, 0);
  return date > today;
}

function isAdult(dateValue) {
  const age = calculateAge(dateValue);
  return age !== null && age >= 18;
}

function toDbGenre(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return '-';
  const normalized = value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalized === 'f' || normalized === 'femme') return 'F';
  if (normalized === 'h' || normalized === 'homme') return 'H';
  return '-';
}

function normalizeHousePieces(body) {
  const defaults = ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Entree', 'Garage', 'Couloir'];
  const nbPieces = Math.max(1, Number(body.nbPieces || 1));
  const pieces = Array.isArray(body.pieces)
    ? body.pieces.map(piece => String(piece || '').trim()).filter(Boolean).slice(0, 30)
    : [];
  return pieces.length > 0
    ? pieces
    : Array.from({ length: nbPieces }, (_, index) => defaults[index] || `Piece ${index + 1}`);
}

router.post('/login',
  body('login').notEmpty().trim(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Login et mot de passe requis.' });

    const { login, password } = req.body;

    try {
      const { rows } = await pool.query(
        `SELECT users.*, maisons.nom AS maison_nom, maisons.code_acces,
                admin.id AS admin_id,
                admin.pseudonyme AS admin_login,
                admin.prenom AS admin_prenom,
                admin.nom AS admin_nom,
                admin.email AS admin_email
         FROM users
         LEFT JOIN maisons ON maisons.id = users.maison_id
         LEFT JOIN users admin ON admin.maison_id = users.maison_id AND admin.rolee = 'admin'
         WHERE users.pseudonyme = $1
         ORDER BY admin.id ASC
         LIMIT 1`,
        [login]
      );
      const user = rows[0];
      const settings = await getAppSettings(user?.maison_id);

      if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' });
      const valid = await bcrypt.compare(password, user.mot_de_passe);
      if (!valid) return res.status(401).json({ error: 'Identifiants incorrects.' });
      if (user.statut === 'Attente') {
        return res.status(403).json({ error: 'Votre compte est en attente de validation par un administrateur.' });
      }
      if (user.statut === 'Refusé') {
        return res.status(403).json({ error: 'Votre compte a ete refuse par un administrateur.' });
      }
      if (user.statut !== 'Approuvé') {
        return res.status(403).json({ error: 'Votre compte n est pas encore actif.' });
      }
      if (settings.maintenanceMode && user.rolee !== 'admin') {
        return res.status(503).json({
          error: "La maison est en maintenance. Merci d'attendre la fin de l'action de l'administrateur.",
          maintenanceMode: true,
        });
      }

      const isAdmin = user.rolee === 'admin';
      const newPoints = parseFloat((parseFloat(user.points) + settings.pointsConnexion).toFixed(2));
      const finalPoints = isAdmin ? Math.max(newPoints, LEVELS.Expert) : newPoints;
      const newNiveau = isAdmin ? 'Expert' : computeLevel(finalPoints);
      const now = new Date();

      await pool.query(
        `UPDATE users
         SET points = $1, niveau = $2, connexions = connexions + 1, derniere_connexion = $3
         WHERE id = $4`,
        [finalPoints, newNiveau, now, user.id]
      );

      await pool.query(
        'INSERT INTO historique_connexion (user_id, heure_co) VALUES ($1, $2)',
        [user.id, now]
      );

      const payload = { id: user.id, login: user.pseudonyme, niveau: newNiveau, rolee: user.rolee, maisonId: user.maison_id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

      res.json({
        token,
        user: mapUser({
          ...user,
          points: finalPoints,
          niveau: newNiveau,
          connexions: Number(user.connexions || 0) + 1,
          derniere_connexion: now,
        }),
      });
    } catch (err) {
      console.error('Erreur login :', err);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  }
);

router.post('/register',
  body('login').notEmpty().trim().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').isEmail().normalizeEmail(),
  body('nom').notEmpty().trim(),
  body('prenom').notEmpty().trim(),
  body('accessCode').notEmpty().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { login, password, email, nom, prenom, sexe, role, accessCode } = req.body;
    const dateNaissance = normalizeDateOnly(req.body.dateNaissance ?? req.body.date_naissance);
    const age = calculateAge(dateNaissance);
    if (isFutureDate(dateNaissance)) {
      return res.status(400).json({ error: 'La date de naissance ne peut pas etre dans le futur.' });
    }
    if (!isAdult(dateNaissance)) {
      return res.status(400).json({ error: 'Vous devez avoir au moins 18 ans pour vous inscrire.' });
    }

    try {
      const existing = await pool.query(
        'SELECT id FROM users WHERE pseudonyme = $1 OR email = $2',
        [login, email]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Login ou email deja utilise.' });
      }

      const houses = await pool.query(
        'SELECT id, nom, code_acces FROM maisons WHERE code_acces = $1 LIMIT 1',
        [accessCode.trim().toUpperCase()]
      );
      const maison = houses.rows[0];
      if (!maison) {
        return res.status(404).json({ error: 'Code acces maison invalide.' });
      }
      const settings = await getAppSettings(maison.id);
      if (settings.maintenanceMode) {
        return res.status(503).json({ error: 'Les inscriptions sont fermees pendant la maintenance.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const statut = settings.registrationAuto ? 'Approuv\u00e9' : 'Attente';
      const message = settings.registrationAuto
        ? "L'administrateur a confirme l'inscription automatiquement. Vous allez etre redirige vers votre compte."
        : "Votre demande a ete envoyee a l'administrateur de la maison. Vous pourrez vous connecter apres validation.";

      const result = await pool.query(
        `INSERT INTO users (
          pseudonyme, mot_de_passe, email, nom, prenom, age, genre, date_naissance,
          rolee, role_maison, maison_id, niveau, points, statut, connexions, actions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'habitant', $9, $10, 'Débutant', 0, $11, 0, 0)
        RETURNING *`,
        [login, passwordHash, email, nom, prenom, age, toDbGenre(sexe), dateNaissance, role || 'autre', maison.id, statut]
      );

      if (settings.registrationAuto) {
        const user = result.rows[0];
        const payload = {
          id: user.id,
          login: user.pseudonyme,
          niveau: user.niveau,
          rolee: user.rolee,
          maisonId: user.maison_id,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        return res.status(201).json({
          message,
          autoApproved: true,
          token,
          user: mapUser({ ...user, maison_nom: maison.nom, code_acces: accessCode.trim().toUpperCase() }),
        });
      }

      res.status(201).json({ message, id: result.rows[0].id, autoApproved: false });
    } catch (err) {
      console.error('Erreur register :', err.message);
      res.status(500).json({ error: 'Erreur serveur : ' + err.message });
    }
  }
);

router.post('/create-house',
  body('houseName').notEmpty().trim().isLength({ min: 2 }),
  body('login').notEmpty().trim().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').isEmail().normalizeEmail(),
  body('nom').notEmpty().trim(),
  body('prenom').notEmpty().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Informations invalides.' });

    const { houseName, login, password, email, nom, prenom, sexe } = req.body;
    const housingType = req.body.housingType === 'appartement' ? 'appartement' : 'maison';
    const nbPieces = Math.max(1, Number(req.body.nbPieces || 1));
    const budgetKwh = Math.max(0, Number(req.body.budgetKwh || 0));
    const pieces = normalizeHousePieces({ ...req.body, nbPieces });
    const dateNaissance = normalizeDateOnly(req.body.dateNaissance ?? req.body.date_naissance);
    const age = calculateAge(dateNaissance);
    if (isFutureDate(dateNaissance)) {
      return res.status(400).json({ error: 'La date de naissance ne peut pas etre dans le futur.' });
    }
    if (!isAdult(dateNaissance)) {
      return res.status(400).json({ error: 'Vous devez avoir au moins 18 ans pour creer une maison.' });
    }
    const client = await pool.connect();

    try {
      const settings = await getAppSettings();
      if (settings.maintenanceMode) {
        return res.status(503).json({ error: 'La creation de maison est fermee pendant la maintenance.' });
      }

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id FROM users WHERE pseudonyme = $1 OR email = $2',
        [login, email]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Login ou email deja utilise.' });
      }

      let code = generateHouseCode();
      for (let i = 0; i < 5; i += 1) {
        const sameCode = await client.query('SELECT id FROM maisons WHERE code_acces = $1', [code]);
        if (sameCode.rows.length === 0) break;
        code = generateHouseCode();
      }

      const houseResult = await client.query(
        'INSERT INTO maisons (nom, code_acces) VALUES ($1, $2) RETURNING id',
        [houseName, code]
      );

      const houseId = houseResult.rows[0].id;
      await client.query(
        `CREATE TABLE IF NOT EXISTS maison_config (
          maison_id INT PRIMARY KEY REFERENCES maisons(id) ON DELETE CASCADE,
          logement_type VARCHAR(20) NOT NULL DEFAULT 'maison',
          nb_pieces INT NOT NULL DEFAULT 1,
          budget_kwh NUMERIC(10,2) NOT NULL DEFAULT 0,
          pieces JSONB NOT NULL DEFAULT '[]'::jsonb,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`
      );
      await client.query(
        `INSERT INTO maison_config (maison_id, logement_type, nb_pieces, budget_kwh, pieces)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [houseId, housingType, nbPieces, budgetKwh, JSON.stringify(pieces)]
      );
      const passwordHash = await bcrypt.hash(password, 12);
      const userResult = await client.query(
        `INSERT INTO users (
          pseudonyme, mot_de_passe, email, nom, prenom, age, genre, date_naissance,
          rolee, role_maison, maison_id, niveau, points, statut, connexions, actions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin', $9, $10, 'Expert', 75, 'Approuvé', 0, 0)
        RETURNING id`,
        [login, passwordHash, email, nom, prenom, age, toDbGenre(sexe), dateNaissance, 'admin', houseId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Maison creee. Votre compte admin est actif.',
        house: { id: houseId, nom: houseName, code_acces: code },
        userId: userResult.rows[0].id,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erreur creation maison :', err);
      res.status(500).json({ error: 'Erreur serveur.' });
    } finally {
      client.release();
    }
  }
);

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces,
              admin.id AS admin_id,
              admin.pseudonyme AS admin_login,
              admin.prenom AS admin_prenom,
              admin.nom AS admin_nom,
              admin.email AS admin_email
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       LEFT JOIN users admin ON admin.maison_id = users.maison_id AND admin.rolee = 'admin'
       WHERE users.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(mapUser(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  const { nom, prenom, genre, role, rolee, photo, password } = req.body;
  const dateNaissance = normalizeDateOnly(req.body.dateNaissance ?? req.body.date_naissance);
  if (isFutureDate(dateNaissance)) {
    return res.status(400).json({ error: 'La date de naissance ne peut pas etre dans le futur.' });
  }
  const currentUserResult = await pool.query('SELECT date_naissance FROM users WHERE id = $1', [req.user.id]);
  const currentBirthDate = normalizeDateOnly(currentUserResult.rows[0]?.date_naissance);
  if (!isAdult(currentBirthDate)) {
    return res.status(403).json({ error: 'Vous devez avoir au moins 18 ans pour modifier votre profil.' });
  }
  if (dateNaissance !== undefined && !isAdult(dateNaissance)) {
    return res.status(400).json({ error: 'La date de naissance doit correspondre a une personne majeure.' });
  }
  const age = dateNaissance !== undefined ? calculateAge(dateNaissance) : req.body.age;

  try {
    let motDePasse;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court.' });
      motDePasse = await bcrypt.hash(password, 12);
    }

    const fields = [];
    const values = [];

    function addField(column, value) {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }

    if (nom !== undefined) addField('nom', nom);
    if (prenom !== undefined) addField('prenom', prenom);
    if (age !== undefined) addField('age', age);
    if (genre !== undefined) addField('genre', toDbGenre(genre));
    if (dateNaissance !== undefined) addField('date_naissance', dateNaissance);
    if (role !== undefined) addField('role_maison', role);
    if (rolee !== undefined) addField('rolee', rolee);
    if (photo !== undefined) addField('photo', photo);
    if (motDePasse !== undefined) addField('mot_de_passe', motDePasse);

    if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier.' });

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`, values);

    res.json({ message: 'Profil mis a jour.' });
  } catch (err) {
    console.error('Erreur update profil :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/me', authenticate, async (req, res) => {
  const { password, confirmation } = req.body || {};

  if (confirmation !== 'SUPPRIMER') {
    return res.status(400).json({ error: 'Confirmation invalide.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis.' });
  }

  try {
    const { rows } = await pool.query('SELECT id, mot_de_passe FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const valid = await bcrypt.compare(password, user.mot_de_passe);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Compte supprime definitivement.' });
  } catch (err) {
    console.error('Erreur suppression compte :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/log-action', authenticate, async (req, res) => {
  try {
    const settings = await getAppSettings(req.user.maisonId);
    const { rows } = await pool.query('SELECT points, actions FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const isAdmin = req.user.rolee === 'admin';
    const newPoints = parseFloat((parseFloat(rows[0].points) + settings.pointsConsultation).toFixed(2));
    const finalPoints = isAdmin ? Math.max(newPoints, LEVELS.Expert) : newPoints;
    const newNiveau = isAdmin ? 'Expert' : computeLevel(finalPoints);

    await pool.query(
      'UPDATE users SET actions = actions + 1, points = $1, niveau = $2 WHERE id = $3',
      [finalPoints, newNiveau, req.user.id]
    );
    res.json({ points: finalPoints, niveau: newNiveau, actions: Number(rows[0].actions || 0) + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
