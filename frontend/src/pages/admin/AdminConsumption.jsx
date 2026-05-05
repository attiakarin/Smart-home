import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Cpu, Zap } from 'lucide-react';
import { houseAPI } from '../../services/api';
import { formatDateTime } from '../../constants/smartHome';

export default function AdminConsumption() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await houseAPI.getConsumptionHistory();
        if (active) setHistory(data);
      } catch (err) {
        if (active) setError(err.message || 'Impossible de charger les dépassements.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  const exceededRows = history.filter(row => row.maintenanceTriggered);
  const activeAlerts = history.filter(row => row.exceeded && !row.resolved);
  const currentAlert = activeAlerts[0];

  return (
    <div className="container section animate-fade">
      <Link to="/admin" className="btn btn-ghost btn-sm mb-4">
        <ArrowLeft size={15} /> Retour admin
      </Link>

      <div className="dashboard-welcome">
        <div>
          <h1>Dépassements de consommation</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Historique des alertes mensuelles, dates de déclenchement, résolution et objets les plus consommateurs.
          </p>
        </div>
        <span className={`badge ${activeAlerts.length ? 'badge-danger' : 'badge-success'}`}>
          {activeAlerts.length ? `${activeAlerts.length} alerte(s) active(s)` : 'Aucune alerte active'}
        </span>
      </div>

      {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}
      {currentAlert && (
        <div className="alert alert-warning mb-3" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          Dépassement en cours : {Number(currentAlert.consumptionKwh || 0).toFixed(1)} kWh pour un seuil de {Number(currentAlert.budgetKwh || 0).toFixed(1)} kWh.
          {currentAlert.topDevice?.name && <> Objet à vérifier : <strong>{currentAlert.topDevice.name}</strong>.</>}
        </div>
      )}

      <div className="grid grid-3 mb-4">
        <div className="card text-center">
          <Zap size={22} color="#f59e0b" />
          <strong style={{ display: 'block', marginTop: '.5rem', fontSize: '1.4rem', color: '#f59e0b' }}>{history.length}</strong>
          <p style={{ color: 'var(--color-text-muted)' }}>Mois suivis</p>
        </div>
        <div className="card text-center">
          <AlertTriangle size={22} color="#ef4444" />
          <strong style={{ display: 'block', marginTop: '.5rem', fontSize: '1.4rem', color: '#ef4444' }}>{activeAlerts.length}</strong>
          <p style={{ color: 'var(--color-text-muted)' }}>Alertes actives</p>
        </div>
        <div className="card text-center">
          <Cpu size={22} color="#1a73e8" />
          <strong style={{ display: 'block', marginTop: '.5rem', fontSize: '1.4rem', color: '#1a73e8' }}>
            {history[0]?.topDevice?.name || 'Aucun'}
          </strong>
          <p style={{ color: 'var(--color-text-muted)' }}>Plus consommateur actuel</p>
        </div>
      </div>

      <div className="table-wrapper card" style={{ padding: 0 }}>
        <table className="table" aria-label="Historique des dépassements de consommation">
          <thead>
            <tr>
              <th>Mois</th>
              <th>Consommation</th>
              <th>Seuil</th>
              <th>Statut</th>
              <th>Date alerte</th>
              <th>Résolution</th>
              <th>Objet le plus consommateur</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}>Chargement…</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={7}>Aucun historique pour le moment.</td></tr>
            ) : history.map(row => (
              <tr key={row.id || row.month}>
                <td style={{ fontWeight: 700 }}>{row.month}</td>
                <td>{Number(row.consumptionKwh || 0).toFixed(1)} kWh</td>
                <td>{Number(row.budgetKwh || 0).toFixed(1)} kWh</td>
                <td>
                  <span className={`badge ${row.exceeded ? 'badge-danger' : 'badge-success'}`}>
                    {row.exceeded ? 'Dépassé' : row.maintenanceTriggered ? 'Résolu' : 'OK'}
                  </span>
                </td>
                <td>{row.alertAt ? formatDateTime(row.alertAt) : '-'}</td>
                <td>{row.resolvedAt ? formatDateTime(row.resolvedAt) : row.exceeded ? 'En cours' : '-'}</td>
                <td>
                  {row.topDevice ? (
                    <span>
                      <strong>{row.topDevice.name}</strong>
                      <br />
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '.82rem' }}>
                        {Number(row.topDevice.consumptionKwh || 0).toFixed(1)} kWh
                      </span>
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {exceededRows.length > 0 && (
        <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>
          Les alertes passent en statut résolu automatiquement quand la consommation active repasse sous le seuil.
        </p>
      )}
    </div>
  );
}
