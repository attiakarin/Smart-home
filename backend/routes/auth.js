import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../config/mailer.js';
import { mapUser } from '../utils/userMapper.js';

const router = Router();

const POINTS_CONFIG = { connexion: 0.25, consultation: 0.50 };
const LEVELS = {
  'Débutant':      0,
  'Intermédiaire': 5,
  'Avancé':        15,
  'Expert':        30,
};

function generateHouseCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function computeLevel(points) {
  if (points >= LEVELS['Expert'])        return 'Expert';
  if (points >= LEVELS['Avancé'])        return 'Avancé';
  if (points >= LEVELS['Intermédiaire']) return 'Intermédiaire';
  return 'Débutant';
}

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login',
  body('login').notEmpty().trim(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Login et mot de passe requis.' });

    const { login, password } = req.body;

    try {
      const [rows] = await pool.query(
        `SELECT users.*, maisons.nom AS maison_nom, maisons.code_acces
         FROM users
         LEFT JOIN maisons ON maisons.id = users.maison_id
         WHERE pseudonyme = ?
         LIMIT 1`,
        [login]
      );
      const user = rows[0];

      if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' });
      const valid = await bcrypt.compare(password, user.mot_de_passe);
      if (!valid) return res.status(401).json({ error: 'Identifiants incorrects.' });
      if (user.statut === 'Attente') {
        return res.status(403).json({ error: 'Votre compte est en attente de validation par un administrateur.' });
      }
      if (user.statut === 'Refusé') {
        return res.status(403).json({ error: 'Votre compte a été refusé par un administrateur.' });
      }
      if (user.statut !== 'Approuvé') {
        return res.status(403).json({ error: 'Votre compte n’est pas encore actif.' });
      }

      // Mise à jour points + connexions
      const newPoints  = parseFloat((parseFloat(user.points) + POINTS_CONFIG.connexion).toFixed(2));
      const newNiveau  = computeLevel(newPoints);
      const now        = new Date();

      await pool.query(
        `UPDATE users SET points = ?, niveau = ?, connexions = connexions + 1, derniere_connexion = ?
         WHERE id = ?`,
        [newPoints, newNiveau, now, user.id]
      );

      await pool.query(
        'INSERT INTO historique_connexion (user_id, heure_co) VALUES (?, ?)',
        [user.id, now]
      );

      const payload = { id: user.id, login: user.pseudonyme, niveau: newNiveau, rolee: user.rolee, maisonId: user.maison_id };
      const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

      res.json({ token, user: mapUser({ ...user, points: newPoints, niveau: newNiveau }) });
    } catch (err) {
      console.error('Erreur login :', err);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  }
);

// ─── POST /api/auth/register ───────────────────────────────────────────────
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

    const { login, password, email, nom, prenom, age, sexe, dateNaissance, role, accessCode } = req.body;

    try {
      // Vérifier doublon
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE pseudonyme = ? OR email = ?',
        [login, email]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Login ou email déjà utilisé.' });
      }

      const [houses] = await pool.query(
        'SELECT id FROM maisons WHERE code_acces = ? LIMIT 1',
        [accessCode.trim().toUpperCase()]
      );
      const maison = houses[0];
      if (!maison) {
        return res.status(404).json({ error: 'Code d’accès maison invalide.' });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const [result] = await pool.query(
        `INSERT INTO users (pseudonyme, mot_de_passe, email, nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
          niveau, points, statut, connexions, actions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'habitant', ?, ?, 'Débutant', 0, 'Attente', 0, 0)`,
        [login, password_hash, email, nom, prenom, age || null, sexe || null, dateNaissance || null, role || 'autre', maison.id]
      );

      // Envoyer email de confirmation
      try {
        await sendWelcomeEmail(email, prenom);
      } catch (mailErr) {
        console.warn('Email non envoyé :', mailErr.message);
      }

      res.status(201).json({ message: 'Inscription en attente de validation par un administrateur.', id: result.insertId });
    } catch (err) {
      console.error('Erreur register :', err.message, err.code, err.sql);
      res.status(500).json({ error: 'Erreur serveur : ' + err.message });
    }
  }
);

