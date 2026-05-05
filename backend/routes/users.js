import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticate, requireModule } from '../middleware/auth.js';
import { LEVEL_TO_DB, mapUser, STATUS_TO_DB } from '../utils/userMapper.js';

const router = Router();

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

function toDbLevel(value = 'Débutant') {
  const normalized = value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const levels = {
    debutant: 'D\u00e9butant',
    intermediaire: 'Interm\u00e9diaire',
    avance: 'Avanc\u00e9',
    expert: 'Expert',
  };
  return levels[normalized] || 'D\u00e9butant';
}

const LEVEL_MIN_POINTS = {
  'D\u00e9butant': 0,
  'Interm\u00e9diaire': 25,
  'Avanc\u00e9': 50,
  Expert: 75,
};

function toDbStatus(value = 'approved') {
  const statuses = {
    pending: 'Attente',
    approved: 'Approuv\u00e9',
    rejected: 'Refus\u00e9',
    Attente: 'Attente',
  };
  return statuses[value] || 'Approuv\u00e9';
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

async function attachLoginHistory(users) {
  if (users.length === 0) return [];

  const userIds = users.map(user => user.id);
  const { rows } = await pool.query(
    `SELECT user_id,
            TO_CHAR(heure_co::date, 'YYYY-MM-DD') AS date,
            COUNT(*)::int AS connexions
     FROM historique_connexion
     WHERE user_id = ANY($1::int[])
       AND heure_co::date >= CURRENT_DATE - INTERVAL '6 days'
     GROUP BY user_id, heure_co::date
     ORDER BY date ASC`,
    [userIds]
  );

  const historyByUserId = rows.reduce((acc, row) => {
    const key = String(row.user_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      date: row.date,
      connexions: Number(row.connexions || 0),
    });
    return acc;
  }, {});

  return users.map(user => ({
    ...user,
    loginHistory: historyByUserId[String(user.id)] || [],
  }));
}

