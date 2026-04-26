import jwt from 'jsonwebtoken';

// Vérifie le token JWT dans le header Authorization
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token manquant. Authentification requise.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, login, niveau }
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

// Vérifie que l'utilisateur a accès à un module selon son niveau
export function requireModule(module) {
  return (req, res, next) => {
    const niveau = req.user?.niveau;
    const allowed = {
      information:    true,
      visualisation:  true,
      gestion:        niveau === 'Avancé' || niveau === 'Expert',
      administration: niveau === 'Expert' && req.user?.rolee === 'admin',
    };
    if (!allowed[module]) {
      return res.status(403).json({ error: 'Accès refusé pour ce module.' });
    }
    next();
  };
}
