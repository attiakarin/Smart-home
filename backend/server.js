import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';

import authRoutes    from './routes/auth.js';
import usersRoutes   from './routes/users.js';
import devicesRoutes from './routes/devices.js';
import publicRoutes  from './routes/public.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middlewares ───────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/users',   usersRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/public',  publicRoutes);

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── 404 handler ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));

// ─── Démarrage ────────────────────────────────────────────────────────────
await testConnection();

// Fonction pour chercher un port libre
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} déjà utilisé, essai du port ${port + 1}...`);
      server.close();
      startServer(port + 1);
    } else {
      console.error('Erreur serveur:', err);
      process.exit(1);
    }
  });
}

startServer(parseInt(PORT));
