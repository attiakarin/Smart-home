import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { USERS, LEVELS, POINTS_CONFIG } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('sh_users');
    return saved ? JSON.parse(saved) : USERS;
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('sh_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [devices, setDevices] = useState(() => {
    const saved = localStorage.getItem('sh_devices');
    if (saved) return JSON.parse(saved);
    // Import lazily to avoid circular
    return null;
  });

  // Persist users
  useEffect(() => {
    localStorage.setItem('sh_users', JSON.stringify(users));
  }, [users]);

  // Persist current user
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sh_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sh_current_user');
    }
  }, [currentUser]);

  // Persist devices
  useEffect(() => {
    if (devices) localStorage.setItem('sh_devices', JSON.stringify(devices));
  }, [devices]);

  const computeLevel = (points) => {
    if (points >= LEVELS.expert.points) return 'expert';
    if (points >= LEVELS.avancé.points) return 'avancé';
    if (points >= LEVELS.intermédiaire.points) return 'intermédiaire';
    return 'débutant';
  };

  const addPoints = useCallback((userId, type) => {
    const pts = POINTS_CONFIG[type] ?? 0;
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const newPoints = parseFloat((u.points + pts).toFixed(2));
      const newLevel = computeLevel(newPoints);
      const updated = { ...u, points: newPoints, niveau: newLevel };
      if (currentUser?.id === userId) {
        setCurrentUser(updated);
      }
      return updated;
    }));
  }, [currentUser]);

  const login = useCallback((login, password) => {
    const user = users.find(u => u.login === login && u.password === password);
    if (!user) return { success: false, error: 'Identifiants incorrects.' };
    if (user.status !== 'approved') return { success: false, error: 'Compte en attente de validation.' };

    // Update connexion count + points
    const updatedUser = {
      ...user,
      connexions: (user.connexions || 0) + 1,
      lastLogin: new Date().toISOString(),
    };
    const pts = POINTS_CONFIG.connexion;
    updatedUser.points = parseFloat((updatedUser.points + pts).toFixed(2));
    updatedUser.niveau = computeLevel(updatedUser.points);

    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    return { success: true, user: updatedUser };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const register = useCallback((data) => {
    const exists = users.find(u => u.login === data.login || u.email === data.email);
    if (exists) return { success: false, error: 'Login ou email déjà utilisé.' };

    const newUser = {
      id: `usr-${Date.now()}`,
      ...data,
      niveau: 'débutant',
      points: 0,
      status: 'pending',
      connexions: 0,
      actions: 0,
      lastLogin: null,
      loginHistory: [],
    };
    setUsers(prev => [...prev, newUser]);
    return { success: true };
  }, [users]);

  const updateUser = useCallback((userId, data) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updated = { ...u, ...data };
      if (currentUser?.id === userId) setCurrentUser(updated);
      return updated;
    }));
  }, [currentUser]);

  const deleteUser = useCallback((userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const logAction = useCallback((userId) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updates = {
        ...u,
        actions: (u.actions || 0) + 1,
        points: parseFloat((u.points + POINTS_CONFIG.consultation).toFixed(2)),
      };
      updates.niveau = computeLevel(updates.points);
      if (currentUser?.id === userId) setCurrentUser(updates);
      return updates;
    }));
  }, [currentUser]);

  // Access control helpers
  const canAccess = useCallback((module) => {
    if (!currentUser) return module === 'information';
    const nv = currentUser.niveau;
    switch (module) {
      case 'information':    return true;
      case 'visualisation':  return true;
      case 'gestion':        return nv === 'avancé' || nv === 'expert';
      case 'administration': return nv === 'expert';
      default: return false;
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      users, setUsers,
      currentUser, setCurrentUser,
      devices, setDevices,
      login, logout, register,
      updateUser, deleteUser,
      addPoints, logAction,
      canAccess, computeLevel,
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
