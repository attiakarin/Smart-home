/**
 * Service API - Centralise toutes les requêtes vers le backend
 * URL de base : /api en développement (proxy Vite)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Récupère le token JWT du localStorage
const getToken = () => localStorage.getItem('sh_token');

// Headers par défaut avec authentification
const getHeaders = (includeAuth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// Gestion globale des erreurs
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
  }
  return response.json();
};

// ─── AUTHENTIFICATION ────────────────────────────────────────────────────

export const authAPI = {
  // Connexion
  login: async (login, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ login, password }),
    });
    const data = await handleResponse(response);
    // Sauvegarde le token et l'utilisateur
    if (data.token) localStorage.setItem('sh_token', data.token);
    if (data.user) localStorage.setItem('sh_current_user', JSON.stringify(data.user));
    return data;
  },

  // Inscription
  register: async (userData, options = {}) => {
    const { persistSession = true } = options;
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(userData),
    });
    const data = await handleResponse(response);
    if (persistSession && data.token) localStorage.setItem('sh_token', data.token);
    if (persistSession && data.user) localStorage.setItem('sh_current_user', JSON.stringify(data.user));
    if (persistSession && !data.token) {
      localStorage.removeItem('sh_token');
      localStorage.removeItem('sh_current_user');
    }
    return data;
  },

  // Crée une maison et le compte admin associé
  createHouse: async (houseData) => {
    const response = await fetch(`${API_BASE_URL}/auth/create-house`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(houseData),
    });
    return handleResponse(response);
  },

  // Récupère l'utilisateur actuel
  getMe: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Met a jour le profil de l'utilisateur connecte
  updateProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(profileData),
    });
    return handleResponse(response);
  },

  // Supprime definitivement le compte connecte
  deleteMe: async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'DELETE',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Enregistre une action utilisateur
  logAction: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/log-action`, {
      method: 'POST',
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Déconnexion
  logout: () => {
    localStorage.removeItem('sh_token');
    localStorage.removeItem('sh_current_user');
    localStorage.removeItem('sh_devices');
  },
};

// ─── APPAREILS (DEVICES) ────────────────────────────────────────────────

export const devicesAPI = {
  // Récupère tous les appareils
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/devices`, {
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Récupère un appareil spécifique
  getOne: async (id) => {
    const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Ajoute un nouvel appareil
  create: async (deviceData) => {
    const response = await fetch(`${API_BASE_URL}/devices`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(deviceData),
    });
    return handleResponse(response);
  },

  // Modifie un appareil
  update: async (id, deviceData) => {
    const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(deviceData),
    });
    return handleResponse(response);
  },

  // Supprime un appareil
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Active/désactive un appareil
  toggle: async (id) => {
    const response = await fetch(`${API_BASE_URL}/devices/${id}/toggle`, {
      method: 'PATCH',
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },
};

// ─── UTILISATEURS ───────────────────────────────────────────────────────

export const usersAPI = {
  // Récupère tous les utilisateurs
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Recupere les membres approuves de la maison
  getMembers: async () => {
    const response = await fetch(`${API_BASE_URL}/users/members`, {
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Récupère un utilisateur
  getOne: async (id) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  create: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Met à jour un utilisateur
  update: async (id, userData) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Supprime un utilisateur
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },
};

// Parametres plateforme
export const settingsAPI = {
  get: async () => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  update: async (settings) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(settings),
    });
    return handleResponse(response);
  },
};

// Services consultables
export const publicAPI = {
  getCatalog: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'Tous') params.set(key, value);
    });
    const query = params.toString();
    const response = await fetch(`${API_BASE_URL}/public/catalog${query ? `?${query}` : ''}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  getCatalogFilters: async () => {
    const response = await fetch(`${API_BASE_URL}/public/catalog/filters`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },

  getServices: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'Tous') params.set(key, value);
    });
    const query = params.toString();
    const response = await fetch(`${API_BASE_URL}/public/services${query ? `?${query}` : ''}`, {
      headers: getHeaders(false),
    });
    return handleResponse(response);
  },
};
