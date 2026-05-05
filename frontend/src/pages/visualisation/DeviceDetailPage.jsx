import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import { ArrowLeft, Lock, Wifi, Battery, Thermometer, Zap, Clock, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ── Limite de consommation autorisée selon le niveau ─────────────────────────
function getEnergyLimit(niveau) {
  const n = (niveau ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n === 'debutant')      return 100;
  if (n === 'intermediaire') return 150;
  if (n === 'avance')        return 200;
  return Infinity; // Expert
}

export default function DeviceDetailPage() {
  const { id } = useParams();
  const { getDevice } = useDevices();
  const { logAction, currentUser } = useAuth();
  const navigate = useNavigate();
  const device = getDevice(id);

  const energyLimit = getEnergyLimit(currentUser?.niveau);
  const locked = device && Number(device.energyConsumption || 0) > energyLimit;

  useEffect(() => {
    if (device && !locked) logAction(currentUser.id);
  }, [id]); // eslint-disable-line

  if (!device) return (
    <div className="container section text-center animate-fade">
      <p>Objet introuvable.</p>
      <Link to="/objets" className="btn btn-outline mt-3">← Retour</Link>
    </div>
  );

  // ── Accès restreint ─────────────────────────────────────────────────────────
  if (locked) return (
    <div className="container section animate-fade" style={{ maxWidth: 520, margin: '0 auto' }}>
      <Link to="/objets" className="btn btn-ghost btn-sm mb-4">
        <ArrowLeft size={15} aria-hidden="true" /> Retour aux objets
      </Link>
      <div
        className="card text-center"
        style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
      >
        <div
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <Lock size={34} color="#94a3b8" />
        </div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#475569' }}>
          Accès restreint
        </h1>
        <p style={{ color: '#64748b', lineHeight: 1.7, maxWidth: 360 }}>
          Vous n'avez pas le niveau requis pour consulter cet objet.
          Sa consommation dépasse la limite autorisée pour votre niveau actuel.
        </p>
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: '.4rem',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius)', padding: '.75rem 1.2rem',
            width: '100%', maxWidth: 280, fontSize: '.88rem',
          }}
        >
          <div className="flex items-center" style={{ justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Votre niveau</span>
            <span className="badge badge-primary">{currentUser?.niveau ?? '—'}</span>
          </div>
          <div className="flex items-center" style={{ justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Limite autorisée</span>
            <span className="badge badge-gray">{energyLimit} kWh</span>
          </div>
        </div>
        <p style={{ fontSize: '.82rem', color: '#94a3b8' }}>
          Continuez à accumuler des points pour débloquer l'accès aux objets plus puissants.
        </p>
        <Link to="/objets" className="btn btn-primary mt-2">
          ← Retour à la liste
        </Link>
      </div>
    </div>
  );

  const statusColor = device.status === 'active' ? '#22c55e' : '#ef4444';
  const statusLabel = device.status === 'active' ? 'Actif' : 'Inactif';

  return (
    <div className="container section animate-fade">
      <Link to="/objets" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} aria-hidden="true" /> Retour aux objets</Link>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Info principale */}
        <div>
          <div className="card mb-3">
            <div className="device-detail-photo" aria-hidden={!device.photo}>
              {device.photo ? (
                <img src={device.photo} alt={`Photo de ${device.name}`} />
              ) : (
                <span><Cpu size={28} aria-hidden="true" /></span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: statusColor, display: 'inline-block' }} aria-hidden="true" />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{device.name}</h1>
              <span className="badge" style={{ background: statusColor + '22', color: statusColor, marginLeft: 'auto' }}>{statusLabel}</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '.9rem' }}>{device.description}</p>
            <dl className="device-dl">
              <div><dt>Identifiant</dt><dd style={{ fontFamily: 'monospace', fontSize: '.85rem' }}>{device.id}</dd></div>
              <div><dt>Type</dt><dd>{device.type}</dd></div>
              <div><dt>Marque</dt><dd>{device.brand}</dd></div>
              <div><dt>Pièce</dt><dd>{device.room}</dd></div>
              <div><dt>Connectivité</dt><dd><Wifi size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />{device.connectivity} — {device.signal}</dd></div>
              {device.battery !== null && device.battery !== undefined && (
                <div>
                  <dt>Batterie</dt>
                  <dd style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <Battery size={14} aria-hidden="true" />
                    {device.battery}%
                  </dd>
                </div>
              )}
              {device.currentTemp !== undefined && (
                <div><dt>Temp. actuelle</dt><dd><Thermometer size={14} style={{ verticalAlign: 'middle' }} aria-hidden="true" /> {device.currentTemp}°C</dd></div>
              )}
              {device.targetTemp !== undefined && (
                <div><dt>Temp. cible</dt><dd>{device.targetTemp}°C</dd></div>
              )}
              {device.mode && <div><dt>Mode</dt><dd>{device.mode}</dd></div>}
              {device.currentCycle && <div><dt>Cycle actuel</dt><dd>{device.currentCycle}</dd></div>}
              {device.remainingTime && <div><dt>Temps restant</dt><dd>{device.remainingTime} min</dd></div>}
              {device.co2Level !== undefined && <div><dt>CO₂</dt><dd>{device.co2Level} ppm</dd></div>}
              {device.humidity !== undefined && <div><dt>Humidité</dt><dd>{device.humidity}%</dd></div>}
              {device.powerOutput !== undefined && <div><dt>Production</dt><dd>{device.powerOutput} kW</dd></div>}
              <div>
                <dt>Conso. énergie</dt>
                <dd><Zap size={14} style={{ verticalAlign: 'middle' }} aria-hidden="true" /> {device.energyConsumption < 0 ? `+${Math.abs(device.energyConsumption)}` : device.energyConsumption} kWh</dd>
              </div>
              <div><dt>Dernière activité</dt><dd><Clock size={14} style={{ verticalAlign: 'middle' }} aria-hidden="true" /> {new Date(device.lastSeen).toLocaleString('fr-FR')}</dd></div>
            </dl>
            {device.tags && (
              <div className="flex gap-1 mt-3" style={{ flexWrap: 'wrap' }}>
                {device.tags.map(t => <span key={t} className="badge badge-primary">{t}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Historique */}
        <div>
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Historique (30 derniers jours)</h2>
            {device.history && device.history.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={device.history} aria-label="Graphique historique de l'objet">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => v.slice(5)}
                    interval={4}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={l => `Date: ${l}`}
                    formatter={(v, n, p) => [`${v} ${p.payload.unit}`, 'Valeur']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#1a73e8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>Pas de données historiques.</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .device-detail-photo { height: 220px; border-radius: 10px; background: #f1f5f9; color: var(--color-primary); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 1rem; }
        .device-detail-photo img { width: 100%; height: 100%; object-fit: cover; }
        .device-detail-photo span { width: 58px; height: 58px; border-radius: 14px; background: #dbeafe; display: flex; align-items: center; justify-content: center; }
        .device-dl { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
        .device-dl > div { display: flex; flex-direction: column; }
        .device-dl dt { font-size: .73rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
        .device-dl dd { font-size: .9rem; font-weight: 600; }
        @media(max-width:700px){ .device-dl { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
