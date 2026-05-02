import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, devicesAPI, requestsAPI, settingsAPI, usersAPI } from '../services/api';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    points: Number(user.points || 0),
    connexions: Number(user.connexions || 0),
    actions: Number(user.actions || 0),
  };
}

const LEVELS = {
  'Débutant':      0,
  'Intermédiaire': 5,
  'Avancé':        15,
  'Expert':        30,
};

const DEFAULT_SETTINGS = {
  platformName: 'Ma Maison Connectee',
  registrationAuto: false,
  pointsConnexion: 0.25,
  pointsConsultation: 0.5,
  themeColor: '#1a73e8',
  maintenanceMode: false,
};

function isAdminUser(user) {
  return user?.niveau === 'Expert' && user?.appRole === 'admin';
}

function normalizeLevelName(level = '') {
  return level
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function levelRank(level = '') {
  const ranks = {
    debutant: 1,
    intermediaire: 2,
    avance: 3,
    expert: 4,
  };
  return ranks[normalizeLevelName(level)] || 0;
}

function hasMinLevel(user, minLevel) {
  return levelRank(user?.niveau) >= levelRank(minLevel);
}

function applyThemeColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', color);
  root.style.setProperty('--color-primary-dark', `color-mix(in srgb, ${color} 78%, black)`);
  root.style.setProperty('--color-hero-from', `color-mix(in srgb, ${color} 16%, white)`);
  root.style.setProperty('--color-hero-to', `color-mix(in srgb, ${color} 8%, white)`);
}

