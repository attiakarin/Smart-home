import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireModule } from '../middleware/auth.js';
import { LEVEL_TO_DB, mapUser, STATUS_TO_DB } from '../utils/userMapper.js';

const router = Router();

// Liste des membres approuves de la maison: accessible au module visualisation.
router.get('/members', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE statut = 'Approuvé'
         AND (users.maison_id = ? OR ? IS NULL)
       ORDER BY niveau DESC, points DESC`,
      [req.user.maisonId || null, req.user.maisonId || null]
    );
    res.json(users.map(mapUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Toutes les routes nécessitent d'être connecté + module administration
router.use(authenticate, requireModule('administration'));

// ─── GET /api/users ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.maison_id = ? OR ? IS NULL
       ORDER BY users.id`,
      [req.user.maisonId || null, req.user.maisonId || null]
    );
    res.json(users.map(mapUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/users/members ────────────────────────────────────────────────
// Accessible aux utilisateurs connectés (niveau visualisation)
router.get('/members', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE statut = 'Approuvé'
         AND (users.maison_id = ? OR ? IS NULL)
       ORDER BY niveau DESC, points DESC`,
      [req.user.maisonId || null, req.user.maisonId || null]
    );
    res.json(users.map(mapUser));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/users/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT users.id, pseudonyme, email, users.nom, prenom, age, genre, date_naissance, rolee, role_maison, maison_id,
              niveau, points, photo, statut, connexions, actions, derniere_connexion,
              maisons.nom AS maison_nom, maisons.code_acces
       FROM users
       LEFT JOIN maisons ON maisons.id = users.maison_id
       WHERE users.id = ?
         AND (users.maison_id = ? OR ? IS NULL)`,
      [req.params.id, req.user.maisonId || null, req.user.maisonId || null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(mapUser(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── PUT /api/users/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { niveau, statut, status, points, role, rolee } = req.body;
  try {
    const fields = [];
    const values = [];

    if (niveau !== undefined) { fields.push('niveau = ?'); values.push(LEVEL_TO_DB[niveau] || niveau); }
    const nextStatut = statut ?? (status ? STATUS_TO_DB[status] : undefined);
    if (nextStatut !== undefined) { fields.push('statut = ?'); values.push(nextStatut); }
    if (points !== undefined)  { fields.push('points = ?'); values.push(points); }
    if (role !== undefined)    { fields.push('role_maison = ?'); values.push(role); }
    if (rolee !== undefined && ['admin', 'habitant'].includes(rolee)) {
      fields.push('rolee = ?');
      values.push(rolee);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier.' });

    values.push(req.params.id, req.user.maisonId || null, req.user.maisonId || null);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND (maison_id = ? OR ? IS NULL)`,
      values
    );
    res.json({ message: 'Utilisateur mis à jour.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── DELETE /api/users/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  // Empêche de se supprimer soi-même
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }
  try {
    await pool.query(
      `DELETE historique_connexion FROM historique_connexion
       INNER JOIN users ON users.id = historique_connexion.user_id
       WHERE users.id = ? AND (users.maison_id = ? OR ? IS NULL)`,
      [req.params.id, req.user.maisonId || null, req.user.maisonId || null]
    );
    await pool.query(
      'DELETE FROM users WHERE id = ? AND (maison_id = ? OR ? IS NULL)',
      [req.params.id, req.user.maisonId || null, req.user.maisonId || null]
    );
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/users/:id/history ────────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT heure_co FROM historique_connexion WHERE user_id = ? ORDER BY heure_co DESC LIMIT 30',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
