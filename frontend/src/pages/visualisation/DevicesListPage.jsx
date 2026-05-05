import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { useAuth } from '../../context/AuthContext';
import { Cpu, Lock, Search } from 'lucide-react';

const STATUS_OPTS = ['Tous', 'Actif', 'Inactif'];

// ── Limite de consommation autorisée selon le niveau ─────────────────────────
function getEnergyLimit(niveau) {
  const n = (niveau ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n === 'debutant')      return 100;
  if (n === 'intermediaire') return 150;
  if (n === 'avance')        return 200;
  return Infinity; // Expert : aucune restriction
}

export default function DevicesListPage() {
  const { devices, deviceTypes, rooms } = useDevices();
  const { logAction, currentUser }      = useAuth();
  const energyLimit = getEnergyLimit(currentUser?.niveau);
  const [kw, setKw]       = useState('');
  const [type, setType]   = useState('Tous');
  const [room, setRoom]   = useState('Toutes');
  const [status, setStatus] = useState('Tous');

  const TYPES_OPTS = ['Tous', ...deviceTypes];
  const ROOMS_OPTS = ['Toutes', ...rooms];

  const filtered = devices.filter(d => {
    const matchKw   = !kw || d.name.toLowerCase().includes(kw.toLowerCase()) || d.description?.toLowerCase().includes(kw.toLowerCase()) || d.brand?.toLowerCase().includes(kw.toLowerCase()) || d.tags?.some(t => t.toLowerCase().includes(kw.toLowerCase()));
    const matchType = type === 'Tous' || d.type === type;
    const matchRoom = room === 'Toutes' || d.room === room;
    const matchSt   = status === 'Tous' || (status === 'Actif' ? d.status === 'active' : d.status === 'inactive');
    return matchKw && matchType && matchRoom && matchSt;
  });

  const handleView = (id) => {
    logAction(currentUser.id);
  };

  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><Cpu size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Objets Connectés</h1>

      {/* Filtres */}
      <form className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }} role="search" aria-label="Filtrer les objets" onSubmit={e => e.preventDefault()}>
        <input
          type="search"
          className="form-input"
          placeholder="Nom, marque, tag…"
          value={kw}
          onChange={e => setKw(e.target.value)}
          aria-label="Mots-clés"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="form-select" value={type}   onChange={e => setType(e.target.value)}   aria-label="Type" style={{ minWidth: 140 }}>
          {TYPES_OPTS.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="form-select" value={room}   onChange={e => setRoom(e.target.value)}   aria-label="Pièce" style={{ minWidth: 140 }}>
          {ROOMS_OPTS.map(r => <option key={r}>{r}</option>)}
        </select>
        <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} aria-label="État" style={{ minWidth: 120 }}>
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </form>

      <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} objet(s) trouvé(s)</p>

      <div className="grid grid-3" role="list" aria-label="Liste des objets connectés">
        {filtered.map(d => {
          const locked = Number(d.energyConsumption || 0) > energyLimit;

          // ── Carte verrouillée ───────────────────────────────────────────────
          if (locked) {
            return (
              <div
                key={d.id}
                className="card"
                role="listitem"
                aria-label={`Objet restreint : ${d.type}`}
                style={{
                  filter: 'grayscale(1)',
                  opacity: 0.6,
                  cursor: 'not-allowed',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                {/* Image grisée */}
                <div
                  style={{ height: 132, borderRadius: 8, background: '#e2e8f0', marginBottom: '.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
                  aria-hidden="true"
                >
                  <Lock size={36} />
                </div>

                {/* Type et pièce en gris */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-gray">{d.type}</span>
                  <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>{d.room}</span>
                </div>

                {/* Nom masqué */}
                <h2 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '.4rem', color: '#94a3b8' }}>
                  Objet restreint
                </h2>

                {/* Message de restriction */}
                <p style={{ fontSize: '.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  🔒 Vous n'avez pas le niveau requis pour voir cet objet.
                </p>
                <p style={{ fontSize: '.78rem', color: '#cbd5e1', marginTop: '.3rem' }}>
                  Niveau actuel : <strong>{currentUser?.niveau ?? '—'}</strong>
                  {' · '}Consommation : <strong>&gt; {energyLimit} kWh</strong>
                </p>
              </div>
            );
          }

          // ── Carte normale ───────────────────────────────────────────────────
          return (
          <Link
            key={d.id}
            to={`/objets/${d.id}`}
            className="card card-clickable"
            role="listitem"
            aria-label={`Consulter ${d.name}`}
            onClick={() => handleView(d.id)}
          >
            <div style={{ height: 132, borderRadius: 8, background: '#f1f5f9', marginBottom: '.85rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }} aria-hidden="true">
              {d.photo ? (
                <img src={d.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Cpu size={32} />
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`status-dot ${d.status === 'active' ? 'active' : 'inactive'}`} aria-hidden="true" />
              <span className="badge badge-gray">{d.type}</span>
              <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>{d.room}</span>
            </div>
            <h2 style={{ fontSize: '.98rem', fontWeight: 700, marginBottom: '.2rem' }}>{d.name}</h2>
            <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', marginBottom: '.5rem' }}>{d.brand}</p>
            <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{d.description?.slice(0, 80)}…</p>

            {d.battery !== null && d.battery !== undefined && (
              <div className="mt-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', marginBottom: '.2rem', color: 'var(--color-text-muted)' }}>
                  <span>Batterie</span><span>{d.battery}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${d.battery}%`, background: d.battery > 50 ? '#22c55e' : d.battery > 20 ? '#f59e0b' : '#ef4444', borderRadius: 999 }}
                    role="progressbar" aria-valuenow={d.battery} aria-valuemin="0" aria-valuemax="100" aria-label={`Batterie ${d.battery}%`} />
                </div>
              </div>
            )}

            {d.tags && (
              <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                {d.tags.map(tag => <span key={tag} className="badge badge-primary" style={{ fontSize: '.7rem' }}>{tag}</span>)}
              </div>
            )}
          </Link>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
            <Search size={32} style={{ display: 'block', margin: '0 auto .75rem' }} aria-hidden="true" />
            Aucun objet ne correspond à vos filtres.
          </p>
        )}
      </div>
    </div>
  );
}
