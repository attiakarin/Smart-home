import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  Bell,
  BookOpen,
  Cpu,
  Filter,
  KeyRound,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Thermometer,
  User,
  Wifi,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DevicesContext';
import { publicAPI, usersAPI } from '../../services/api';
import './HomePage.css';

const ALL = 'Tous';

const FALLBACK_FILTERS = {
  types: [],
  brands: [],
  connectivities: [],
  features: ['sécurité', 'confort', 'énergie', 'suivi', 'automatisation'],
};

const FALLBACK_SERVICES = [
  {
    id: 'fallback-automatisation',
    name: 'Automatisations',
    description: 'Créer des scénarios simples pour déclencher plusieurs objets selon une heure, un état ou une situation.',
    service_type: 'automatisation',
    min_niveau: 'Avancé',
    categorie_nom: 'Scénarios',
  },
  {
    id: 'fallback-securite',
    name: 'Sécurité maison',
    description: 'Surveiller les accès, consulter les alertes et suivre les objets sensibles de la maison.',
    service_type: 'sécurité',
    min_niveau: 'Avancé',
    categorie_nom: 'Protection',
  },
  {
    id: 'fallback-energie',
    name: 'Suivi énergétique',
    description: 'Identifier les appareils qui consomment le plus et suivre les indicateurs utiles au quotidien.',
    service_type: 'énergie',
    min_niveau: 'Intermédiaire',
    categorie_nom: 'Consommation',
  },
  {
    id: 'fallback-confort',
    name: 'Confort connecté',
    description: 'Piloter les équipements du quotidien comme l’éclairage, le chauffage ou les volets.',
    service_type: 'confort',
    min_niveau: 'Débutant',
    categorie_nom: 'Maison',
  },
  {
    id: 'fallback-suivi',
    name: 'Suivi des objets',
    description: 'Consulter l’état, la batterie et la dernière activité des objets connectés.',
    service_type: 'suivi',
    min_niveau: 'Débutant',
    categorie_nom: 'Visualisation',
  },
];

const GUIDE_CARDS = [
  {
    title: 'Comprendre une maison connectée',
    theme: 'confort',
    level: 'Débutant',
    text: 'Découvrez comment les objets, services et profils habitants fonctionnent ensemble.',
    details: [
      'Une maison connectée regroupe des objets comme les thermostats, capteurs, lampes, prises ou caméras.',
      'Chaque objet remonte un état dans le tableau de bord: actif, inactif, batterie, connexion ou consommation.',
      'Les habitants consultent les informations selon leur niveau, tandis que l’administrateur valide les accès et supervise la maison.',
    ],
    steps: ['Explorer le catalogue', 'Créer ou rejoindre une maison', 'Suivre les objets depuis le tableau de bord'],
  },
  {
    title: 'Optimiser sa consommation',
    theme: 'énergie',
    level: 'Intermédiaire',
    text: 'Repérez les équipements énergivores et suivez les bons indicateurs avant d’automatiser.',
    details: [
      'Commencez par comparer la consommation des objets qui restent actifs longtemps.',
      'Surveillez les batteries faibles et les appareils inactifs pour éviter les mesures incorrectes.',
      'Une fois les usages compris, vous pouvez ajuster les horaires, les seuils et les services associés.',
    ],
    steps: ['Identifier les appareils gourmands', 'Vérifier les alertes', 'Adapter les usages progressivement'],
  },
  {
    title: 'Sécuriser les accès',
    theme: 'sécurité',
    level: 'Avancé',
    text: 'Combinez caméras, capteurs et validations admin pour maîtriser les accès à la maison.',
    details: [
      'La sécurité combine les objets physiques, les comptes utilisateurs et les droits d’accès.',
      'L’administrateur garde la main sur les demandes en attente et les niveaux de chaque habitant.',
      'Les caméras, capteurs d’ouverture et alertes permettent de repérer rapidement une situation inhabituelle.',
    ],
    steps: ['Valider uniquement les membres connus', 'Contrôler les niveaux d’accès', 'Consulter les alertes régulièrement'],
  },
];

export default function HomePage() {
  const { currentUser, users, canAccess } = useAuth();
  const { devices } = useDevices();

  if (currentUser) {
    return <ConnectedHome currentUser={currentUser} users={users} devices={devices} canAccess={canAccess} />;
  }

  return <PublicHome />;
}

