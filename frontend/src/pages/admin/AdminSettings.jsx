import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Save, Download } from 'lucide-react';
import { LEVELS as LEVEL_DEFS } from '../../data/mockData';

export default function AdminSettings() {
  const { users } = useAuth();
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    platformName: 'Ma Maison Connectée',
    registrationAuto: false,
    pointsConnexion: 0.25,
    pointsConsultation: 0.50,
    themeColor: '#1a73e8',
    maintenanceMode: false,
  });

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setConfig(c => ({ ...c, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Persist config (demo: localStorage)
    localStorage.setItem('sh_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Export CSV users
  const exportCSV = () => {
    const headers = ['id','login','prenom','nom','email','niveau','points','connexions','actions','status'];
    const rows = users.map(u => headers.map(h => JSON.stringify(u[h] ?? '')).join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'utilisateurs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportDevicesCSV = () => {
    const devs = JSON.parse(localStorage.getItem('sh_devices') || '[]');
    const headers = ['id','name','type','brand','room','status','energyConsumption','connectivity'];
    const rows = devs.map(d => headers.map(h => JSON.stringify(d[h] ?? '')).join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'objets.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    if (window.confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) {
      localStorage.removeItem('sh_users');
      localStorage.removeItem('sh_devices');
      localStorage.removeItem('sh_current_user');
      window.location.reload();
    }
  };

  return (
    <div className="container section animate-fade">
      <Link to="/admin" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour admin</Link>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '2rem' }}>Paramètres de la Plateforme</h1>

      {saved && <div className="alert alert-success mb-3" role="status">Paramètres sauvegardés !</div>}

      <div className="grid grid-2" style={{ gap: '1.5rem' }}>
        {/* Config générale */}
        <form onSubmit={handleSave} className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Configuration Générale</h2>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-name">Nom de la plateforme</label>
            <input id="cfg-name" name="platformName" className="form-input" value={config.platformName} onChange={handleChange} />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-color">Couleur principale</label>
            <input id="cfg-color" name="themeColor" type="color" className="form-input" value={config.themeColor} onChange={handleChange} style={{ height: 44, padding: '.25rem' }} />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-pts-co">Points par connexion</label>
            <input id="cfg-pts-co" name="pointsConnexion" type="number" step="0.05" className="form-input" value={config.pointsConnexion} onChange={handleChange} />
          </div>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="cfg-pts-cs">Points par consultation</label>
            <input id="cfg-pts-cs" name="pointsConsultation" type="number" step="0.05" className="form-input" value={config.pointsConsultation} onChange={handleChange} />
          </div>
          <div className="form-group mb-3">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
              <input type="checkbox" name="registrationAuto" checked={config.registrationAuto} onChange={handleChange} />
              Approbation automatique des inscriptions
            </label>
          </div>
          <div className="form-group mb-3">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
              <input type="checkbox" name="maintenanceMode" checked={config.maintenanceMode} onChange={handleChange} />
              Mode maintenance
            </label>
          </div>
          <button type="submit" className="btn btn-primary"><Save size={15} /> Sauvegarder</button>
        </form>

        {/* Actions */}
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
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Niveaux & Seuils</h2>
            <div className="table-wrapper">
              <table className="table" aria-label="Seuils de niveaux" role="table">
                <thead>
                  <tr><th scope="col">Niveau</th><th scope="col">Points requis</th></tr>
                </thead>
                <tbody>
                  {Object.entries(LEVEL_DEFS).map(([k, v]) => (
                    <tr key={k}><td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{k}</td><td>{v.points} pts</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ borderColor: '#fee2e2' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-danger)' }}>Zone Dangereuse</h2>
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              La réinitialisation supprime toutes les données utilisateurs et objets.
            </p>
            <button className="btn btn-danger btn-sm" onClick={resetData}>
              Réinitialiser toutes les données
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
