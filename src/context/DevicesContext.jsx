import { createContext, useContext, useState, useEffect } from 'react';
import { DEVICES, ROOMS, DEVICE_TYPES } from '../data/mockData';

const DevicesContext = createContext(null);

export function DevicesProvider({ children }) {
  const [devices, setDevices] = useState(() => {
    const saved = localStorage.getItem('sh_devices');
    return saved ? JSON.parse(saved) : DEVICES;
  });

  useEffect(() => {
    localStorage.setItem('sh_devices', JSON.stringify(devices));
  }, [devices]);

  const addDevice = (data) => {
    const newDevice = {
      id: `dev-${Date.now()}`,
      ...data,
      lastSeen: new Date().toISOString(),
      history: [],
      energyConsumption: parseFloat(data.energyConsumption) || 0,
    };
    setDevices(prev => [...prev, newDevice]);
    return newDevice;
  };

  const updateDevice = (id, data) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
  };

  const deleteDevice = (id) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const toggleDevice = (id) => {
    setDevices(prev => prev.map(d =>
      d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d
    ));
  };

  const getDevice = (id) => devices.find(d => d.id === id);

  return (
    <DevicesContext.Provider value={{
      devices, setDevices,
      addDevice, updateDevice, deleteDevice, toggleDevice, getDevice,
      rooms: ROOMS,
      deviceTypes: DEVICE_TYPES,
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
