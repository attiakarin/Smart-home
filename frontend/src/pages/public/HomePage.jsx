import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  Bell,
  Bus,
  Calendar,
  Cpu,
  KeyRound,
  MapPin,
  Search,
  Settings,
  Shield,
  Thermometer,
  User,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DevicesContext';
import { EVENTS, PLACES, TRANSPORTS } from '../../data/mockData';
import './HomePage.css';

const CATEGORIES = ['Tous', 'Événements', 'Lieux', 'Transports'];

function buildSearchPool() {
  return [
    ...EVENTS.map(event => ({
      id: `event-${event.id}`,
      cat: 'Événements',
      title: event.title,
      subtitle: `${event.date} - ${event.location}`,
      description: event.description,
      badge: event.type,
    })),
    ...PLACES.map(place => ({
      id: `place-${place.id}`,
      cat: 'Lieux',
      title: place.name,
      subtitle: `${place.distance} km - ${place.horaires}`,
      description: place.description,
      badge: place.type,
    })),
    ...TRANSPORTS.map(transport => ({
      id: `transport-${transport.id}`,
      cat: 'Transports',
      title: `${transport.line} vers ${transport.direction}`,
      subtitle: `Prochains départs : ${transport.nextDepartures.join(', ')}`,
      description: '',
      badge: transport.type,
    })),
  ];
}

function SearchResultCard({ item }) {
  const icons = {
    Événements: <Calendar size={13} aria-hidden="true" />,
    Lieux: <MapPin size={13} aria-hidden="true" />,
    Transports: <Bus size={13} aria-hidden="true" />,
  };

  return (
    <article className="card" role="listitem">
      <div className="flex items-center gap-2 mb-2">
        <span className="badge badge-primary">{icons[item.cat]} {item.cat}</span>
        {item.badge && <span className="badge badge-gray">{item.badge}</span>}
      </div>
      <h3 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '.25rem' }}>{item.title}</h3>
      {item.subtitle && <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', marginBottom: '.25rem' }}>{item.subtitle}</p>}
      {item.description && <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>{item.description}</p>}
    </article>
  );
}

