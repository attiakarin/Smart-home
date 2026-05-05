import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Wrench, X, Heart } from 'lucide-react';
import { publicAPI } from '../../services/api';
import { useDevices } from '../../context/DevicesContext';

const LEVELS = ['Tous', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

export default function ServicesPage() {
  const { devices } = useDevices();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('Tous');
  const [level, setLevel] = useState('Tous');
  const [room, setRoom] = useState('Toutes');
  const [status, setStatus] = useState('Tous');
  const [consumptionRange, setConsumptionRange] = useState([0, 10000]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('sh_services_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedService, setSelectedService] = useState(null);

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

  const rooms = useMemo(() => {
    const serviceRooms = services.flatMap(service => {
      const relatedDevices = devices.filter(d => 
        d.type?.toLowerCase().includes(service.service_type?.toLowerCase())
      );
      return relatedDevices.map(d => d.room);
    });
    return ['Toutes', ...new Set(serviceRooms.filter(Boolean))];
  }, [services, devices]);

  const toggleFavorite = (serviceId) => {
    setFavorites(prev => {
      const updated = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      localStorage.setItem('sh_services_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const filtered = services.filter(service => {
    const text = `${service.name} ${service.description} ${service.service_type}`.toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword.toLowerCase());
    const matchType = type === 'Tous' || service.service_type === type;
    
    // Filtre par pièce
    const relatedDevices = devices.filter(d => 
      d.type?.toLowerCase().includes(service.service_type?.toLowerCase())
    );
    const matchRoom = room === 'Toutes' || relatedDevices.some(d => d.room === room);
    
    // Filtre par statut
    const activeCount = relatedDevices.filter(d => d.status === 'active').length;
    const serviceStatus = activeCount === 0 ? 'Inactif' : activeCount === relatedDevices.length ? 'Actif' : 'Partiel';
    const matchStatus = status === 'Tous' || serviceStatus === status;
    
    // Filtre par consommation (seulement pour les services énergétiques)
    let matchConsumption = true;
    if (service.categorie_nom === 'énergie' && consumptionRange) {
      const totalConsumption = relatedDevices.reduce((sum, d) => sum + (d.energyConsumption || 0), 0);
      matchConsumption = totalConsumption >= consumptionRange[0] && totalConsumption <= consumptionRange[1];
    }
    
    return matchKeyword && matchType && matchRoom && matchStatus && matchConsumption;
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
        <select className="form-select" value={room} onChange={e => setRoom(e.target.value)} aria-label="Pièce" style={{ minWidth: 140 }}>
          {rooms.map(option => <option key={option}>{option}</option>)}
        </select>
        <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Statut" style={{ minWidth: 120 }}>
          <option>Tous</option>
          <option>Actif</option>
          <option>Inactif</option>
          <option>Partiel</option>
        </select>
      </form>

      <div className="grid grid-3" role="list" aria-label="Liste des services">
        {filtered.map(service => {
          const relatedDevices = devices.filter(d => 
            d.type?.toLowerCase().includes(service.service_type?.toLowerCase())
          );
          const activeCount = relatedDevices.filter(d => d.status === 'active').length;
          const serviceStatus = activeCount === 0 ? 'Inactif' : activeCount === relatedDevices.length ? 'Actif' : 'Partiel';
          const totalConsumption = relatedDevices.reduce((sum, d) => sum + (d.energyConsumption || 0), 0);
          
          return (
            <button
              key={service.id}
              type="button"
              className="card card-clickable"
              role="listitem"
              onClick={() => setSelectedService(service)}
              style={{ textAlign: 'left' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div style={{ color: 'var(--color-primary)' }} aria-hidden="true">
                  <SlidersHorizontal size={18} />
                </div>
                <span className="badge badge-gray">{service.service_type || 'Service'}</span>
                <span className={`badge ${serviceStatus === 'Actif' ? 'badge-success' : serviceStatus === 'Partiel' ? 'badge-warning' : 'badge-gray'}`}>
                  {serviceStatus}
                </span>
                {service.categorie_nom === 'énergie' && (
                  <span className="badge badge-primary">
                    {totalConsumption.toFixed(1)} kWh
                  </span>
                )}
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(service.id); }}
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: service.categorie_nom !== 'énergie' ? 'auto' : '0', color: favorites.includes(service.id) ? 'var(--color-error)' : 'inherit' }}
                  aria-label={favorites.includes(service.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Heart size={18} fill={favorites.includes(service.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '.35rem' }}>{service.name}</h2>
              <p style={{ fontSize: '.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{service.description}</p>
              <span className="form-hint">Cliquer pour voir le détail</span>
            </button>
          );
        })}

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

      {selectedService && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="service-detail-title">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 id="service-detail-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedService.name}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedService(null)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div style={{ 
              height: 200, 
              background: '#f1f5f9', 
              borderRadius: 8, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              {selectedService.photo ? (
                <img src={selectedService.photo} alt={selectedService.name} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}} />
              ) : (
                <SlidersHorizontal size={48} style={{ color: 'var(--color-primary)' }} />
              )}
            </div>
            <div className="modal-body">
              <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
                {(() => {
                  const relatedDevices = devices.filter(d => 
                    d.type?.toLowerCase().includes(selectedService.service_type?.toLowerCase())
                  );
                  const activeCount = relatedDevices.filter(d => d.status === 'active').length;
                  const serviceStatus = activeCount === 0 ? 'Inactif' : activeCount === relatedDevices.length ? 'Actif' : 'Partiel';
                  const totalConsumption = relatedDevices.reduce((sum, d) => sum + (d.energyConsumption || 0), 0);
                  
                  return (
                    <>
                      <span className="badge badge-gray">{selectedService.service_type || 'Service'}</span>
                      <span className={`badge ${serviceStatus === 'Actif' ? 'badge-success' : serviceStatus === 'Partiel' ? 'badge-warning' : 'badge-gray'}`}>
                        {serviceStatus}
                      </span>
                      {selectedService.categorie_nom === 'énergie' && (
                        <span className="badge badge-primary">
                          {totalConsumption.toFixed(1)} kWh
                        </span>
                      )}
                      {selectedService.categorie_nom && <span className="badge badge-warning">{selectedService.categorie_nom}</span>}
                    </>
                  );
                })()}
              </div>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{selectedService.description}</p>
              {(() => {
                const relatedDevices = devices.filter(d => 
                  d.type?.toLowerCase().includes(selectedService.service_type?.toLowerCase())
                );
                return relatedDevices.length > 0 ? (
                  <div className="card mt-3" style={{ background: '#f8fafc' }}>
                    <h3 style={{ fontSize: '.95rem', fontWeight: 800, marginBottom: '.4rem' }}>
                      Objets compatibles ({relatedDevices.length})
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem', marginBottom: '.6rem' }}>
                      {relatedDevices.map(d => d.name).join(', ')}
                    </p>
                    <button className="btn btn-sm btn-ghost" onClick={() => {
                      setSelectedService(null);
                      // TODO: Navigate to devices page filtered by service type
                    }}>
                      Voir les détails →
                    </button>
                  </div>
                ) : null;
              })()}
              <div className="card mt-3" style={{ background: '#f8fafc' }}>
                <h3 style={{ fontSize: '.95rem', fontWeight: 800, marginBottom: '.4rem' }}>Ce service permet</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>
                  D’explorer les fonctionnalités liées à la catégorie, puis de les utiliser avec vos objets connectés une fois votre compte validé.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedService(null);
                    // TODO: Navigate or filter devices by service type
                  }}
                >
                  Utiliser ce service
                </button>
                <button className="btn btn-primary" onClick={() => setSelectedService(null)}>Compris</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
