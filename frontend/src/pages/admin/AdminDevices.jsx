import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  ArrowLeft,
  BatteryWarning,
  CheckCircle2,
  Plus,
  Radio,
  Settings,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import AddDeviceModal from '../gestion/AddDeviceModal';

export default function AdminDevices() {
  const { devices, deleteDevice, toggleDevice, updateDevice } = useDevices();
  const { settings } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [deletePending, setDeletePending] = useState(null);
  const [filter, setFilter] = useState('Tous');
  const [repairingId, setRepairingId] = useState(null);
  const [notice, setNotice] = useState('');

  const isMaintenance = Boolean(settings.maintenanceMode);
  const diagnostics = useMemo(() => devices.map(device => ({
    device,
    issues: getDeviceIssues(device),
  })), [devices]);

  const issueCount = diagnostics.reduce((total, item) => total + item.issues.length, 0);
  const faultyDevices = diagnostics.filter(item => item.issues.length > 0);
  const lowBattery = diagnostics.filter(item => item.issues.some(issue => issue.key === 'battery')).length;
  const inactive = diagnostics.filter(item => item.issues.some(issue => issue.key === 'inactive')).length;
  const weakSignal = diagnostics.filter(item => item.issues.some(issue => issue.key === 'signal')).length;

  const filters = [
    'Tous',
    'En défaut',
    'Actifs',
    'Inactifs',
    'Batterie faible',
    'Signal faible',
    ...new Set(devices.map(device => device.type).filter(Boolean)),
  ];

  const filtered = diagnostics.filter(({ device, issues }) => {
    if (filter === 'Tous') return true;
    if (filter === 'En défaut') return issues.length > 0;
    if (filter === 'Actifs') return device.status === 'active';
    if (filter === 'Inactifs') return device.status === 'inactive';
    if (filter === 'Batterie faible') return issues.some(issue => issue.key === 'battery');
    if (filter === 'Signal faible') return issues.some(issue => issue.key === 'signal');
    return device.type === filter;
  });

  const handleRepair = async (device, issues) => {
    setRepairingId(device.id);
    setNotice('');

    const payload = {
      name: device.name,
      type: device.type,
      brand: device.brand,
      room: issues.some(issue => issue.key === 'room') ? 'Salon' : device.room,
      status: issues.some(issue => issue.key === 'inactive') ? 'active' : device.status,
      connectivity: device.connectivity,
      signal: issues.some(issue => issue.key === 'signal') ? 'Fort' : device.signal,
      battery: issues.some(issue => issue.key === 'battery') ? 100 : device.battery,
      energyConsumption: issues.some(issue => issue.key === 'energy') ? 5 : device.energyConsumption,
      description: device.description,
      photo: device.photo,
      lastConnection: new Date().toISOString(),
      settings: device.settings || {},
    };

    try {
      await updateDevice(device.id, payload);
      setNotice(`${device.name} corrigé.`);
      setTimeout(() => setNotice(''), 2500);
    } finally {
      setRepairingId(null);
    }
  };

  return (
    <div className="container section animate-fade">
      <Link to="/admin" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour admin</Link>

      <div className="admin-devices-header">
        <div>
          <h1>{isMaintenance ? 'Panneau de maintenance' : 'Gestion des Objets Connectés'}</h1>
          {isMaintenance && (
            <p>Contrôlez les objets, repérez les défauts et corrigez rapidement avant de rouvrir la maison.</p>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={15} /> Ajouter</button>
      </div>

      {isMaintenance && (
        <>
          <div className="maintenance-panel mb-3">
            <div className="maintenance-panel__header">
              <div>
                <span className="badge badge-warning"><Wrench size={13} /> Intervention admin</span>
                <h2>Diagnostic de la maison</h2>
              </div>
              <span className="maintenance-panel__count">{issueCount} défaut(s)</span>
            </div>

            <div className="grid grid-4">
              <MaintenanceStat icon={<AlertTriangle size={20} />} label="Objets à vérifier" value={faultyDevices.length} />
              <MaintenanceStat icon={<BatteryWarning size={20} />} label="Batteries faibles" value={lowBattery} />
              <MaintenanceStat icon={<Radio size={20} />} label="Signaux faibles" value={weakSignal} />
              <MaintenanceStat icon={<Zap size={20} />} label="Objets inactifs" value={inactive} />
            </div>
          </div>

          {notice && <div className="alert alert-success mb-3" role="status"><CheckCircle2 size={18} /> {notice}</div>}
        </>
      )}

      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        {filters.map(item => (
          <button
            key={item}
            className={`btn btn-sm ${filter === item ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} objet(s)</p>

      <div className="table-wrapper card" style={{ padding: 0 }}>
        <table className="table" aria-label="Gestion des objets connectés" role="table">
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Type</th>
              <th scope="col">Marque</th>
              <th scope="col">Pièce</th>
              <th scope="col">État</th>
              {isMaintenance && <th scope="col">Diagnostic</th>}
              <th scope="col">Conso.</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ device, issues }) => (
              <tr key={device.id}>
                <td style={{ fontWeight: 600 }}>{device.name}</td>
                <td>{device.type}</td>
                <td>{device.brand}</td>
                <td>{device.room}</td>
                <td>
                  <span className={`badge ${device.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {device.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                {isMaintenance && (
                  <td>
                    <div className="maintenance-issues">
                      {issues.length === 0 ? (
                        <span className="badge badge-success"><CheckCircle2 size={12} /> OK</span>
                      ) : issues.map(issue => (
                        <span key={issue.key} className={`badge ${issue.severity === 'danger' ? 'badge-danger' : 'badge-warning'}`}>
                          {issue.label}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                <td>{device.energyConsumption} kWh</td>
                <td>
                  <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                    <Link to={`/gestion/objet/${device.id}`} className="btn btn-outline btn-sm" aria-label={`Configurer ${device.name}`}>
                      <Settings size={12} />
                    </Link>
                    {isMaintenance && issues.length > 0 && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRepair(device, issues)}
                        disabled={repairingId === device.id}
                        aria-label={`Corriger ${device.name}`}
                      >
                        <Wrench size={12} /> {repairingId === device.id ? 'Correction…' : 'Corriger'}
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleDevice(device.id)}
                      aria-label={device.status === 'active' ? `Désactiver ${device.name}` : `Activer ${device.name}`}
                    >
                      {device.status === 'active' ? 'Désactiver' : 'Activer'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeletePending(device)} aria-label={`Supprimer ${device.name}`}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} />}

      {deletePending && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="del-dev-title">
          <div className="modal">
            <div className="modal-header"><h2 id="del-dev-title" style={{ fontSize: '1rem' }}>Supprimer {deletePending.name} ?</h2></div>
            <div className="modal-body"><p>Cette action est irréversible.</p></div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeletePending(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={() => { deleteDevice(deletePending.id); setDeletePending(null); }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MaintenanceStat({ icon, label, value }) {
  return (
    <div className="maintenance-stat">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function getDeviceIssues(device) {
  const issues = [];
  const battery = Number(device.battery);
  const energy = Number(device.energyConsumption || 0);
  const signal = String(device.signal || '').toLowerCase();
  const lastSeen = device.lastConnection || device.lastSeen;

  if (device.status !== 'active') {
    issues.push({ key: 'inactive', label: 'Inactif', severity: 'danger' });
  }
  if (device.battery !== null && device.battery !== undefined && !Number.isNaN(battery) && battery < 25) {
    issues.push({ key: 'battery', label: 'Batterie faible', severity: 'danger' });
  }
  if (signal.includes('faible')) {
    issues.push({ key: 'signal', label: 'Signal faible', severity: 'warning' });
  }
  if (energy > 15) {
    issues.push({ key: 'energy', label: 'Surconsommation', severity: 'warning' });
  }
  if (!device.room) {
    issues.push({ key: 'room', label: 'Pi\u00e8ce manquante', severity: 'warning' });
  }
  if (lastSeen && Date.now() - new Date(lastSeen).getTime() > 1000 * 60 * 60 * 24 * 30) {
    issues.push({ key: 'stale', label: 'Connexion ancienne', severity: 'warning' });
  }

  return issues;
}
