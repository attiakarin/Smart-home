import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Menu, X, User, LogOut, Settings, LayoutDashboard, Cpu, BarChart2, Shield } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, logout, canAccess } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropOpen(false);
    setMenuOpen(false);
  };

  const LEVEL_COLORS = {
    débutant:      '#6b7280',
    intermédiaire: '#3b82f6',
    avancé:        '#8b5cf6',
    expert:        '#f59e0b',
  };

  return (
    <header className="navbar" role="banner">
      <nav className="navbar-inner container" aria-label="Navigation principale">
        {/* Logo */}
        <Link to="/" className="navbar-logo" aria-label="Accueil Ma Maison Connectée">
          <Home size={22} aria-hidden="true" />
          <span>Ma Maison Connectée</span>
        </Link>

        {/* Desktop nav links */}
        <ul className="navbar-links" role="list">
          <li><NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Accueil</NavLink></li>


          {currentUser && (
            <>
              <li><NavLink to="/tableau-de-bord" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <LayoutDashboard size={15} aria-hidden="true" /> Dashboard
              </NavLink></li>
              <li><NavLink to="/objets" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <Cpu size={15} aria-hidden="true" /> Objets
              </NavLink></li>
              {canAccess('gestion') && (
                <li><NavLink to="/gestion" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <BarChart2 size={15} aria-hidden="true" /> Gestion
                </NavLink></li>
              )}
              {canAccess('administration') && (
                <li><NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <Shield size={15} aria-hidden="true" /> Admin
                </NavLink></li>
              )}
            </>
          )}
        </ul>

        {/* Auth zone */}
        <div className="navbar-auth">
          {currentUser ? (
            <div className="navbar-user" role="navigation" aria-label="Menu utilisateur">
              <button
                className="user-avatar-btn"
                onClick={() => setDropOpen(o => !o)}
                aria-expanded={dropOpen}
                aria-haspopup="menu"
              >
                <div className="user-avatar" style={{ borderColor: LEVEL_COLORS[currentUser.niveau] }}>
                  {currentUser.prenom?.[0]}{currentUser.nom?.[0]}
                </div>
                <span className="user-name">{currentUser.login}</span>
              </button>

              {dropOpen && (
                <div className="user-dropdown" role="menu" aria-label="Actions utilisateur">
                  <div className="dropdown-header">
                    <strong>{currentUser.prenom} {currentUser.nom}</strong>
                    <span className="badge badge-primary" style={{ background: LEVEL_COLORS[currentUser.niveau] + '22', color: LEVEL_COLORS[currentUser.niveau] }}>
                      {currentUser.niveau}
                    </span>
                  </div>
                  <div className="dropdown-points">
                    <span>{currentUser.points.toFixed(2)} pts</span>
                  </div>
                  <Link to="/profil" className="dropdown-item" role="menuitem" onClick={() => setDropOpen(false)}>
                    <User size={15} aria-hidden="true" /> Mon profil
                  </Link>
                  {canAccess('administration') && (
                    <Link to="/admin/parametres" className="dropdown-item" role="menuitem" onClick={() => setDropOpen(false)}>
                      <Settings size={15} aria-hidden="true" /> Paramètres
                    </Link>
                  )}
                  <button className="dropdown-item dropdown-item--danger" role="menuitem" onClick={handleLogout}>
                    <LogOut size={15} aria-hidden="true" /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth-btns">
              <Link to="/login"       className="btn btn-ghost btn-sm">Connexion</Link>
              <Link to="/inscription" className="btn btn-secondary btn-sm">Inscription</Link>
            </div>
          )}
        </div>

        {/* Burger mobile */}
        <button
          className="navbar-burger"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div id="mobile-menu" className="mobile-menu" role="navigation" aria-label="Menu mobile">
          <NavLink to="/"           end onClick={() => setMenuOpen(false)} className="mob-link">Accueil</NavLink>

          {currentUser ? (
            <>
              <NavLink to="/tableau-de-bord" onClick={() => setMenuOpen(false)} className="mob-link">Dashboard</NavLink>
              <NavLink to="/objets"          onClick={() => setMenuOpen(false)} className="mob-link">Objets connectés</NavLink>
              <NavLink to="/profil"          onClick={() => setMenuOpen(false)} className="mob-link">Mon profil</NavLink>
              {canAccess('gestion') && <NavLink to="/gestion" onClick={() => setMenuOpen(false)} className="mob-link">Gestion</NavLink>}
              {canAccess('administration') && <NavLink to="/admin" onClick={() => setMenuOpen(false)} className="mob-link">Administration</NavLink>}
              <button className="mob-link mob-link--danger" onClick={handleLogout}>Déconnexion</button>
            </>
          ) : (
            <>
              <NavLink to="/login"       onClick={() => setMenuOpen(false)} className="mob-link">Connexion</NavLink>
              <NavLink to="/inscription" onClick={() => setMenuOpen(false)} className="mob-link">Inscription</NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}
