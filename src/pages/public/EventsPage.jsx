import { useState } from 'react';
import { Calendar, MapPin, Tag } from 'lucide-react';
import { EVENTS } from '../../data/mockData';

const TYPES = ['Tous', 'Marché', 'Concert', 'Atelier', 'Festival', 'Exposition'];

export default function EventsPage() {
  const [type, setType] = useState('Tous');
  const [kw, setKw]     = useState('');

  const filtered = EVENTS.filter(ev =>
    (type === 'Tous' || ev.type === type) &&
    (!kw || ev.title.toLowerCase().includes(kw.toLowerCase()) || ev.description.toLowerCase().includes(kw.toLowerCase()))
  );

  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><Calendar size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Événements Locaux</h1>

      <form className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }} role="search" aria-label="Filtrer les événements" onSubmit={e => e.preventDefault()}>
        <input
          type="search"
          className="form-input"
          placeholder="Rechercher un événement…"
          value={kw}
          onChange={e => setKw(e.target.value)}
          aria-label="Mots-clés"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="form-select" value={type} onChange={e => setType(e.target.value)} aria-label="Type d'événement" style={{ minWidth: 150 }}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </form>

      <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} événement(s) trouvé(s)</p>

      <div className="grid grid-3" role="list">
        {filtered.map(ev => (
          <article key={ev.id} className="card card-clickable" role="listitem">
            <span className="badge badge-warning mb-2"><Tag size={12} aria-hidden="true" /> {ev.type}</span>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.3rem' }}>{ev.title}</h2>
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginBottom: '.75rem' }}>{ev.description}</p>
            <div className="flex gap-2" style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
              <span className="flex items-center gap-1"><Calendar size={13} aria-hidden="true" /> {ev.date}</span>
              <span className="flex items-center gap-1"><MapPin size={13} aria-hidden="true" /> {ev.location}</span>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-center mt-4" style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1' }}>Aucun événement ne correspond à vos filtres.</p>
        )}
      </div>
    </div>
  );
}
