import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Wifi, Thermometer, Shield, Zap } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const [keyword, setKeyword]    = useState('');
  const [results, setResults]    = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    setResults([]);
  };

  return (
    <div className="home-page">
      {/* ── HERO ────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1 id="hero-title">Bienvenue dans votre<br />Maison Connectée</h1>
            <p>Découvrez comment simplifier et automatiser votre maison&nbsp;!</p>
            <Link to="/inscription" className="btn btn-secondary hero-cta">
              Découvrir <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-house">
              <div className="house-icon-grid">
                <div className="house-icon-chip"><Thermometer size={22} /><span>22°</span></div>
                <div className="house-icon-chip"><Wifi size={22} /><span>Wi-Fi</span></div>
                <div className="house-icon-chip"><Shield size={22} /><span>Sécurisé</span></div>
                <div className="house-icon-chip"><Zap size={22} /><span>Éco</span></div>
              </div>
              <div className="house-3d-placeholder">🏠</div>
            </div>
          </div>
        </div>
      </section>



      {/* ── SEARCH SECTION ──────────────────────────────── */}
      <section className="search-section" aria-labelledby="search-title">
        <div className="container">
          <h2 id="search-title" className="section-divider">Rechercher des Informations</h2>
          <form className="search-form" onSubmit={handleSearch} role="search" aria-label="Recherche d'informations">
            <div className="search-form__controls">
              <input
                type="search"
                className="form-input"
                placeholder="Mots-clés…"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                aria-label="Mots-clés de recherche"
              />
              <button type="submit" className="btn btn-primary">
                <Search size={16} aria-hidden="true" /> Rechercher
              </button>
            </div>
          </form>

          {/* Résultats */}
          {results !== null && (
            <div className="search-results animate-fade" aria-live="polite" aria-label="Résultats de recherche">
              {results.length === 0 ? (
                <p className="search-empty">Aucun résultat pour cette recherche.</p>
              ) : (
                <div className="search-results-grid">
                  {results.map(item => (
                    <SearchResultCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA INSCRIPTION ─────────────────────────────── */}
      <section className="cta-section container" aria-labelledby="cta-title">
        <p id="cta-title">Envie de rejoindre la plateforme&nbsp;?</p>
        <Link to="/inscription" className="btn btn-primary">
          Inscrivez-vous <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}