export default function HomePage() {
  const { currentUser, users, canAccess } = useAuth();
  const { devices } = useDevices();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('Tous');
  const [results, setResults] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  const searchStorageKey = currentUser ? `sh_recent_searches_${currentUser.id}` : 'sh_recent_searches_guest';
  const searchPool = useMemo(() => buildSearchPool(), []);

  useEffect(() => {
    const saved = localStorage.getItem(searchStorageKey);
    setRecentSearches(saved ? JSON.parse(saved) : []);
  }, [searchStorageKey]);

  const runSearch = (term = keyword, selectedCategory = category) => {
    const kw = term.toLowerCase().trim();
    const pool = searchPool.filter(item => selectedCategory === 'Tous' || item.cat === selectedCategory);

    const filtered = kw
      ? pool.filter(item =>
          item.title.toLowerCase().includes(kw) ||
          item.description.toLowerCase().includes(kw) ||
          item.badge.toLowerCase().includes(kw)
        )
      : pool;

    setResults(filtered);

    if (kw) {
      const nextSearches = [
        { term: term.trim(), category: selectedCategory, date: new Date().toISOString() },
        ...recentSearches.filter(search => search.term.toLowerCase() !== kw),
      ].slice(0, 5);
      setRecentSearches(nextSearches);
      localStorage.setItem(searchStorageKey, JSON.stringify(nextSearches));
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    runSearch();
  };

  if (currentUser) {
    const isAdmin = currentUser.appRole === 'admin';
    const pendingUsers = users.filter(user => user.status === 'pending');
    const inactiveDevices = devices.filter(device => device.status === 'inactive');
    const lowBatteryDevices = devices.filter(device => device.battery !== null && device.battery !== undefined && device.battery < 25);
    const activeDevices = devices.filter(device => device.status === 'active');
    const totalEnergy = devices.reduce((sum, device) => sum + (device.energyConsumption > 0 ? device.energyConsumption : 0), 0).toFixed(1);

    const checks = [
      isAdmin && {
        label: 'Demandes à valider',
        value: pendingUsers.length,
        tone: pendingUsers.length ? 'warning' : 'success',
        to: '/admin',
        description: pendingUsers.length ? 'Des habitants attendent votre décision.' : 'Aucune demande en attente.',
      },
      {
        label: 'Objets inactifs',
        value: inactiveDevices.length,
        tone: inactiveDevices.length ? 'warning' : 'success',
        to: '/objets',
        description: inactiveDevices.length ? 'Certains objets sont désactivés.' : 'Tous les objets suivis sont actifs.',
      },
      {
        label: 'Batteries faibles',
        value: lowBatteryDevices.length,
        tone: lowBatteryDevices.length ? 'danger' : 'success',
        to: '/objets',
        description: lowBatteryDevices.length ? 'Une vérification batterie est recommandée.' : 'Aucune batterie critique.',
      },
    ].filter(Boolean);

    return (
      <div className="home-page">
        <section className="container section animate-fade">
          <div className="personal-home-hero">
            <div>
              <span className="badge badge-primary">{isAdmin ? 'Administrateur' : 'Habitant'}</span>
              <h1>Accueil de {currentUser.prenom}</h1>
              <p>
                {isAdmin
                  ? `Vue de contrôle de ${currentUser.maisonNom || 'votre maison'}`
                  : `Bienvenue dans ${currentUser.maisonNom || 'votre maison connectée'}`}
              </p>
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
                {canAccess('gestion') && <QuickAction to="/gestion" icon={<Settings size={18} />} title="Gestion" desc="Ajouter ou configurer des objets." />}
                {isAdmin && <QuickAction to="/admin" icon={<Shield size={18} />} title="Administration" desc="Valider les accès et gérer les membres." />}
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Vérifications</h2>
              <div className="check-list">
                {checks.map(check => (
                  <Link key={check.label} to={check.to} className={`check-row check-row--${check.tone}`}>
                    <div>
                      <strong>{check.label}</strong>
                      <p>{check.description}</p>
                    </div>
                    <span>{check.value}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-2 mb-4">
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Dernières recherches</h2>
              {recentSearches.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Aucune recherche enregistrée pour le moment.</p>
              ) : (
                <div className="recent-searches">
                  {recentSearches.map(search => (
                    <button
                      key={`${search.term}-${search.date}`}
                      type="button"
                      className="recent-search"
                      onClick={() => {
                        setKeyword(search.term);
                        setCategory(search.category);
                        runSearch(search.term, search.category);
                      }}
                    >
                      <Search size={14} aria-hidden="true" />
                      <span>{search.term}</span>
                      <small>{search.category}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Objets à surveiller</h2>
              {[...lowBatteryDevices, ...inactiveDevices].slice(0, 5).length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Aucun point particulier à surveiller.</p>
              ) : (
                <div className="quick-action-list">
                  {[...lowBatteryDevices, ...inactiveDevices].slice(0, 5).map(device => (
                    <QuickAction
                      key={device.id}
                      to={`/objets/${device.id}`}
                      icon={<Cpu size={18} />}
                      title={device.name}
                      desc={`${device.room} - ${device.status === 'inactive' ? 'Inactif' : `Batterie ${device.battery}%`}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <SearchPanel
            keyword={keyword}
            setKeyword={setKeyword}
            category={category}
            setCategory={setCategory}
            results={results}
            handleSearch={handleSearch}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1 id="hero-title">Bienvenue dans votre<br />Maison Connectée</h1>
            <p>Créez votre maison connectée, invitez vos habitants, puis validez les demandes d'accès depuis votre espace admin.</p>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <Link to="/creer-maison" className="btn btn-primary hero-cta">
                Créer ma maison <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/inscription" className="btn btn-secondary hero-cta">
                Rejoindre une maison
              </Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-house">
              <div className="house-icon-grid">
                <div className="house-icon-chip"><Thermometer size={22} /><span>22°</span></div>
                <div className="house-icon-chip"><Wifi size={22} /><span>Wi-Fi</span></div>
                <div className="house-icon-chip"><Shield size={22} /><span>Sécurisé</span></div>
                <div className="house-icon-chip"><Zap size={22} /><span>Éco</span></div>
              </div>
              <div className="house-3d-placeholder">Maison</div>
            </div>
          </div>
        </div>
      </section>

      <section className="search-section" aria-labelledby="search-title">
        <div className="container">
          <h2 id="search-title" className="section-divider">Rechercher des informations</h2>
          <SearchPanel
            keyword={keyword}
            setKeyword={setKeyword}
            category={category}
            setCategory={setCategory}
            results={results}
            handleSearch={handleSearch}
          />
        </div>
      </section>

      <section className="cta-section container" aria-labelledby="cta-title">
        <p id="cta-title">Vous avez déjà un espace maison&nbsp;?</p>
        <div className="flex gap-2" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn btn-outline">Connexion</Link>
          <Link to="/inscription" className="btn btn-primary">
            Demander l'accès <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function SearchPanel({ keyword, setKeyword, category, setCategory, results, handleSearch }) {
  return (
    <>
      <form className="search-form" onSubmit={handleSearch} role="search" aria-label="Recherche d'informations">
        <div className="search-form__controls">
          <input
            type="search"
            className="form-input"
            placeholder="Mots-clés..."
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            aria-label="Mots-clés de recherche"
          />
          <select
            className="form-select"
            value={category}
            onChange={event => setCategory(event.target.value)}
            aria-label="Catégorie"
            style={{ minWidth: 150 }}
          >
            {CATEGORIES.map(item => <option key={item}>{item}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">
            <Search size={16} aria-hidden="true" /> Rechercher
          </button>
        </div>
      </form>

      {results !== null && (
        <div className="search-results animate-fade" aria-live="polite" aria-label="Résultats de recherche">
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{results.length} résultat(s)</p>
          {results.length === 0 ? (
            <p className="search-empty">Aucun résultat pour cette recherche.</p>
          ) : (
            <div className="search-results-grid" role="list">
              {results.map(item => (
                <SearchResultCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
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
