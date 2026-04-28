import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { devicesAPI } from '../services/api';
import { ROOMS, DEVICE_TYPES } from '../data/mockData';
import { useAuth } from './AuthContext';

const DevicesContext = createContext(null);

export function DevicesProvider({ children }) {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      if (!currentUser) {
        setDevices([]);
        return;
      }

      setLoading(true);
      try {
        const data = await devicesAPI.getAll();
        setDevices(data);
      } catch (err) {
        console.error('Erreur chargement appareils:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, [currentUser]);

  const addDevice = useCallback(async (data) => {
    setLoading(true);
    try {
      const newDevice = await devicesAPI.create(data);
      setDevices(prev => [...prev, newDevice]);
      return newDevice;
    } catch (err) {
      console.error('Erreur création appareil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDevice = useCallback(async (id, data) => {
    setLoading(true);
    try {
      const updated = await devicesAPI.update(id, data);
      setDevices(prev => prev.map(d => String(d.id) === String(id) ? updated : d));
      return updated;
    } catch (err) {
      console.error('Erreur mise à jour appareil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDevice = useCallback(async (id) => {
    setLoading(true);
    try {
      await devicesAPI.delete(id);
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Erreur suppression appareil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleDevice = useCallback(async (id) => {
    setLoading(true);
    try {
      const updated = await devicesAPI.toggle(id);
      setDevices(prev => prev.map(d => String(d.id) === String(id) ? updated : d));
    } catch (err) {
      console.error('Erreur basculement appareil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDevice = useCallback((id) => devices.find(d => String(d.id) === String(id)), [devices]);

  return (
    <DevicesContext.Provider value={{
      devices, setDevices,
      addDevice, updateDevice, deleteDevice, toggleDevice, getDevice,
      rooms: ROOMS,
      deviceTypes: DEVICE_TYPES,
      loading,
    }}>
      {children}
    </DevicesContext.Provider>
  );
}

export function useDevices() {
  const ctx = useContext(DevicesContext);
  if (!ctx) throw new Error('useDevices must be used within DevicesProvider');
  return ctx;
}