function PublicHome() {
  const [catalog, setCatalog] = useState([]);
  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({ types: [], brands: [], connectivities: [], features: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState(ALL);
  const [brand, setBrand] = useState(ALL);
  const [feature, setFeature] = useState(ALL);
  const [connectivity, setConnectivity] = useState(ALL);
  const [serviceCategory, setServiceCategory] = useState(ALL);
  const [selectedService, setSelectedService] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeGuide, setActiveGuide] = useState(null);

  useEffect(() => {
    if (!activeGuide) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') setActiveGuide(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeGuide]);

  useEffect(() => {
    const loadPublicData = async () => {
      setLoading(true);
      setError('');
      const [catalogResult, filtersResult, servicesResult] = await Promise.allSettled([
        publicAPI.getCatalog(),
        publicAPI.getCatalogFilters(),
        publicAPI.getServices(),
      ]);

      if (catalogResult.status === 'fulfilled') {
        setCatalog(catalogResult.value);
      } else {
        console.error('Erreur chargement catalogue public:', catalogResult.reason);
        setCatalog([]);
      }

      if (filtersResult.status === 'fulfilled') {
        setFilters(filtersResult.value);
      } else {
        console.error('Erreur chargement filtres publics:', filtersResult.reason);
        setFilters(FALLBACK_FILTERS);
      }

      if (servicesResult.status === 'fulfilled' && servicesResult.value.length > 0) {
        setServices(servicesResult.value);
      } else {
        if (servicesResult.status === 'rejected') {
          console.error('Erreur chargement services publics:', servicesResult.reason);
        }
        setServices(FALLBACK_SERVICES);
      }

      if (catalogResult.status === 'rejected' || filtersResult.status === 'rejected' || servicesResult.status === 'rejected') {
        setError('Certaines données en ligne sont momentanément indisponibles. Les services restent consultables.');
      }
      setLoading(false);
    };
    loadPublicData();
  }, []);

  const serviceCategories = useMemo(
    () => [ALL, ...new Set(services.map(service => service.service_type).filter(Boolean))],
    [services]
  );

  const filteredCatalog = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.filter(item => {
      const matchesQuery = !term || [item.name, item.type, item.brand, item.feature, item.connectivity, item.description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
      return matchesQuery &&
        (type === ALL || item.type === type) &&
        (brand === ALL || item.brand === brand) &&
        (feature === ALL || item.feature === feature) &&
        (connectivity === ALL || item.connectivity === connectivity);
    });
  }, [catalog, query, type, brand, feature, connectivity]);

  const filteredServices = useMemo(() => (
    services.filter(service => serviceCategory === ALL || service.service_type === serviceCategory)
  ), [services, serviceCategory]);

  const resetFilters = () => {
    setQuery('');
    setType(ALL);
    setBrand(ALL);
    setFeature(ALL);
    setConnectivity(ALL);
    setServiceCategory(ALL);
  };

  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1 id="hero-title">Ma Maison Connectée</h1>
            <p>Explorez les objets, services et usages possibles avant de créer ou rejoindre une maison intelligente.</p>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <a href="#catalogue" className="btn btn-primary hero-cta">
                Explorer le catalogue <ArrowRight size={18} aria-hidden="true" />
              </a>
              <Link to="/creer-maison" className="btn btn-secondary hero-cta">
                Créer ma maison
              </Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-house">
              <div className="house-icon-grid">
                <div className="house-icon-chip"><Thermometer size={22} /><span>Confort</span></div>
                <div className="house-icon-chip"><Wifi size={22} /><span>Connecté</span></div>
                <div className="house-icon-chip"><Shield size={22} /><span>Sécurité</span></div>
                <div className="house-icon-chip"><Zap size={22} /><span>Énergie</span></div>
              </div>
              <img className="house-3d-placeholder" src="/favicon.svg" alt="" />
            </div>
          </div>
        </div>
      </section>

      <section id="catalogue" className="catalog-section">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <h2 className="section-divider">Catalogue d’objets connectés</h2>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Ces objets sont des exemples disponibles dans la plateforme, issus de votre base Supabase.
              </p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
              <SlidersHorizontal size={15} aria-hidden="true" /> Réinitialiser
            </button>
          </div>

          <form className="catalog-search" role="search" aria-label="Rechercher dans le catalogue" onSubmit={event => event.preventDefault()}>
            <div className="catalog-search__bar">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                className="form-input"
                placeholder="Rechercher thermostat, caméra, sécurité, Wi-Fi..."
                value={query}
                onChange={event => setQuery(event.target.value)}
                aria-label="Recherche catalogue"
              />
            </div>
            <button type="button" className="btn btn-outline" onClick={() => setShowFilters(value => !value)}>
              <Filter size={16} aria-hidden="true" /> Filtres
            </button>
          </form>

          {showFilters && (
            <div className="catalog-filters" aria-label="Filtres du catalogue">
              <FilterSelect label="Type" value={type} onChange={setType} options={[ALL, ...filters.types]} />
              <FilterSelect label="Marque" value={brand} onChange={setBrand} options={[ALL, ...filters.brands]} />
              <FilterSelect label="Fonction" value={feature} onChange={setFeature} options={[ALL, ...filters.features]} />
              <FilterSelect label="Connexion" value={connectivity} onChange={setConnectivity} options={[ALL, ...filters.connectivities]} />
            </div>
          )}

          {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}
          {loading ? (
            <p className="search-empty">Chargement du catalogue...</p>
          ) : (
            <>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {filteredCatalog.length} type(s) d’objets trouvé(s)
              </p>
              <div className="catalog-grid" role="list">
                {filteredCatalog.map(item => <CatalogCard key={item.id} item={item} />)}
                {filteredCatalog.length === 0 && (
                  <p className="search-empty" style={{ gridColumn: '1 / -1' }}>Aucun objet ne correspond à ces filtres.</p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="services-public-section">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <h2 className="section-divider">Services de la plateforme</h2>
              <p style={{ color: 'var(--color-text-muted)' }}>Découvrez ce que les habitants peuvent activer selon leur niveau.</p>
            </div>
            <FilterSelect label="Catégorie" value={serviceCategory} onChange={setServiceCategory} options={serviceCategories} />
          </div>
          <div className="service-category-tabs" aria-label="Catégories de services">
            {serviceCategories.map(category => (
              <button
                key={category}
                type="button"
                className={`service-category-tab ${serviceCategory === category ? 'is-active' : ''}`}
                onClick={() => setServiceCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="service-strip" role="list">
            {filteredServices.map(service => (
              <button
                key={service.id}
                type="button"
                className="service-public-card"
                role="listitem"
                onClick={() => setSelectedService(service)}
              >
                <span className="badge badge-primary">{service.service_type}</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <small>Niveau requis: {service.min_niveau}</small>
              </button>
            ))}
            {!loading && filteredServices.length === 0 && (
              <p className="search-empty" style={{ gridColumn: '1 / -1' }}>Aucun service ne correspond à cette catégorie.</p>
            )}
          </div>
        </div>
      </section>

      <section className="container guide-section" aria-labelledby="guides-title">
        <h2 id="guides-title" className="section-divider">Guides pour commencer</h2>
        <div className="grid grid-3">
          {GUIDE_CARDS.map(guide => (
            <button
              type="button"
              key={guide.title}
              className="card guide-card"
              onClick={() => setActiveGuide(guide)}
              aria-label={`Ouvrir le guide ${guide.title}`}
            >
              <span className="badge badge-warning"><BookOpen size={12} aria-hidden="true" /> {guide.level}</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '.75rem 0 .35rem' }}>{guide.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>{guide.text}</p>
              <span className="guide-card__hint">Lire le guide</span>
            </button>
          ))}
        </div>
      </section>

      {activeGuide && (
        <GuideModal guide={activeGuide} onClose={() => setActiveGuide(null)} />
      )}

      {selectedService && (
        <ServiceModal service={selectedService} onClose={() => setSelectedService(null)} />
      )}

      <section className="cta-section container" aria-labelledby="cta-title">
        <p id="cta-title">Prêt à configurer votre propre maison connectée ?</p>
        <div className="flex gap-2" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn btn-outline">Connexion</Link>
          <Link to="/inscription" className="btn btn-primary">
            Demander l’accès <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function ServiceModal({ service, onClose }) {
  return (
    <div className="modal-overlay guide-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="modal guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-modal-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span className="badge badge-primary">{service.service_type || 'Service'}</span>
            <h2 id="service-modal-title">{service.name}</h2>
          </div>
          <button type="button" className="guide-modal__close" onClick={onClose} aria-label="Fermer le service">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body guide-modal__body">
          <p className="guide-modal__intro">{service.description}</p>
          <div className="guide-modal__steps" aria-label="Informations du service">
            <div className="guide-modal__step">
              <span>1</span>
              <strong>Niveau requis: {service.min_niveau}</strong>
            </div>
            {service.categorie_nom && (
              <div className="guide-modal__step">
                <span>2</span>
                <strong>Catégorie: {service.categorie_nom}</strong>
              </div>
            )}
          </div>
        </div>
        <footer className="modal-footer">
          <Link to="/inscription" className="btn btn-primary">Demander l'accès</Link>
          <button type="button" className="btn btn-outline" onClick={onClose}>Fermer</button>
        </footer>
      </section>
    </div>
  );
}

function GuideModal({ guide, onClose }) {
  return (
    <div className="modal-overlay guide-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="modal guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span className="badge badge-warning"><BookOpen size={12} aria-hidden="true" /> {guide.level}</span>
            <h2 id="guide-modal-title">{guide.title}</h2>
          </div>
          <button type="button" className="guide-modal__close" onClick={onClose} aria-label="Fermer le guide">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body guide-modal__body">
          <p className="guide-modal__intro">{guide.text}</p>
          <div className="guide-modal__details">
            {guide.details.map(detail => <p key={detail}>{detail}</p>)}
          </div>
          <div className="guide-modal__steps" aria-label="Étapes conseillées">
            {guide.steps.map((step, index) => (
              <div key={step} className="guide-modal__step">
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Compris</button>
        </footer>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="filter-select">
      <span>{label}</span>
      <select className="form-select" value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CatalogCard({ item }) {
  return (
    <article className="catalog-card" role="listitem">
      <div className="catalog-card__media">
        {item.photo ? (
          <img src={item.photo} alt={`Photo de ${item.name}`} />
        ) : (
          <div className="catalog-card__icon"><Cpu size={22} aria-hidden="true" /></div>
        )}
      </div>
      <div className="catalog-card__body">
        <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
          <span className="badge badge-primary">{item.feature}</span>
          <span className="badge badge-gray">{item.connectivity}</span>
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="catalog-card__meta">
          <span>Type: {item.type}</span>
          <span>Marque: {item.brand}</span>
        </div>
      </div>
    </article>
  );
}

function ConnectedHome({ currentUser, users, devices, canAccess }) {
  const isAdmin = currentUser.appRole === 'admin';
  const localHouseAdmins = useMemo(
    () => users.filter(user => user.appRole === 'admin' && String(user.maisonId) === String(currentUser.maisonId)),
    [users, currentUser.maisonId]
  );
  const [houseAdmins, setHouseAdmins] = useState(
    localHouseAdmins.length > 0 ? localHouseAdmins : currentUser.houseAdmin ? [currentUser.houseAdmin] : []
  );
  const pendingUsers = users.filter(user => user.status === 'pending');
  const inactiveDevices = devices.filter(device => device.status === 'inactive');
  const lowBatteryDevices = devices.filter(device => device.battery !== null && device.battery !== undefined && device.battery < 25);
  const activeDevices = devices.filter(device => device.status === 'active');
  const totalEnergy = devices.reduce((sum, device) => sum + (device.energyConsumption > 0 ? device.energyConsumption : 0), 0).toFixed(1);

  useEffect(() => {
    if (localHouseAdmins.length > 0) {
      setHouseAdmins(localHouseAdmins);
      return;
    }
    if (isAdmin || houseAdmins.length > 0) return;
    let active = true;
    usersAPI.getHouseAdmins()
      .then(admins => {
        if (active) setHouseAdmins(admins);
      })
      .catch(error => {
        console.error('Erreur chargement administrateurs maison:', error);
      });
    return () => {
      active = false;
    };
  }, [isAdmin, houseAdmins.length, localHouseAdmins]);

  return (
    <div className="home-page">
      <section className="container section animate-fade">
        <div className="personal-home-hero">
          <div>
            <span className="badge badge-primary">{isAdmin ? 'Administrateur' : 'Habitant'}</span>
            <h1>Accueil de {currentUser.prenom}</h1>
            <p>{isAdmin ? `Vue de contrôle de ${currentUser.maisonNom || 'votre maison'}` : `Bienvenue dans ${currentUser.maisonNom || 'votre maison connectée'}`}</p>
            {!isAdmin && houseAdmins.length > 0 && (
              <p style={{ marginTop: '.5rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                <Shield size={16} aria-hidden="true" />
                Administrateur{houseAdmins.length > 1 ? 's' : ''} de la maison :
                {houseAdmins.map((admin, index) => (
                  <span key={admin.id || admin.login}>
                    <strong style={{ color: 'var(--color-text)' }}>{admin.prenom} {admin.nom}</strong>
                    <span> @{admin.login}</span>{index < houseAdmins.length - 1 ? ',' : ''}
                  </span>
                ))}
              </p>
            )}
          </div>
          {isAdmin && currentUser.maisonCode && (
            <div className="access-code-box">
              <KeyRound size={18} aria-hidden="true" />
              <strong>{currentUser.maisonCode}</strong>
            </div>
          )}
        </div>

        <div className="grid grid-4 mb-4">
          <StatTile icon={<Cpu size={20} />} value={devices.length} label="Objets" color="#1a73e8" />
          <StatTile icon={<Activity size={20} />} value={activeDevices.length} label="Actifs" color="#22c55e" />
          <StatTile icon={<Zap size={20} />} value={`${totalEnergy} kWh`} label="Consommation" color="#f59e0b" />
          <StatTile icon={<Bell size={20} />} value={isAdmin ? pendingUsers.length : lowBatteryDevices.length} label={isAdmin ? 'Demandes' : 'À vérifier'} color="#ea4335" />
        </div>

        <div className="grid grid-2 mb-4">
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Ce que vous pouvez faire</h2>
            <div className="quick-action-list">
              <QuickAction to="/tableau-de-bord" icon={<BarChart2 size={18} />} title="Tableau de bord" desc="Voir l’état global de la maison." />
              <QuickAction to="/objets" icon={<Cpu size={18} />} title="Objets connectés" desc="Consulter les équipements et leurs états." />
              <QuickAction to="/profil" icon={<User size={18} />} title="Profil" desc="Gérer vos informations et votre niveau." />
              <QuickAction to="/services" icon={<Wrench size={18} />} title="Services" desc="Rechercher les services de la maison." />
              {canAccess('gestion') && <QuickAction to="/gestion" icon={<Settings size={18} />} title="Gestion" desc={canAccess('device_create') ? 'Ajouter ou configurer des objets.' : 'Activer ou désactiver les objets.'} />}
              {isAdmin && <QuickAction to="/admin" icon={<Shield size={18} />} title="Administration" desc="Valider les accès et gérer les membres." />}
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Vérifications</h2>
            <div className="check-list">
              <CheckRow to="/admin" label="Demandes à valider" value={isAdmin ? pendingUsers.length : 0} enabled={isAdmin} />
              <CheckRow to="/objets" label="Objets inactifs" value={inactiveDevices.length} enabled />
              <CheckRow to="/objets" label="Batteries faibles" value={lowBatteryDevices.length} enabled />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckRow({ to, label, value, enabled }) {
  if (!enabled) return null;
  const tone = value ? 'warning' : 'success';
  return (
    <Link to={to} className={`check-row check-row--${tone}`}>
      <div>
        <strong>{label}</strong>
        <p>{value ? 'Une action peut être nécessaire.' : 'Tout est en ordre.'}</p>
      </div>
      <span>{value}</span>
    </Link>
  );
}

function StatTile({ icon, value, label, color }) {
  return (
    <div className="card text-center">
      <div style={{ color, display: 'inline-flex', marginBottom: '.4rem' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function QuickAction({ to, icon, title, desc }) {
  return (
    <Link to={to} className="quick-action">
      <span>{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{desc}</small>
      </span>
    </Link>
  );
}
