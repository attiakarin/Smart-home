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
  'Intermédiaire': 5,
  'Avancé': 15,
  Expert: 30,
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

      const newPoints = parseFloat((parseFloat(user.points) + settings.pointsConnexion).toFixed(2));
      const newNiveau = computeLevel(newPoints);
      const now = new Date();

      await pool.query(
        `UPDATE users
         SET points = $1, niveau = $2, connexions = connexions + 1, derniere_connexion = $3
         WHERE id = $4`,
        [newPoints, newNiveau, now, user.id]
      );

      await pool.query(
        'INSERT INTO historique_connexion (user_id, heure_co) VALUES ($1, $2)',
        [user.id, now]
      );

      const payload = { id: user.id, login: user.pseudonyme, niveau: newNiveau, rolee: user.rolee, maisonId: user.maison_id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

      res.json({ token, user: mapUser({ ...user, points: newPoints, niveau: newNiveau }) });
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
      const passwordHash = await bcrypt.hash(password, 12);
      const userResult = await client.query(
        `INSERT INTO users (
          pseudonyme, mot_de_passe, email, nom, prenom, age, genre, date_naissance,
          rolee, role_maison, maison_id, niveau, points, statut, connexions, actions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin', $9, $10, 'Expert', 30, 'Approuvé', 0, 0)
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
    const settings = await getAppSettings();
    const { rows } = await pool.query('SELECT points, actions FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const newPoints = parseFloat((parseFloat(rows[0].points) + settings.pointsConsultation).toFixed(2));
    const newNiveau = computeLevel(newPoints);

    await pool.query(
      'UPDATE users SET actions = actions + 1, points = $1, niveau = $2 WHERE id = $3',
      [newPoints, newNiveau, req.user.id]
    );
    res.json({ points: newPoints, niveau: newNiveau, actions: Number(rows[0].actions || 0) + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
