import { Router } from 'express';
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
    res.json(rows.map(mapUser));
  } catch (err) {
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
  const { login, nom, prenom, genre, sexe, niveau, statut, status, points, role, rolee, photo } = req.body;
  const dateNaissance = normalizeDateOnly(req.body.dateNaissance ?? req.body.date_naissance);
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
    if (genre !== undefined || sexe !== undefined) addField('genre', genre ?? sexe);
    if (dateNaissance !== undefined) addField('date_naissance', dateNaissance);
    if (photo !== undefined) addField('photo', photo);
    if (niveau !== undefined) addField('niveau', LEVEL_TO_DB[niveau] || niveau);
    const nextStatut = statut ?? (status ? STATUS_TO_DB[status] : undefined);
    if (nextStatut !== undefined) addField('statut', nextStatut);
    if (points !== undefined) addField('points', points);
    if (role !== undefined) addField('role_maison', role);
    if (rolee !== undefined && ['admin', 'habitant'].includes(rolee)) addField('rolee', rolee);

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