function resetThemeColor() {
  applyThemeColor(DEFAULT_SETTINGS.themeColor);
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('sh_current_user');
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  });
  const [devices, setDevices] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [residentRequests, setResidentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('sh_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('sh_settings', JSON.stringify(settings));
    if (isAdminUser(currentUser)) {
      applyThemeColor(settings.themeColor);
      document.body.classList.toggle('maintenance-mode', Boolean(settings.maintenanceMode));
    } else {
      resetThemeColor();
      document.body.classList.remove('maintenance-mode');
    }
  }, [settings, currentUser]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!isAdminUser(currentUser)) return;
      try {
        const data = await settingsAPI.get();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } catch (err) {
        console.error('Erreur chargement parametres:', err);
      }
    };
    loadSettings();
  }, [currentUser]);

  // Charge l'utilisateur actuel au démarrage (si token existe)
  useEffect(() => {
    const initUser = async () => {
      const token = localStorage.getItem('sh_token');
      if (token && !currentUser) {
        try {
          const user = await authAPI.getMe();
          setCurrentUser(normalizeUser(user));
        } catch (err) {
          console.error('Erreur chargement utilisateur:', err);
          authAPI.logout();
        }
      }
    };
    initUser();
  }, []);

  // Charge les appareils quand l'utilisateur se connecte
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      try {
        const data = await devicesAPI.getAll();
        setDevices(data);
      } catch (err) {
        if (err.maintenanceMode) {
          authAPI.logout();
          setCurrentUser(null);
          setDevices([]);
          setUsers([]);
          setAdminRequests([]);
          setResidentRequests([]);
          return;
        }
        console.error('Erreur chargement appareils:', err);
      }
      try {
        const isAdmin = currentUser.niveau === 'Expert' && currentUser.appRole === 'admin';
        const data = isAdmin ? await usersAPI.getAll() : await usersAPI.getMembers();
        setUsers(data.map(normalizeUser));
        if (isAdmin) {
          const requests = await requestsAPI.getAll();
          setAdminRequests(requests);
          setResidentRequests([]);
        } else {
          setAdminRequests([]);
          const requests = await requestsAPI.getMine();
          setResidentRequests(requests);
        }
      } catch (err) {
        if (err.maintenanceMode) {
          authAPI.logout();
          setCurrentUser(null);
          setUsers([]);
          setAdminRequests([]);
          setResidentRequests([]);
          return;
        }
        console.error('Erreur chargement utilisateurs:', err);
      }
    };
    loadData();
  }, [currentUser]);

  const computeLevel = (points) => {
    if (points >= LEVELS['Expert']) return 'Expert';
    if (points >= LEVELS['Avancé']) return 'Avancé';
    if (points >= LEVELS['Intermédiaire']) return 'Intermédiaire';
    return 'Débutant';
  };

  const login = useCallback(async (login, password) => {
    setLoading(true);
    try {
      const result = await authAPI.login(login, password);
      setCurrentUser(normalizeUser(result.user));
      return { success: true, user: result.user };
    } catch (err) {
      return { success: false, error: err.message || 'Erreur de connexion.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authAPI.logout();
    setCurrentUser(null);
    setDevices([]);
    setAdminRequests([]);
    setResidentRequests([]);
    document.body.classList.remove('maintenance-mode');
    resetThemeColor();
  }, []);

  const register = useCallback(async (data, options = {}) => {
    setLoading(true);
    try {
      const result = await authAPI.register(data, { persistSession: options.persistSession !== false });
      if (result.user && options.persistSession !== false) {
        setCurrentUser(normalizeUser(result.user));
      } else if (options.persistSession !== false) {
        setCurrentUser(null);
      }
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message || 'Erreur inscription.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const createHouse = useCallback(async (data) => {
    setLoading(true);
    try {
      const result = await authAPI.createHouse(data);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message || 'Erreur création maison.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userId, data) => {
    try {
      const isOwnProfile = String(currentUser?.id) === String(userId);
      const isAdmin = currentUser?.niveau === 'Expert' && currentUser?.appRole === 'admin';
      let savedUser = null;
      if (isOwnProfile && !isAdmin) {
        const profileData = { ...data, genre: data.genre ?? data.sexe };
        delete profileData.sexe;
        await authAPI.updateProfile(profileData);
      } else {
        savedUser = normalizeUser(await usersAPI.update(userId, data));
      }
      const localPatch = {
        ...(savedUser || data),
        ...(data.points !== undefined ? { points: Number(data.points || 0) } : {}),
        ...(data.rolee ? { appRole: data.rolee } : {}),
      };
      delete localPatch.password;
      setUsers(prev => prev.map(user => (
        String(user.id) === String(userId) ? { ...user, ...localPatch } : user
      )));
      if (String(currentUser?.id) === String(userId)) {
        const updated = { ...currentUser, ...localPatch };
        setCurrentUser(updated);
        localStorage.setItem('sh_current_user', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Erreur mise à jour utilisateur:', err);
      throw err;
    }
  }, [currentUser]);

  const deleteUser = useCallback(async (userId) => {
    try {
      await usersAPI.delete(userId);
      setUsers(prev => prev.filter(user => String(user.id) !== String(userId)));
    } catch (err) {
      console.error('Erreur suppression utilisateur:', err);
      throw err;
    }
  }, []);

  const createUser = useCallback(async (data) => {
    const created = normalizeUser(await usersAPI.create(data));
    setUsers(prev => [...prev, created]);
    return created;
  }, []);

  const updateSettings = useCallback(async (data) => {
    const nextSettings = await settingsAPI.update(data);
    setSettings({ ...DEFAULT_SETTINGS, ...nextSettings });
    return nextSettings;
  }, []);

  const deleteCurrentAccount = useCallback(async (data) => {
    await authAPI.deleteMe(data);
    authAPI.logout();
    setCurrentUser(null);
    setUsers([]);
    setDevices([]);
    setAdminRequests([]);
    setResidentRequests([]);
    document.body.classList.remove('maintenance-mode');
    resetThemeColor();
  }, []);

  const refreshAdminRequests = useCallback(async () => {
    if (!isAdminUser(currentUser)) {
      setAdminRequests([]);
      return [];
    }
    const requests = await requestsAPI.getAll();
    setAdminRequests(requests);
    return requests;
  }, [currentUser]);

  const pendingAdminRequests = adminRequests.filter(request => request.status === 'nouvelle').length;
  const unreadResidentReplies = residentRequests.filter(request => request.adminReply && !request.replyRead).length;

  const refreshResidentRequests = useCallback(async () => {
    if (!currentUser || isAdminUser(currentUser)) {
      setResidentRequests([]);
      return [];
    }
    const requests = await requestsAPI.getMine();
    setResidentRequests(requests);
    return requests;
  }, [currentUser]);

  const markResidentRepliesRead = useCallback(async () => {
    if (!currentUser || isAdminUser(currentUser)) return;
    await requestsAPI.markRepliesRead();
    setResidentRequests(previous => previous.map(request => ({ ...request, replyRead: true })));
  }, [currentUser]);

  const logAction = useCallback(async () => {
    if (!currentUser) return;
    try {
      const result = await authAPI.logAction();
      const points = Number(result.points ?? currentUser.points);
      const actions = Number(result.actions ?? currentUser.actions);
      const nextUser = {
        ...currentUser,
        points,
        actions,
        niveau: computeLevel(points),
      };
      setCurrentUser(nextUser);
      localStorage.setItem('sh_current_user', JSON.stringify(nextUser));
    } catch (err) {
      console.error('Erreur journalisation action:', err);
    }
  }, [currentUser]);

  // Access control helpers
  const canAccess = useCallback((module) => {
    if (!currentUser) return module === 'information';
    const isAdmin = currentUser.appRole === 'admin' && normalizeLevelName(currentUser.niveau) === 'expert';
    switch (module) {
      case 'information':    return true;
      case 'visualisation':  return true;
      case 'gestion':        return hasMinLevel(currentUser, 'intermediaire');
      case 'device_toggle':  return hasMinLevel(currentUser, 'intermediaire');
      case 'device_create':  return hasMinLevel(currentUser, 'avance');
      case 'device_config':  return hasMinLevel(currentUser, 'avance');
      case 'reports':        return hasMinLevel(currentUser, 'avance');
      case 'device_delete':  return isAdmin;
      case 'administration': return isAdmin;
      case 'users_manage':   return isAdmin;
      case 'settings_manage': return isAdmin;
      default: return false;
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      users, setUsers,
      currentUser, setCurrentUser,
      devices, setDevices,
      adminRequests, setAdminRequests,
      pendingAdminRequests, refreshAdminRequests,
      residentRequests, setResidentRequests,
      unreadResidentReplies, refreshResidentRequests, markResidentRepliesRead,
      login, logout, register,
      createHouse,
      updateUser, deleteUser, createUser,
      settings, updateSettings,
      deleteCurrentAccount,
      logAction,
      canAccess, computeLevel,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
