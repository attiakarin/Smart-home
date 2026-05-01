import { useMemo, useState } from 'react';
import { Cpu, Search, Wifi, Zap } from 'lucide-react';
import { DEVICES } from '../../data/mockData';

const ALL = 'Tous';

export default function EventsPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState(ALL);

  const types = useMemo(() => [ALL, ...new Set(DEVICES.map(device => device.type))], []);
  const filtered = DEVICES.filter(device => {
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || [device.name, device.type, device.brand, device.room, device.description]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(term));
    return matchesQuery && (type === ALL || device.type === type);
  });

  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><Cpu size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Catalogue maison connectee</h1>
      <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Objets connectes de demonstration pour comprendre les equipements possibles dans une maison intelligente.
      </p>

      <form className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }} role="search" aria-label="Filtrer les objets" onSubmit={event => event.preventDefault()}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: 13, color: 'var(--color-text-muted)' }} />
          <input
            type="search"
            className="form-input"
            placeholder="Rechercher Samsung, camera, energie..."
            value={query}
            onChange={event => setQuery(event.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <select className="form-select" value={type} onChange={event => setType(event.target.value)} style={{ minWidth: 180 }}>
          {types.map(item => <option key={item}>{item}</option>)}
        </select>
      </form>

      <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} objet(s) trouve(s)</p>

      <div className="grid grid-3" role="list">
        {filtered.map(device => (
          <article key={device.id} className="card card-clickable" role="listitem">
            <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
              <span className="badge badge-primary">{device.type}</span>
              <span className={device.status === 'active' ? 'badge badge-success' : 'badge badge-danger'}>
                {device.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '.3rem' }}>{device.name}</h2>
            <p style={{ fontSize: '.86rem', color: 'var(--color-text-muted)', marginBottom: '.75rem' }}>{device.description}</p>
            <div className="flex gap-2" style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
              <span className="flex items-center gap-1"><Wifi size={13} aria-hidden="true" /> {device.connectivity}</span>
              <span className="flex items-center gap-1"><Zap size={13} aria-hidden="true" /> {device.energyConsumption} kWh</span>
              <span>{device.brand} - {device.room}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
