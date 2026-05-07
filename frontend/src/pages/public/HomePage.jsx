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
import { publicAPI, usersAPI, houseAPI, requestsAPI } from '../../services/api';
import { formatDateTime } from '../../constants/smartHome';
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
        <PlantDecorations />
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
              <p style={{ color: 'var(--color-text-muted)' }}>Les services sont gérés par les habitants avancés et les experts.</p>
            </div>
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
                <div className="service-public-card__top">
                  <span className="service-public-card__category">{service.service_type || 'service'}</span>
                  <span className="service-public-card__access">Avancé / Expert</span>
                </div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <small>Gestion réservée aux niveaux avancé et expert</small>
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
        className="modal guide-modal service-modal"
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
          <div className="service-modal__access">
            <strong>Gestion du service</strong>
            <span>Réservée aux habitants avancés et aux experts dans l'espace connecté.</span>
          </div>
          <div className="guide-modal__steps" aria-label="Informations du service">
            <div className="guide-modal__step">
              <span>1</span>
              <strong>Activation et configuration</strong>
              <small>Ces actions sont disponibles après connexion avec un niveau avancé ou expert.</small>
            </div>
            {service.categorie_nom && (
              <div className="guide-modal__step">
                <span>2</span>
                <strong>Catégorie: {service.categorie_nom}</strong>
                <small>Utilisez les bulles pour filtrer les services par catégorie.</small>
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

function PlantDecorations() {
  return (
    <div className="hero-nature" aria-hidden="true">
      {/* Grande plante droite principale */}
      <svg className="nature-plant nature-plant--right" viewBox="0 0 240 340" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M120 340 C120 330 118 270 118 190" stroke="#065f46" strokeWidth="6" strokeLinecap="round"/>
        {/* Feuille haute-gauche */}
        <path d="M117 205 C88 178 55 155 22 135 C52 155 85 178 117 200 C65 158 44 120 49 95 C65 120 110 168 117 200Z" fill="#0d9488"/>
        {/* Feuille haute-droite */}
        <path d="M123 212 C155 183 186 150 208 115 C180 148 152 181 123 207 C172 155 190 108 183 80 C162 110 126 196 123 207Z" fill="#14b8a6"/>
        {/* Feuille milieu-gauche */}
        <path d="M116 255 C85 238 57 216 34 194 C58 212 87 234 116 251 C65 220 46 188 51 166 C68 186 110 240 116 251Z" fill="#0f766e"/>
        {/* Feuille milieu-droite */}
        <path d="M124 268 C155 249 180 224 195 198 C173 222 149 246 124 264 C170 230 185 194 177 173 C158 196 127 256 124 264Z" fill="#2dd4bf"/>
        {/* Petite feuille sommet */}
        <path d="M119 188 C103 160 95 126 100 102 C108 126 118 162 119 185 C113 128 121 92 129 82 C125 108 120 165 119 185Z" fill="#047857"/>
        {/* Feuille basse */}
        <path d="M116 295 C88 280 62 260 44 240 C65 258 90 276 116 291 C70 263 54 234 58 216 C74 234 110 282 116 291Z" fill="#34d399" opacity="0.9"/>
      </svg>

      {/* Seconde plante droite, légèrement en retrait */}
      <svg className="nature-plant nature-plant--right2" viewBox="0 0 180 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M90 260 C90 252 88 200 88 150" stroke="#065f46" strokeWidth="5" strokeLinecap="round"/>
        <path d="M87 163 C62 140 38 122 15 108 C38 122 63 140 87 160 C44 124 26 94 30 74 C44 94 83 148 87 160Z" fill="#34d399"/>
        <path d="M93 170 C120 146 145 118 162 90 C139 116 116 144 93 166 C134 120 148 82 140 60 C124 88 96 158 93 166Z" fill="#6ee7b7"/>
        <path d="M88 208 C64 195 42 178 26 160 C44 175 67 192 88 205 C48 179 33 152 37 136 C52 152 84 198 88 205Z" fill="#10b981"/>
      </svg>

      {/* Petite plante gauche */}
      <svg className="nature-plant nature-plant--left" viewBox="0 0 160 230" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 230 C80 222 78 170 78 125" stroke="#065f46" strokeWidth="5" strokeLinecap="round"/>
        <path d="M77 138 C54 116 30 100 8 86 C30 100 56 118 77 134 C34 98 17 68 21 50 C35 68 72 122 77 134Z" fill="#0d9488"/>
        <path d="M83 145 C108 122 130 96 145 68 C124 94 103 120 83 141 C120 98 132 60 125 38 C109 60 86 133 83 141Z" fill="#14b8a6"/>
        <path d="M79 178 C55 165 32 148 16 132 C34 146 57 162 79 174 C38 150 22 122 26 107 C42 122 74 168 79 174Z" fill="#2dd4bf"/>
        <path d="M78 200 C58 190 40 175 25 160 C42 173 60 187 78 197 C40 175 26 150 30 136 C44 150 74 192 78 197Z" fill="#34d399" opacity="0.8"/>
      </svg>

      {/* Feuilles flottantes */}
      <svg className="nature-leaf nature-leaf--1" viewBox="0 0 52 82" fill="none">
        <path d="M26 78 C26 78 3 54 4 28 C13 43 21 62 26 76 C14 46 19 16 26 8 C24 32 26 64 26 76Z" fill="#10b981" opacity="0.8"/>
        <line x1="26" y1="10" x2="26" y2="76" stroke="#047857" strokeWidth="1.2" opacity="0.5"/>
      </svg>
      <svg className="nature-leaf nature-leaf--2" viewBox="0 0 44 68" fill="none">
        <path d="M22 64 C22 64 2 44 3 22 C10 34 18 52 22 62 C11 36 15 12 22 6 C20 26 22 55 22 62Z" fill="#34d399" opacity="0.75"/>
        <line x1="22" y1="8" x2="22" y2="62" stroke="#059669" strokeWidth="1" opacity="0.45"/>
      </svg>
      <svg className="nature-leaf nature-leaf--3" viewBox="0 0 48 76" fill="none">
        <path d="M24 72 C24 72 4 50 4 26 C12 40 20 58 24 70 C12 43 16 16 24 8 C22 30 24 62 24 70Z" fill="#0d9488" opacity="0.65"/>
      </svg>
      <svg className="nature-leaf nature-leaf--4" viewBox="0 0 38 60" fill="none">
        <path d="M19 56 C19 56 2 38 3 19 C9 29 15 44 19 54 C9 30 13 10 19 5 C17 22 19 48 19 54Z" fill="#6ee7b7" opacity="0.7"/>
      </svg>
    </div>
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
  const totalEnergy = activeDevices.reduce((sum, device) => sum + (device.energyConsumption > 0 ? device.energyConsumption : 0), 0).toFixed(1);
  const [maintenanceAlert, setMaintenanceAlert] = useState(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [consumptionHistory, setConsumptionHistory] = useState([]);
  const [houseConfig, setHouseConfig] = useState(null);

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

  useEffect(() => {
    let active = true;
    async function loadMaintenance() {
      try {
        const [consRes, reqRes, histRes] = await Promise.allSettled([houseAPI.getConsumption(), requestsAPI.getMine(), isAdmin ? houseAPI.getConsumptionHistory() : Promise.resolve([])]);
        if (!active) return;
        const consumption = consRes.status === 'fulfilled' ? consRes.value : null;
        const requests = reqRes.status === 'fulfilled' ? reqRes.value : [];
        const history = histRes.status === 'fulfilled' ? histRes.value : [];
        const maintenanceRequests = Array.isArray(requests) ? requests.filter(r => r.type === 'maintenance') : [];
        
        // N'afficher l'alerte que si elle n'est pas résolue ET si le dépassement est toujours actif
        const isCurrentlyExceeded = consumption?.exceeded && !consumption?.resolved;
        // Affiche la bannière uniquement si le dépassement est toujours actif (et qu'un budget est défini).
        if (isCurrentlyExceeded && consumption?.budgetKwh > 0) {
          setMaintenanceAlert({ consumption, maintenanceRequests });
        } else {
          setMaintenanceAlert(null);
        }
        
        if (isAdmin && Array.isArray(history)) {
          setConsumptionHistory(history);
        }
      } catch (err) {
        console.error('Erreur chargement alertes maintenance:', err);
      }
    }
    loadMaintenance();
    const iv = setInterval(loadMaintenance, 60_000);
    return () => { active = false; clearInterval(iv); };
  }, [isAdmin]);

  useEffect(() => {
    const loadHouseConfig = async () => {
      try {
        const config = await houseAPI.getConfig();
        setHouseConfig(config);
      } catch (err) {
        console.error('Erreur chargement config maison:', err);
      }
    };
    loadHouseConfig();
  }, []);

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
        {maintenanceAlert && maintenanceAlert.consumption?.budgetKwh > 0 && (
          <div className="maintenance-banner" style={{ marginTop: '1rem' }}>
            <div className="maintenance-banner__inner container">
              <div className="maintenance-banner__text">
                <strong>Alerte consommation</strong>
                <span style={{ marginLeft: '.5rem' }}>
                  La consommation mensuelle est de <strong>{maintenanceAlert.consumption?.consumptionKwh ?? '—'} kWh</strong>
                  {maintenanceAlert.consumption?.budgetKwh ? ` pour un budget de ${maintenanceAlert.consumption.budgetKwh} kWh` : ''}.
                </span>
              </div>
            </div>
          </div>
        )}

        {houseConfig && (
          <div className="card mb-4" style={{ background: '#f0f9ff', borderColor: '#0284c7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>{houseConfig.housingType === 'appartement' ? '🏢' : '🏠'}</div>
              <div>
                <h3 style={{ fontSize: '.95rem', fontWeight: 700, margin: 0 }}>
                  {houseConfig.housingType === 'appartement' ? 'Appartement' : 'Maison'} — {houseConfig.nbPieces} pièce{houseConfig.nbPieces > 1 ? 's' : ''}
                </h3>
                <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', margin: '.2rem 0 0' }}>
                  {houseConfig.budgetKwh > 0 ? `Budget énergétique: ${houseConfig.budgetKwh} kWh/mois` : 'Pas de budget énergétique défini'}
                </p>
                {isAdmin && <p style={{ fontSize: '.8rem', color: '#0284c7', margin: '.3rem 0 0', fontStyle: 'italic' }}>
                  Modifiable dans les <Link to="/admin/parametres" style={{ color: '#0284c7', fontWeight: 600 }}>paramètres</Link>
                </p>}
              </div>
            </div>
          </div>
        )}

        {isAdmin && consumptionHistory.length > 0 && (
          <ConsumptionHistoryPanel history={consumptionHistory} currentConsumption={maintenanceAlert?.consumption} />
        )}

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

function ConsumptionHistoryPanel({ history, currentConsumption }) {
  const recentAlerts = history.filter(item => item.alertAt).slice(0, 6);
  
  return (
    <div className="card mb-4">
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Historique consommation</h2>
      {recentAlerts.length > 0 ? (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: '.85rem' }} aria-label="Historique de consommation">
            <thead>
              <tr>
                <th scope="col">Date alerte</th>
                <th scope="col">Conso. (kWh)</th>
                <th scope="col">Budget (kWh)</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map(item => (
                <tr key={item.id} style={{ opacity: item.resolvedAt ? 0.6 : 1 }}>
                  <td>{formatDateTime(item.alertAt)}</td>
                  <td>{Number(item.consumptionKwh || 0).toFixed(1)}</td>
                  <td>{Number(item.budgetKwh || 0).toFixed(1)}</td>
                  <td>
                    <span className={`badge ${item.resolvedAt ? 'badge-success' : 'badge-danger'}`}>
                      {item.resolvedAt ? '✓ Résolu' : '⚠ Dépassement'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>Aucune alerte de consommation enregistrée.</p>
      )}
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
