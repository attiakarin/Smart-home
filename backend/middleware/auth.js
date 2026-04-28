import jwt from 'jsonwebtoken';

function normalizeLevel(niveau = '') {
  return niveau
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant. Authentification requise.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expire.' });
  }
}

export function requireModule(module) {
  return (req, res, next) => {
    const niveau = normalizeLevel(req.user?.niveau);
    const allowed = {
      information: true,
      visualisation: true,
      gestion: niveau === 'avance' || niveau === 'expert',
      administration: niveau === 'expert' && req.user?.rolee === 'admin',
    };

    if (!allowed[module]) {
      return res.status(403).json({ error: 'Acces refuse pour ce module.' });
    }

    next();
  };
}
