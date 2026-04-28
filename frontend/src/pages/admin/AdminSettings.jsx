import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LEVELS as LEVEL_DEFS } from '../../constants/smartHome';

function previewThemeColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', color);
  root.style.setProperty('--color-primary-dark', `color-mix(in srgb, ${color} 78%, black)`);
  root.style.setProperty('--color-hero-from', `color-mix(in srgb, ${color} 16%, white)`);
  root.style.setProperty('--color-hero-to', `color-mix(in srgb, ${color} 8%, white)`);
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const {
    users,
    devices,
    settings,
    updateSettings,
    currentUser,
    deleteCurrentAccount,
  } = useAuth();

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(settings);
  const [deleteForm, setDeleteForm] = useState({ password: '', confirmation: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setConfig(settings);
  }, [settings]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (name === 'themeColor') previewThemeColor(value);
    setConfig(c => ({
      ...c,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateSettings({
        ...config,
        pointsConnexion: Number(config.pointsConnexion || 0),
        pointsConsultation: Number(config.pointsConsultation || 0),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Impossible de sauvegarder les paramètres.');
    }
  };

  const exportCSV = () => {
    const headers = ['id', 'login', 'prenom', 'nom', 'email', 'niveau', 'points', 'connexions', 'actions', 'status'];
    const rows = users.map(u => headers.map(h => JSON.stringify(u[h] ?? '')).join(','));
    downloadCSV('utilisateurs.csv', [headers.join(','), ...rows].join('\n'));
  };

  const exportDevicesCSV = () => {
    const headers = ['id', 'name', 'type', 'brand', 'room', 'status', 'energyConsumption', 'connectivity'];
    const rows = devices.map(d => headers.map(h => JSON.stringify(d[h] ?? '')).join(','));
    downloadCSV('objets.csv', [headers.join(','), ...rows].join('\n'));
  };

  const downloadCSV = (filename, csv) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setError('');

    if (deleteForm.confirmation !== 'SUPPRIMER') {
      setError('Tapez SUPPRIMER pour confirmer la suppression définitive.');
      return;
    }

    const ok = window.confirm(
      'Confirmer la suppression définitive de votre compte administrateur ? Cette action est irréversible.'
    );
    if (!ok) return;

    try {
      setDeleting(true);
      await deleteCurrentAccount(deleteForm);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Impossible de supprimer le compte.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container section animate-fade">
      <Link to="/admin" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour admin</Link>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '2rem' }}>Paramètres de la plateforme</h1>

      {saved && <div className="alert alert-success mb-3" role="status">Paramètres sauvegardés.</div>}
      {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

      <div className="grid grid-2" style={{ gap: '1.5rem' }}>
        <form onSubmit={handleSave} className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Configuration générale</h2>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-name">Nom de la plateforme</label>
            <input id="cfg-name" name="platformName" className="form-input" value={config.platformName || ''} onChange={handleChange} />
          </div>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-color">Couleur principale</label>
            <input id="cfg-color" name="themeColor" type="color" className="form-input" value={config.themeColor || '#1a73e8'} onChange={handleChange} style={{ height: 44, padding: '.25rem' }} />
          </div>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-pts-co">Points par connexion</label>
            <input id="cfg-pts-co" name="pointsConnexion" type="number" step="0.05" min="0" className="form-input" value={config.pointsConnexion ?? 0} onChange={handleChange} />
          </div>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-pts-cs">Points par consultation</label>
            <input id="cfg-pts-cs" name="pointsConsultation" type="number" step="0.05" min="0" className="form-input" value={config.pointsConsultation ?? 0} onChange={handleChange} />
          </div>

          <div className="form-group mb-3">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
              <input type="checkbox" name="registrationAuto" checked={Boolean(config.registrationAuto)} onChange={handleChange} />
              Approbation automatique des inscriptions
            </label>
          </div>

          <div className="form-group mb-3">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
              <input type="checkbox" name="maintenanceMode" checked={Boolean(config.maintenanceMode)} onChange={handleChange} />
              Mode maintenance
            </label>
          </div>

          <button type="submit" className="btn btn-primary"><Save size={15} /> Sauvegarder</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Exportation des données</h2>
            <div className="flex flex-col gap-2">
              <button className="btn btn-outline" onClick={exportCSV}>
                <Download size={15} /> Exporter utilisateurs (CSV)
              </button>
              <button className="btn btn-outline" onClick={exportDevicesCSV}>
                <Download size={15} /> Exporter objets (CSV)
              </button>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Niveaux & seuils</h2>
            <div className="table-wrapper">
              <table className="table" aria-label="Seuils de niveaux" role="table">
                <thead>
                  <tr><th scope="col">Niveau</th><th scope="col">Points requis</th></tr>
                </thead>
                <tbody>
                  {Object.entries(LEVEL_DEFS).map(([key, value]) => (
                    <tr key={key}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{key}</td>
                      <td>{value.points} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form className="card" style={{ borderColor: '#fee2e2' }} onSubmit={handleDeleteAccount}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-danger)' }}>
              Zone dangereuse
            </h2>
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Suppression définitive du compte administrateur connecté : {currentUser?.prenom} {currentUser?.nom}.
            </p>
            <div className="form-group mb-2">
              <label className="form-label" htmlFor="delete-password">Mot de passe</label>
              <input
                id="delete-password"
                type="password"
                className="form-input"
                value={deleteForm.password}
                onChange={e => setDeleteForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <div className="form-group mb-3">
              <label className="form-label" htmlFor="delete-confirm">Tapez SUPPRIMER</label>
              <input
                id="delete-confirm"
                className="form-input"
                value={deleteForm.confirmation}
                onChange={e => setDeleteForm(f => ({ ...f, confirmation: e.target.value }))}
              />
            </div>
            <button className="btn btn-danger btn-sm" disabled={deleting} type="submit">
              {deleting ? <AlertTriangle size={15} /> : <Trash2 size={15} />}
              Supprimer mon compte
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
