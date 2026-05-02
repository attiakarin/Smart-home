const STATUS_TO_API = {
  Attente: 'pending',
  Approuvé: 'approved',
  Refusé: 'rejected',
};

export const STATUS_TO_DB = {
  pending: 'Attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

export const LEVEL_TO_DB = {
  débutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  intermédiaire: 'Intermédiaire',
  avance: 'Avancé',
  avancé: 'Avancé',
  expert: 'Expert',
  Débutant: 'Débutant',
  Intermédiaire: 'Intermédiaire',
  Avancé: 'Avancé',
  Expert: 'Expert',
};

function formatDateOnly(value) {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function mapUser(user) {
  if (!user) return null;

  const { mot_de_passe, ...safeUser } = user;

  return {
    ...safeUser,
    points: Number(safeUser.points || 0),
    connexions: Number(safeUser.connexions || 0),
    actions: Number(safeUser.actions || 0),
    login: safeUser.pseudonyme,
    sexe: safeUser.genre,
    dateNaissance: formatDateOnly(safeUser.date_naissance),
    lastLogin: safeUser.derniere_connexion,
    role: safeUser.role_maison || 'autre',
    appRole: safeUser.rolee,
    maisonId: safeUser.maison_id,
    maisonNom: safeUser.maison_nom,
    maisonCode: safeUser.rolee === 'admin' ? safeUser.code_acces : undefined,
    houseAdmin: safeUser.admin_id ? {
      id: safeUser.admin_id,
      login: safeUser.admin_login,
      prenom: safeUser.admin_prenom,
      nom: safeUser.admin_nom,
      email: safeUser.admin_email,
    } : undefined,
    status: STATUS_TO_API[safeUser.statut] || safeUser.statut,
  };
}
