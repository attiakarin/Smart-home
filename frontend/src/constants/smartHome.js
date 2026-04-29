export const LEVELS = {
  'Débutant': { points: 0, label: 'Débutant', color: '#6b7280' },
  'Intermédiaire': { points: 5, label: 'Intermédiaire', color: '#3b82f6' },
  'Avancé': { points: 15, label: 'Avancé', color: '#8b5cf6' },
  Expert: { points: 30, label: 'Expert', color: '#f59e0b' },
};

export const LEVEL_OPTIONS = Object.keys(LEVELS);
export const LEVEL_ORDER = LEVEL_OPTIONS;

export const LEVEL_POINTS = Object.fromEntries(
  Object.entries(LEVELS).map(([level, config]) => [level, config.points])
);

export const LEVEL_COLORS = Object.fromEntries(
  Object.entries(LEVELS).map(([level, config]) => [level, config.color])
);

export const ROOMS = ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Entrée', 'Garage', 'Couloir'];

export const DEVICE_TYPES = [
  'Thermostat',
  'Caméra',
  'Éclairage',
  'Capteur',
  'Sécurité',
  'Détecteur',
  'Prise',
  'Électroménager',
  'Énergie',
  'Télévision',
  'Plaque de cuisson',
  'Sèche-serviette',
  'Cafetière',
];

export function formatDateTime(value) {
  if (!value) return 'Jamais';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Jamais';
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