router.get('/members', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE statut = 'Approuvé'
         AND (users.maison_id = $1 OR $1 IS NULL)
       ORDER BY niveau DESC, points DESC`,
      [req.user.maisonId || null]
    );
    const usersWithHistory = await attachLoginHistory(rows);
    res.json(usersWithHistory.map(mapUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/house-admin', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.maison_id = $1
         AND users.rolee = 'admin'
       ORDER BY users.id ASC
       LIMIT 1`,
      [req.user.maisonId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Administrateur introuvable pour cette maison.' });
    res.json(mapUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/house-admins', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.maison_id = $1
         AND users.rolee = 'admin'
         AND users.statut = 'Approuvé'
       ORDER BY users.id ASC`,
      [req.user.maisonId]
    );
    res.json(rows.map(mapUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.use(authenticate, requireModule('administration'));

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.maison_id = $1 OR $1 IS NULL
       ORDER BY users.id`,
      [req.user.maisonId || null]
    );
    const usersWithHistory = await attachLoginHistory(rows);
    res.json(usersWithHistory.map(mapUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', async (req, res) => {
  const {
    login,
    email,
    password,
    nom,
    prenom,
    genre,
    sexe,
    niveau = 'Débutant',
    points = 0,
    role = 'autre',
    rolee = 'habitant',
    status = 'approved',
    statut,
    photo = null,
  } = req.body;
  const dateNaissance = normalizeDateOnly(req.body.dateNaissance ?? req.body.date_naissance);

  if (!login || !email || !password || !nom || !prenom) {
    return res.status(400).json({ error: 'Pseudonyme, email, mot de passe, nom et prénom sont obligatoires.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }
  if (isFutureDate(dateNaissance)) {
    return res.status(400).json({ error: 'La date de naissance ne peut pas être dans le futur.' });
  }

  const finalRolee = rolee === 'admin' ? 'admin' : 'habitant';
  const finalNiveau = finalRolee === 'admin' ? 'Expert' : niveau;
  const finalPoints = finalRolee === 'admin' ? Math.max(Number(points || 0), LEVEL_MIN_POINTS.Expert) : Number(points || 0);
  const nextStatut = toDbStatus(statut ?? status);
  const age = calculateAge(dateNaissance);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (
        pseudonyme, mot_de_passe, email, nom, prenom, age, genre, date_naissance,
        rolee, role_maison, maison_id, niveau, points, photo, statut, connexions, actions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0, 0)
      RETURNING id`,
      [
        login,
        passwordHash,
        email,
        nom,
        prenom,
        age,
        toDbGenre(genre ?? sexe),
        dateNaissance,
        finalRolee,
        role || 'autre',
        req.user.maisonId || null,
        toDbLevel(finalNiveau),
        finalPoints,
        photo,
        nextStatut,
      ]
    );

    const created = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(mapUser(created.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce pseudonyme ou cet email existe déjà.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.id = $1
         AND (users.maison_id = $2 OR $2 IS NULL)`,
      [req.params.id, req.user.maisonId || null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(mapUser(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/:id', async (req, res) => {
  const { login, nom, prenom, genre, sexe, niveau, statut, status, points, role, rolee, photo, password } = req.body;
  const dateNaissance = normalizeDateOnly(req.body.dateNaissance ?? req.body.date_naissance);
  if (isFutureDate(dateNaissance)) {
    return res.status(400).json({ error: 'La date de naissance ne peut pas etre dans le futur.' });
  }
  if (String(req.params.id) === String(req.user.id)) {
    const currentUserResult = await pool.query('SELECT date_naissance FROM users WHERE id = $1', [req.user.id]);
    const currentBirthDate = normalizeDateOnly(currentUserResult.rows[0]?.date_naissance);
    if (!isAdult(currentBirthDate)) {
      return res.status(403).json({ error: 'Vous devez avoir au moins 18 ans pour modifier votre profil.' });
    }
  }
  if (String(req.params.id) === String(req.user.id) && dateNaissance !== undefined && !isAdult(dateNaissance)) {
    return res.status(400).json({ error: 'La date de naissance doit correspondre a une personne majeure.' });
  }
  const age = dateNaissance !== undefined ? calculateAge(dateNaissance) : req.body.age;
  try {
    const fields = [];
    const values = [];

    function addField(column, value) {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }

    if (login !== undefined) addField('pseudonyme', login);
    if (nom !== undefined) addField('nom', nom);
    if (prenom !== undefined) addField('prenom', prenom);
    if (age !== undefined) addField('age', age);
    if (genre !== undefined || sexe !== undefined) addField('genre', toDbGenre(genre ?? sexe));
    if (dateNaissance !== undefined) addField('date_naissance', dateNaissance);
    if (photo !== undefined) addField('photo', photo);
    const nextRolee = rolee !== undefined && ['admin', 'habitant'].includes(rolee) ? rolee : undefined;
    const nextNiveau = nextRolee === 'admin' ? 'Expert' : niveau;
    const dbNiveau = nextNiveau !== undefined ? (LEVEL_TO_DB[nextNiveau] || toDbLevel(nextNiveau)) : undefined;
    const nextPoints = nextRolee === 'admin'
      ? Math.max(Number(points || 0), LEVEL_MIN_POINTS.Expert)
      : points !== undefined
        ? points
        : dbNiveau !== undefined
          ? LEVEL_MIN_POINTS[dbNiveau]
          : undefined;

    if (dbNiveau !== undefined) addField('niveau', dbNiveau);
    const nextStatut = statut ?? (status ? STATUS_TO_DB[status] : undefined);
    if (nextStatut !== undefined) addField('statut', nextStatut);
    if (nextPoints !== undefined) addField('points', nextPoints);
    if (role !== undefined) addField('role_maison', role);
    if (nextRolee !== undefined) addField('rolee', nextRolee);
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
      const passwordHash = await bcrypt.hash(password, 12);
      addField('mot_de_passe', passwordHash);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier.' });

    values.push(req.params.id, req.user.maisonId || null);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${values.length - 1} AND (maison_id = $${values.length} OR $${values.length} IS NULL)
       RETURNING id`,
      values
    );

    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    const updated = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.id = $1`,
      [rows[0].id]
    );
    res.json(mapUser(updated.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }
  try {
    await pool.query(
      `DELETE FROM historique_connexion
       USING users
       WHERE users.id = historique_connexion.user_id
         AND users.id = $1
         AND (users.maison_id = $2 OR $2 IS NULL)`,
      [req.params.id, req.user.maisonId || null]
    );
    const deleted = await pool.query(
      'DELETE FROM users WHERE id = $1 AND (maison_id = $2 OR $2 IS NULL)',
      [req.params.id, req.user.maisonId || null]
    );
    if (deleted.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ message: 'Utilisateur supprime.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT heure_co FROM historique_connexion WHERE user_id = $1 ORDER BY heure_co DESC LIMIT 30',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
