import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Settings, BarChart2, AlertTriangle } from 'lucide-react';
import AddDeviceModal from './AddDeviceModal';

export default function GestionDashboard() {
  const { devices, toggleDevice, deleteDevice } = useDevices();
  const { currentUser } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [deletePending, setDeletePending] = useState(null);

  const active   = devices.filter(d => d.status === 'active').length;
  const totalE   = devices.reduce((s, d) => s + (d.energyConsumption > 0 ? d.energyConsumption : 0), 0).toFixed(1);
  const lowBatt  = devices.filter(d => d.battery !== null && d.battery !== undefined && d.battery < 25).length;
  const byRoom   = devices.reduce((acc, d) => { acc[d.room] = (acc[d.room] || 0) + 1; return acc; }, {});

  const handleDeleteRequest = (device) => {
    setDeletePending(device);
  };

  const confirmDelete = () => {
    if (deletePending) deleteDevice(deletePending.id);
    setDeletePending(null);
  };

  return (
    <div className="container section animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Module Gestion</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Tableau de bord avancé — gestion des objets connectés</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Ajouter un objet
          </button>
          <Link to="/gestion/rapports" className="btn btn-outline">
            <BarChart2 size={16} /> Rapports
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4 mb-4">
        {[
          { label: 'Total objets',     value: devices.length, color: '#dbeafe', tc: '#1a73e8' },
          { label: 'Actifs',           value: active,          color: '#d1fae5', tc: '#22c55e' },
          { label: 'Conso. totale',    value: `${totalE} kWh`, color: '#fef3c7', tc: '#f59e0b' },
          { label: 'Batterie faible',  value: lowBatt,         color: '#fee2e2', tc: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.tc }}>{s.value}</div>
            <div style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Par pièce */}
      <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Objets par pièce</h2>
      <div className="grid grid-4 mb-4">
        {Object.entries(byRoom).map(([room, count]) => (
          <div key={room} className="card" style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a73e8', fontWeight: 800 }} aria-hidden="true">{count}</div>
            <span style={{ fontWeight: 600 }}>{room}</span>
          </div>
        ))}
      </div>

      {/* Liste objets */}
      <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Tous les objets</h2>
      <div className="table-wrapper card" style={{ padding: 0 }}>
        <table className="table" aria-label="Liste des objets connectés" role="table">
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Type</th>
              <th scope="col">Pièce</th>
              <th scope="col">État</th>
              <th scope="col">Batterie</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>
                  {d.name}
                  {d.battery !== null && d.battery !== undefined && d.battery < 25 && (
                    <AlertTriangle size={14} color="#f59e0b" style={{ verticalAlign: 'middle', marginLeft: 6 }} aria-label="Batterie faible" />
                  )}
                </td>
                <td>{d.type}</td>
                <td>{d.room}</td>
                <td>
                  <span className={`badge ${d.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {d.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  {d.battery !== null && d.battery !== undefined
                    ? <span style={{ color: d.battery < 25 ? '#ef4444' : 'inherit' }}>{d.battery}%</span>
                    : '—'
                  }
                </td>
                <td>
                  <div className="flex gap-1">
                    <Link to={`/gestion/objet/${d.id}`} className="btn btn-outline btn-sm" aria-label={`Configurer ${d.name}`}>
                      <Settings size={13} /> Configurer
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleDevice(d.id)}
                      aria-label={d.status === 'active' ? `Désactiver ${d.name}` : `Activer ${d.name}`}
                    >
                      {d.status === 'active' ? 'Désactiver' : 'Activer'}
                    </button>
                    {(currentUser.niveau === 'expert') && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteRequest(d)}
                        aria-label={`Supprimer ${d.name}`}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} />}

      {/* Delete confirmation */}
      {deletePending && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="del-title">
          <div className="modal">
            <div className="modal-header">
              <h2 id="del-title" style={{ fontSize: '1rem' }}>Confirmer la suppression</h2>
            </div>
            <div className="modal-body">
              <p>Êtes-vous sûr de vouloir supprimer <strong>{deletePending.name}</strong> ?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeletePending(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
