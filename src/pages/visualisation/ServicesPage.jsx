import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Wrench } from 'lucide-react';
import { publicAPI } from '../../services/api';

const LEVELS = ['Tous', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('Tous');
  const [level, setLevel] = useState('Tous');

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        const data = await publicAPI.getServices(level === 'Tous' ? {} : { minLevel: level });
        setServices(data);
      } catch (err) {
        console.error('Erreur chargement services:', err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, [level]);

  const serviceTypes = useMemo(() => (
    ['Tous', ...new Set(services.map(service => service.service_type).filter(Boolean))]
  ), [services]);

  const filtered = services.filter(service => {
    const text = `${service.name} ${service.description} ${service.service_type}`.toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword.toLowerCase());
    const matchType = type === 'Tous' || service.service_type === type;
    return matchKeyword && matchType;
  });

  return (
    <div className="container section animate-fade">
      <div className="dashboard-welcome">
        <div>
          <h1><Wrench size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Services de la maison</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Consultez les services disponibles selon leur type et le niveau requis.</p>
        </div>
        <span className="badge badge-primary">{filtered.length} service(s)</span>
      </div>

      <form className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }} role="search" aria-label="Filtrer les services" onSubmit={e => e.preventDefault()}>
        <input
          type="search"
          className="form-input"
          placeholder="Nom, description, type..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          aria-label="Mot cle"
          style={{ flex: 1, minWidth: 220 }}
        />
        <select className="form-select" value={type} onChange={e => setType(e.target.value)} aria-label="Type de service" style={{ minWidth: 170 }}>
          {serviceTypes.map(option => <option key={option}>{option}</option>)}
        </select>
        <select className="form-select" value={level} onChange={e => setLevel(e.target.value)} aria-label="Niveau requis" style={{ minWidth: 160 }}>
          {LEVELS.map(option => <option key={option}>{option}</option>)}
        </select>
      </form>

      <div className="grid grid-3" role="list" aria-label="Liste des services">
        {filtered.map(service => (
          <article key={service.id} className="card" role="listitem">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ color: 'var(--color-primary)' }} aria-hidden="true">
                <SlidersHorizontal size={18} />
              </div>
              <span className="badge badge-gray">{service.service_type || 'Service'}</span>
              <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>{service.min_niveau}</span>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '.35rem' }}>{service.name}</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{service.description}</p>
          </article>
        ))}

        {!loading && filtered.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
            <Search size={32} style={{ display: 'block', margin: '0 auto .75rem' }} aria-hidden="true" />
            Aucun service ne correspond aux filtres.
          </p>
        )}

        {loading && (
          <p style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
            Chargement des services...
          </p>
        )}
      </div>
    </div>
  );
}
