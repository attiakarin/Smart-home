import { useState } from 'react';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { PLACES } from '../../data/mockData';

const TYPES = ['Tous', 'Parc', 'Bibliothèque', 'Musée', 'Restaurant', 'Sport'];
const DISTANCES_OPT = ['Toutes', '< 0.5 km', '< 1 km', '< 2 km'];

export default function PlacesPage() {
  const [type, setType]       = useState('Tous');
  const [dist, setDist]       = useState('Toutes');
  const [kw, setKw]           = useState('');

  const maxDist = dist === 'Toutes' ? Infinity : dist === '< 0.5 km' ? 0.5 : dist === '< 1 km' ? 1 : 2;

  const filtered = PLACES.filter(p =>
    (type === 'Tous' || p.type === type) &&
    p.distance <= maxDist &&
    (!kw || p.name.toLowerCase().includes(kw.toLowerCase()) || p.description.toLowerCase().includes(kw.toLowerCase()))
  );

  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><MapPin size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Lieux à Proximité</h1>

      {/* Filtres */}
      <form className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }} role="search" aria-label="Filtrer les lieux" onSubmit={e => e.preventDefault()}>
        <input
          type="search"
          className="form-input"
          placeholder="Rechercher un lieu…"
          value={kw}
          onChange={e => setKw(e.target.value)}
          aria-label="Mots-clés"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="form-select" value={type} onChange={e => setType(e.target.value)} aria-label="Type de lieu" style={{ minWidth: 150 }}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="form-select" value={dist} onChange={e => setDist(e.target.value)} aria-label="Distance maximale" style={{ minWidth: 130 }}>
          {DISTANCES_OPT.map(d => <option key={d}>{d}</option>)}
        </select>
      </form>

      <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} lieu(x) trouvé(s)</p>

      <div className="grid grid-3" role="list" aria-label="Liste des lieux">
        {filtered.map(place => (
          <article key={place.id} className="card card-clickable" role="listitem">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${place.free ? 'badge-success' : 'badge-warning'}`}>{place.free ? 'Gratuit' : 'Payant'}</span>
              <span className="badge badge-gray">{place.type}</span>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.3rem' }}>{place.name}</h2>
            <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginBottom: '.75rem' }}>{place.description}</p>
            <div className="flex gap-2" style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
              <span className="flex items-center gap-1"><MapPin size={13} aria-hidden="true" /> {place.distance} km</span>
              <span className="flex items-center gap-1"><Clock size={13} aria-hidden="true" /> {place.horaires}</span>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>Aucun lieu correspond à vos filtres.</p>
      )}
    </div>
  );
}
