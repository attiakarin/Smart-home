import { useState } from 'react';
import { useDevices } from '../../context/DevicesContext';
import { Camera, Trash2, X } from 'lucide-react';

export default function AddDeviceModal({ onClose }) {
  const { addDevice, deviceTypes, rooms } = useDevices();
  const [form, setForm] = useState({
    name: '', type: deviceTypes[0] || '', brand: '', room: rooms[0] || '',
    connectivity: 'Wi-Fi', signal: 'Fort', description: '', energyConsumption: '',
    battery: '', status: 'active', photo: null,
  });
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez choisir une image.');
      return;
    }
    if (file.size > 750 * 1024) {
      setError('La photo doit faire moins de 750 Ko.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setForm(previous => ({ ...previous, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.type || !form.brand || !form.room) {
      setError('Veuillez remplir les champs obligatoires.');
      return;
    }
    try {
      await addDevice(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Impossible d’ajouter cet objet.');
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-dev-title">
      <div className="modal">
        <div className="modal-header">
          <h2 id="add-dev-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Ajouter un objet connecté</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}
          <form id="add-dev-form" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-2 gap-2">
              <div className="form-group">
                <label className="form-label" htmlFor="ad-name">Nom *</label>
                <input id="ad-name" name="name" className="form-input" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-brand">Marque *</label>
                <input id="ad-brand" name="brand" className="form-input" value={form.brand} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-type">Type *</label>
                <select id="ad-type" name="type" className="form-select" value={form.type} onChange={handleChange}>
                  {deviceTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-room">Pièce *</label>
                <select id="ad-room" name="room" className="form-select" value={form.room} onChange={handleChange}>
                  {rooms.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-connectivity">Connectivité</label>
                <select id="ad-connectivity" name="connectivity" className="form-select" value={form.connectivity} onChange={handleChange}>
                  <option>Wi-Fi</option><option>Bluetooth</option><option>Zigbee</option><option>Z-Wave</option><option>Ethernet</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-signal">Signal</label>
                <select id="ad-signal" name="signal" className="form-select" value={form.signal} onChange={handleChange}>
                  <option>Fort</option><option>Moyen</option><option>Faible</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-energy">Conso. (kWh)</label>
                <input id="ad-energy" name="energyConsumption" type="number" step="0.01" className="form-input" value={form.energyConsumption} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-battery">Batterie (%)</label>
                <input id="ad-battery" name="battery" type="number" min="0" max="100" className="form-input" value={form.battery} onChange={handleChange} placeholder="Aucune batterie" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label" htmlFor="ad-desc">Description</label>
                <textarea id="ad-desc" name="description" className="form-textarea" rows={2} value={form.description} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <span className="form-label">Photo de l'objet</span>
                <div className="device-photo-editor">
                  <div className="device-photo-preview">
                    {form.photo ? <img src={form.photo} alt="Apercu de l'objet" /> : <Camera size={24} aria-hidden="true" />}
                  </div>
                  <div className="device-photo-actions">
                    <label className="btn btn-outline btn-sm" htmlFor="ad-photo">
                      <Camera size={14} aria-hidden="true" /> Choisir une photo
                    </label>
                    <input id="ad-photo" type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                    {form.photo && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(previous => ({ ...previous, photo: null }))}>
                        <Trash2 size={14} aria-hidden="true" /> Retirer
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ad-status">État initial</label>
                <select id="ad-status" name="status" className="form-select" value={form.status} onChange={handleChange}>
                  <option value="active">Actif</option><option value="inactive">Inactif</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" form="add-dev-form" className="btn btn-primary">Ajouter</button>
        </div>
      </div>
    </div>
  );
}
