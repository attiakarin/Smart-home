import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';

import authRoutes    from './routes/auth.js';
import usersRoutes   from './routes/users.js';
import devicesRoutes from './routes/devices.js';
import publicRoutes  from './routes/public.js';
import settingsRoutes from './routes/settings.js';
import requestsRoutes from './routes/requests.js';
import houseRoutes from './routes/house.js';

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
app.use('/api/settings', settingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/house', houseRoutes);

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── 404 handler ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));

// ─── Démarrage ────────────────────────────────────────────────────────────
await testConnection();

const server = app.listen(parseInt(PORT, 10), () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} déjà utilisé. Arrête l'ancien serveur Node puis relance npm run dev.`);
  } else {
    console.error('Erreur serveur:', err);
  }
  process.exit(1);
});
