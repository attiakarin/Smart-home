import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { ArrowLeft, Save } from 'lucide-react';

export default function GestionDevicePage() {
  const { id } = useParams();
  const { getDevice, updateDevice, toggleDevice, rooms, deviceTypes } = useDevices();
  const navigate = useNavigate();
  const device = getDevice(id);
  const [form, setForm] = useState(device ? { ...device } : {});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!device) return (
    <div className="container section text-center">
      <p>Objet introuvable.</p>
      <Link to="/gestion" className="btn btn-outline mt-3">← Retour</Link>
    </div>
  );

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name) { setError('Le nom est obligatoire.'); return; }
    updateDevice(id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="container section animate-fade">
      <Link to="/gestion" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour à la gestion</Link>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '.5rem' }}>Configurer : {device.name}</h1>
        <div className="flex gap-2 mb-4">
          <span className="badge badge-gray">{device.type}</span>
          <span className="badge badge-gray">{device.room}</span>
          <span className={`badge ${device.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
            {device.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>

        {saved && <div className="alert alert-success mb-3" role="status">Modifications sauvegardées !</div>}
        {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

        <form onSubmit={handleSave} className="card" noValidate>
          <div className="grid grid-2 gap-2">
            <div className="form-group">
              <label className="form-label" htmlFor="gd-name">Nom *</label>
              <input id="gd-name" name="name" className="form-input" value={form.name || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gd-brand">Marque</label>
              <input id="gd-brand" name="brand" className="form-input" value={form.brand || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gd-type">Type</label>
              <select id="gd-type" name="type" className="form-select" value={form.type || ''} onChange={handleChange}>
                {deviceTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gd-room">Pièce</label>
              <select id="gd-room" name="room" className="form-select" value={form.room || ''} onChange={handleChange}>
                {rooms.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gd-connectivity">Connectivité</label>
              <select id="gd-connectivity" name="connectivity" className="form-select" value={form.connectivity || ''} onChange={handleChange}>
                <option>Wi-Fi</option><option>Bluetooth</option><option>Zigbee</option><option>Z-Wave</option><option>Ethernet</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gd-energy">Consommation (kWh)</label>
              <input id="gd-energy" name="energyConsumption" type="number" step="0.01" className="form-input" value={form.energyConsumption || 0} onChange={handleChange} />
            </div>
            {form.targetTemp !== undefined && (
              <div className="form-group">
                <label className="form-label" htmlFor="gd-temp">Température cible (°C)</label>
                <input id="gd-temp" name="targetTemp" type="number" className="form-input" value={form.targetTemp} onChange={handleChange} />
              </div>
            )}
            {form.mode !== undefined && (
              <div className="form-group">
                <label className="form-label" htmlFor="gd-mode">Mode</label>
                <select id="gd-mode" name="mode" className="form-select" value={form.mode || ''} onChange={handleChange}>
                  <option>Automatique</option><option>Manuel</option><option>Nuit</option><option>Éco</option><option>Turbo</option>
                </select>
              </div>
            )}
            {form.brightness !== undefined && (
              <div className="form-group">
                <label className="form-label" htmlFor="gd-brightness">Luminosité (%)</label>
                <input id="gd-brightness" name="brightness" type="range" min="0" max="100" className="form-input" value={form.brightness} onChange={handleChange} />
                <span className="form-hint">{form.brightness}%</span>
              </div>
            )}
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label" htmlFor="gd-desc">Description</label>
              <textarea id="gd-desc" name="description" rows={3} className="form-textarea" value={form.description || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn btn-primary"><Save size={15} /> Sauvegarder</button>
            <button type="button" className="btn btn-ghost" onClick={() => toggleDevice(id)}>
              {device.status === 'active' ? 'Désactiver' : 'Activer'}
            </button>
            <Link to={`/objets/${id}`} className="btn btn-outline btn-sm">Voir détail</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
