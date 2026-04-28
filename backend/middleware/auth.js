import jwt from 'jsonwebtoken';

function normalizeLevel(niveau = '') {
  return niveau
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function levelRank(niveau = '') {
  const ranks = {
    debutant: 1,
    intermediaire: 2,
    avance: 3,
    expert: 4,
  };
  return ranks[normalizeLevel(niveau)] || 0;
}

function hasMinLevel(niveau, minLevel) {
  return levelRank(niveau) >= levelRank(minLevel);
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
    const niveau = req.user?.niveau;
    const isAdmin = normalizeLevel(niveau) === 'expert' && req.user?.rolee === 'admin';
    const allowed = {
      information: true,
      visualisation: true,
      gestion: hasMinLevel(niveau, 'intermediaire'),
      device_toggle: hasMinLevel(niveau, 'intermediaire'),
      device_create: hasMinLevel(niveau, 'avance'),
      device_config: hasMinLevel(niveau, 'avance'),
      reports: hasMinLevel(niveau, 'avance'),
      device_delete: isAdmin,
      administration: isAdmin,
      users_manage: isAdmin,
      settings_manage: isAdmin,
    };

    if (!allowed[module]) {
      return res.status(403).json({ error: 'Accès refusé pour ce module.' });
    }

    next();
  };
}
