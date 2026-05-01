import { Router } from 'express';
import { authenticate, requireModule } from '../middleware/auth.js';
import { getAppSettings, saveAppSettings } from '../config/appSettings.js';

const router = Router();

router.get('/', authenticate, requireModule('administration'), async (req, res) => {
  try {
    res.json(await getAppSettings(req.user.maisonId));
  } catch (err) {
    console.error('Erreur lecture parametres :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/', authenticate, requireModule('administration'), async (req, res) => {
  try {
    const current = await getAppSettings(req.user.maisonId);
    const settings = await saveAppSettings({ ...current, ...req.body }, req.user.maisonId);
    res.json(settings);
  } catch (err) {
    console.error('Erreur sauvegarde parametres :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;
