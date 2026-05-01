import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Camera, Save, SlidersHorizontal, Trash2 } from 'lucide-react';

const TYPE_SETTINGS = {
  thermostat: [
    { key: 'temperature_cible', label: 'Température cible (°C)', type: 'number', defaultValue: '21' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['automatique', 'manuel', 'eco', 'nuit'], defaultValue: 'automatique' },
  ],
  éclairage: [
    { key: 'luminosite', label: 'Luminosité (%)', type: 'range', min: 0, max: 100, defaultValue: '80' },
    { key: 'couleur', label: 'Couleur', type: 'select', options: ['blanc chaud', 'blanc froid', 'bleu', 'vert', 'rouge'], defaultValue: 'blanc chaud' },
  ],
  eclairage: [
    { key: 'luminosite', label: 'Luminosité (%)', type: 'range', min: 0, max: 100, defaultValue: '80' },
    { key: 'couleur', label: 'Couleur', type: 'select', options: ['blanc chaud', 'blanc froid', 'bleu', 'vert', 'rouge'], defaultValue: 'blanc chaud' },
  ],
  caméra: [
    { key: 'detection_mouvement', label: 'Détection mouvement', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' },
    { key: 'resolution', label: 'Résolution', type: 'select', options: ['720p', '1080p', '2K', '4K'], defaultValue: '1080p' },
  ],
  camera: [
    { key: 'detection_mouvement', label: 'Détection mouvement', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' },
    { key: 'resolution', label: 'Résolution', type: 'select', options: ['720p', '1080p', '2K', '4K'], defaultValue: '1080p' },
  ],
  capteur: [
    { key: 'seuil_alerte', label: 'Seuil d’alerte', type: 'number', defaultValue: '60' },
    { key: 'frequence_mesure', label: 'Fréquence de mesure', type: 'select', options: ['1 min', '5 min', '15 min', '30 min'], defaultValue: '5 min' },
  ],
  sécurité: [
    { key: 'sensibilite', label: 'Sensibilité', type: 'select', options: ['faible', 'moyenne', 'forte'], defaultValue: 'moyenne' },
    { key: 'alerte_push', label: 'Alerte mobile', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' },
  ],
  securite: [
    { key: 'sensibilite', label: 'Sensibilité', type: 'select', options: ['faible', 'moyenne', 'forte'], defaultValue: 'moyenne' },
    { key: 'alerte_push', label: 'Alerte mobile', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' },
  ],
  énergie: [
    { key: 'alerte_surconsommation', label: 'Alerte surconsommation', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' },
    { key: 'seuil_kwh', label: 'Seuil kWh', type: 'number', defaultValue: '10' },
  ],
  energie: [
    { key: 'alerte_surconsommation', label: 'Alerte surconsommation', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' },
    { key: 'seuil_kwh', label: 'Seuil kWh', type: 'number', defaultValue: '10' },
  ],
};

function normalizeType(type = '') {
  return type.toLowerCase().trim();
}

export default function GestionDevicePage() {
  const { id } = useParams();
  const { getDevice, updateDevice, toggleDevice, rooms, deviceTypes } = useDevices();
  const { canAccess } = useAuth();
  const device = getDevice(id);
  const [form, setForm] = useState(device ? { ...device, settings: device.settings || {} } : {});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const canToggle = canAccess('device_toggle');

  useEffect(() => {
    if (device) setForm({ ...device, settings: device.settings || {} });
  }, [device]);

  const settingFields = useMemo(() => {
    const fields = TYPE_SETTINGS[normalizeType(form.type)] || [
      { key: 'mode', label: 'Mode', type: 'select', options: ['automatique', 'manuel'], defaultValue: 'automatique' },
      { key: 'note_configuration', label: 'Note de configuration', type: 'text', defaultValue: '' },
    ];

    return fields.map(field => ({
      ...field,
      value: form.settings?.[field.key] ?? field.defaultValue ?? '',
    }));
  }, [form.type, form.settings]);

  if (!device) {
    return (
      <div className="container section text-center">
        <p>Objet introuvable.</p>
        <Link to="/gestion" className="btn btn-outline mt-3">Retour</Link>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
  };

  const handleSettingChange = (key, value) => {
    setForm(previous => ({
      ...previous,
      settings: {
        ...(previous.settings || {}),
        [key]: value,
      },
    }));
  };

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

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name) {
      setError('Le nom est obligatoire.');
      return;
    }

    try {
      await updateDevice(id, {
        name: form.name,
        type: form.type,
        brand: form.brand,
        room: form.room,
        status: form.status,
        connectivity: form.connectivity,
        signal: form.signal,
        battery: form.battery === '' ? null : Number(form.battery),
        energyConsumption: Number(form.energyConsumption || 0),
        description: form.description,
        photo: form.photo || null,
        settings: form.settings || {},
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Impossible de sauvegarder cet objet.');
    }
  };

  return (
    <div className="container section animate-fade">
      <Link to="/gestion" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour à la gestion</Link>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Configurer : {device.name}</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Réglez l’état, la pièce, la consommation et les paramètres propres à l’objet.</p>
          </div>
          <span className={`badge ${device.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
            {device.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>

        {saved && <div className="alert alert-success mb-3" role="status">Configuration enregistrée.</div>}
        {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

        <form onSubmit={handleSave} className="grid grid-2" noValidate>
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Informations générales</h2>
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
                  {deviceTypes.map(type => <option key={type}>{type}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gd-room">Pièce</label>
                <select id="gd-room" name="room" className="form-select" value={form.room || ''} onChange={handleChange}>
                  {rooms.map(room => <option key={room}>{room}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gd-status">État</label>
                <select id="gd-status" name="status" className="form-select" value={form.status || 'inactive'} onChange={handleChange}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gd-connectivity">Connectivité</label>
                <select id="gd-connectivity" name="connectivity" className="form-select" value={form.connectivity || ''} onChange={handleChange}>
                  <option>Wi-Fi</option><option>Bluetooth</option><option>Zigbee</option><option>Z-Wave</option><option>Ethernet</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gd-signal">Signal</label>
                <select id="gd-signal" name="signal" className="form-select" value={form.signal || ''} onChange={handleChange}>
                  <option>Fort</option><option>Moyen</option><option>Faible</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gd-battery">Batterie (%)</label>
                <input id="gd-battery" name="battery" type="number" min="0" max="100" className="form-input" value={form.battery ?? ''} onChange={handleChange} placeholder="Aucune batterie" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="gd-energy">Consommation (kWh)</label>
                <input id="gd-energy" name="energyConsumption" type="number" step="0.01" className="form-input" value={form.energyConsumption ?? 0} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label" htmlFor="gd-desc">Description</label>
                <textarea id="gd-desc" name="description" rows={3} className="form-textarea" value={form.description || ''} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <span className="form-label">Photo de l'objet</span>
                <div className="device-photo-editor">
                  <div className="device-photo-preview">
                    {form.photo ? <img src={form.photo} alt="Apercu de l'objet" /> : <Camera size={24} aria-hidden="true" />}
                  </div>
                  <div className="device-photo-actions">
                    <label className="btn btn-outline btn-sm" htmlFor="gd-photo">
                      <Camera size={14} aria-hidden="true" /> Choisir une photo
                    </label>
                    <input id="gd-photo" type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                    {form.photo && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(previous => ({ ...previous, photo: null }))}>
                        <Trash2 size={14} aria-hidden="true" /> Retirer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <SlidersHorizontal size={18} /> Paramètres
            </h2>
            <div className="grid gap-2">
              {settingFields.map(field => (
                <div className="form-group" key={field.key}>
                  <label className="form-label" htmlFor={`setting-${field.key}`}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select id={`setting-${field.key}`} className="form-select" value={field.value} onChange={event => handleSettingChange(field.key, event.target.value)}>
                      {field.options.map(option => <option key={option}>{option}</option>)}
                    </select>
                  ) : field.type === 'range' ? (
                    <>
                      <input id={`setting-${field.key}`} type="range" min={field.min} max={field.max} className="form-input" value={field.value} onChange={event => handleSettingChange(field.key, event.target.value)} />
                      <span className="form-hint">{field.value}%</span>
                    </>
                  ) : (
                    <input id={`setting-${field.key}`} type={field.type} className="form-input" value={field.value} onChange={event => handleSettingChange(field.key, event.target.value)} />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary"><Save size={15} /> Enregistrer</button>
              {canToggle && (
                <button type="button" className="btn btn-ghost" onClick={() => toggleDevice(id)}>
                  {device.status === 'active' ? 'Désactiver' : 'Activer'}
                </button>
              )}
              <Link to={`/objets/${id}`} className="btn btn-outline btn-sm">Voir détail</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
