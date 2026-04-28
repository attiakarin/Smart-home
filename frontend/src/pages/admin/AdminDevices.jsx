import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { ArrowLeft, Plus, Trash2, Settings } from 'lucide-react';
import AddDeviceModal from '../gestion/AddDeviceModal';

export default function AdminDevices() {
  const { devices, deleteDevice, toggleDevice } = useDevices();
  const [showAdd, setShowAdd]   = useState(false);
  const [deletePending, setDeletePending] = useState(null);
  const [filter, setFilter]     = useState('Tous');

  const TYPES = ['Tous', ...new Set(devices.map(d => d.type))];
  const filtered = filter === 'Tous' ? devices : devices.filter(d => d.type === filter);

  return (
    <div className="container section animate-fade">
      <Link to="/admin" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour admin</Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Gestion des Objets Connectés</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={15} /> Ajouter</button>
      </div>

      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button key={t} className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(t)}>{t}</button>
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
              <th scope="col">Conso.</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.name}</td>
                <td>{d.type}</td>
                <td>{d.brand}</td>
                <td>{d.room}</td>
                <td>
                  <span className={`badge ${d.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {d.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>{d.energyConsumption} kWh</td>
                <td>
                  <div className="flex gap-1">
                    <Link to={`/gestion/objet/${d.id}`} className="btn btn-outline btn-sm" aria-label={`Configurer ${d.name}`}><Settings size={12} /></Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleDevice(d.id)}
                      aria-label={d.status === 'active' ? `Désactiver ${d.name}` : `Activer ${d.name}`}>
                      {d.status === 'active' ? 'Désactiver' : 'Activer'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeletePending(d)} aria-label={`Supprimer ${d.name}`}><Trash2 size={12} /></button>
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
