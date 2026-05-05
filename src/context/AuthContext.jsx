import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, devicesAPI, usersAPI } from '../services/api';

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
  'Intermédiaire': 25,
  'Avancé':        50,
  'Expert':        75,
};

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('sh_current_user');
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

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
        console.error('Erreur chargement appareils:', err);
      }
      try {
        const isAdmin = currentUser.niveau === 'Expert' && currentUser.appRole === 'admin';
        const data = isAdmin ? await usersAPI.getAll() : await usersAPI.getMembers();
        setUsers(data.map(normalizeUser));
      } catch (err) {
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
  }, []);

  const register = useCallback(async (data) => {
    setLoading(true);
    try {
      const result = await authAPI.register(data);
      return { success: true };
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
      if (isOwnProfile && !isAdmin) {
        const profileData = { ...data, genre: data.genre ?? data.sexe };
        delete profileData.sexe;
        await authAPI.updateProfile(profileData);
      } else {
        await usersAPI.update(userId, data);
      }
      const localPatch = {
        ...data,
        ...(data.points !== undefined ? { points: Number(data.points || 0) } : {}),
        ...(data.rolee ? { appRole: data.rolee } : {}),
      };
      setUsers(prev => prev.map(user => (
        user.id === userId ? { ...user, ...localPatch } : user
      )));
      if (currentUser?.id === userId) {
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
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Erreur suppression utilisateur:', err);
      throw err;
    }
  }, []);

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
    const nv = currentUser.niveau;
    switch (module) {
      case 'information':    return true;
      case 'visualisation':  return true;
      case 'gestion':        return nv === 'Avancé' || nv === 'Expert';
      case 'administration': return nv === 'Expert' && currentUser.appRole === 'admin';
      default: return false;
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      users, setUsers,
      currentUser, setCurrentUser,
      devices, setDevices,
      login, logout, register,
      createHouse,
      updateUser, deleteUser,
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