// ─── POST /api/auth/create-house ────────────────────────────────────────────
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

    const { houseName, login, password, email, nom, prenom, age, sexe, dateNaissance, role } = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [existing] = await conn.query(
        'SELECT id FROM users WHERE pseudonyme = ? OR email = ?',
        [login, email]
      );
      if (existing.length > 0) {
        await conn.rollback();
        return res.status(409).json({ error: 'Login ou email déjà utilisé.' });
      }

      let code = generateHouseCode();
      for (let i = 0; i < 5; i += 1) {
        const [sameCode] = await conn.query('SELECT id FROM maisons WHERE code_acces = ?', [code]);
        if (sameCode.length === 0) break;
        code = generateHouseCode();
      }

      const [houseResult] = await conn.query(
        'INSERT INTO maisons (nom, code_acces) VALUES (?, ?)',
        [houseName, code]
      );

      const password_hash = await bcrypt.hash(password, 12);
      const [userResult] = await conn.query(
        `INSERT INTO users (pseudonyme, mot_de_passe, email, nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
          niveau, points, statut, connexions, actions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?, 'Expert', 30, 'Approuvé', 0, 0)`,
        [login, password_hash, email, nom, prenom, age || null, sexe || null, dateNaissance || null, role || 'admin', houseResult.insertId]
      );

      await conn.commit();

      res.status(201).json({
        message: 'Maison créée. Votre compte admin est actif.',
        house: { id: houseResult.insertId, nom: houseName, code_acces: code },
        userId: userResult.insertId,
      });
    } catch (err) {
      await conn.rollback();
      console.error('Erreur création maison :', err);
      res.status(500).json({ error: 'Erreur serveur.' });
    } finally {
      conn.release();
    }
  }
);

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.id = ?`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(mapUser(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── PUT /api/auth/profile ─────────────────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  const { nom, prenom, age, genre, dateNaissance, role, rolee, photo, password } = req.body;

  try {
    let mot_de_passe = undefined;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court.' });
      mot_de_passe = await bcrypt.hash(password, 12);
    }

    const fields = [];
    const values = [];

    if (nom !== undefined)           { fields.push('nom = ?');            values.push(nom); }
    if (prenom !== undefined)        { fields.push('prenom = ?');         values.push(prenom); }
    if (age !== undefined)           { fields.push('age = ?');            values.push(age); }
    if (genre !== undefined)         { fields.push('genre = ?');          values.push(genre); }
    if (dateNaissance !== undefined) { fields.push('date_naissance = ?'); values.push(dateNaissance); }
    if (role !== undefined)          { fields.push('role_maison = ?');    values.push(role); }
    if (rolee !== undefined)         { fields.push('rolee = ?');          values.push(rolee); }
    if (photo !== undefined)         { fields.push('photo = ?');          values.push(photo); }
    if (mot_de_passe !== undefined)  { fields.push('mot_de_passe = ?');  values.push(mot_de_passe); }

    if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier.' });

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Profil mis à jour.' });
  } catch (err) {
    console.error('Erreur update profil :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── POST /api/auth/log-action ─────────────────────────────────────────────
// Incrémente actions + points consultation pour l'utilisateur connecté
router.post('/log-action', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT points, actions FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const newPoints = parseFloat((parseFloat(rows[0].points) + POINTS_CONFIG.consultation).toFixed(2));
    const newNiveau = computeLevel(newPoints);

    await pool.query(
      'UPDATE users SET actions = actions + 1, points = ?, niveau = ? WHERE id = ?',
      [newPoints, newNiveau, req.user.id]
    );
    res.json({ points: newPoints, niveau: newNiveau, actions: Number(rows[0].actions || 0) + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
