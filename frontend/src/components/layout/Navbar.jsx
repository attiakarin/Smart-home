import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, Home, Menu, X, User, LogOut, Settings, LayoutDashboard, Cpu, BarChart2, Shield, Wrench, MessageSquare } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, users, logout, canAccess, pendingAdminRequests, unreadResidentReplies } = useAuth();
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
  const pendingRequests = canAccess('administration')
    ? users.filter(user => user.status === 'pending').length
    : 0;
  const totalAdminNotifications = pendingRequests + pendingAdminRequests;
  const messageNotifications = canAccess('administration') ? pendingAdminRequests : unreadResidentReplies;
  const totalNotifications = totalAdminNotifications + (!canAccess('administration') ? unreadResidentReplies : 0);

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

          {!currentUser && (
            <>
              <li><NavLink to="/catalogue-maison" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Catalogue</NavLink></li>
              <li><NavLink to="/energie" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Energie</NavLink></li>
              <li><NavLink to="/securite" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Securite</NavLink></li>
              <li><NavLink to="/login" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Connexion</NavLink></li>
              <li><NavLink to="/creer-maison" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Créer ma maison</NavLink></li>
              <li><NavLink to="/inscription" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Inscription</NavLink></li>
            </>
          )}

          {currentUser && (
            <>
              <li><NavLink to="/tableau-de-bord" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <LayoutDashboard size={15} aria-hidden="true" /> Dashboard
              </NavLink></li>
              <li><NavLink to="/objets" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <Cpu size={15} aria-hidden="true" /> Objets
              </NavLink></li>
              <li><NavLink to="/services" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <Wrench size={15} aria-hidden="true" /> Services
              </NavLink></li>
              <li><NavLink to="/demandes-admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <MessageSquare size={15} aria-hidden="true" /> Demandes
                {messageNotifications > 0 && <span className="nav-notification">{messageNotifications}</span>}
              </NavLink></li>
              {canAccess('gestion') && (
                <li><NavLink to="/gestion" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <BarChart2 size={15} aria-hidden="true" /> Gestion
                </NavLink></li>
              )}
              {canAccess('administration') && (
                <li><NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <Shield size={15} aria-hidden="true" /> Admin
                  {totalAdminNotifications > 0 && <span className="nav-notification">{totalAdminNotifications}</span>}
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
                <div className="user-avatar" style={{ borderColor: LEVEL_COLORS[currentUser.niveau], overflow: 'hidden' }}>
                  {currentUser.photo ? (
                    <img src={currentUser.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>{currentUser.prenom?.[0]}{currentUser.nom?.[0]}</>
                  )}
                </div>
                <span className="user-name">{currentUser.login}</span>
                {totalNotifications > 0 && <span className="user-notification" aria-label={`${totalNotifications} notification(s)`}>{totalNotifications}</span>}
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
                    <span>{Number(currentUser.points || 0).toFixed(2)} pts</span>
                  </div>
                  <Link to="/profil" className="dropdown-item" role="menuitem" onClick={() => setDropOpen(false)}>
                    <User size={15} aria-hidden="true" /> Mon profil
                  </Link>
                  {pendingRequests > 0 && (
                    <Link to="/admin" className="dropdown-item dropdown-item--notice" role="menuitem" onClick={() => setDropOpen(false)}>
                      <Bell size={15} aria-hidden="true" /> {pendingRequests} demande(s) d'accès
                    </Link>
                  )}
                  {pendingAdminRequests > 0 && (
                    <Link to="/demandes-admin" className="dropdown-item dropdown-item--notice" role="menuitem" onClick={() => setDropOpen(false)}>
                      <MessageSquare size={15} aria-hidden="true" /> {pendingAdminRequests} nouveau(x) message(s)
                    </Link>
                  )}
                  {unreadResidentReplies > 0 && (
                    <Link to="/demandes-admin" className="dropdown-item dropdown-item--notice" role="menuitem" onClick={() => setDropOpen(false)}>
                      <MessageSquare size={15} aria-hidden="true" /> {unreadResidentReplies} réponse(s) admin
                    </Link>
                  )}
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
          ) : null}
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
              <NavLink to="/services"        onClick={() => setMenuOpen(false)} className="mob-link">Services</NavLink>
              <NavLink to="/demandes-admin"  onClick={() => setMenuOpen(false)} className="mob-link">Demandes admin</NavLink>
              <NavLink to="/profil"          onClick={() => setMenuOpen(false)} className="mob-link">Mon profil</NavLink>
              {canAccess('gestion') && <NavLink to="/gestion" onClick={() => setMenuOpen(false)} className="mob-link">Gestion</NavLink>}
              {canAccess('administration') && <NavLink to="/admin" onClick={() => setMenuOpen(false)} className="mob-link">Administration {totalAdminNotifications > 0 ? `(${totalAdminNotifications})` : ''}</NavLink>}
              <button className="mob-link mob-link--danger" onClick={handleLogout}>Déconnexion</button>
            </>
          ) : (
            <>
              <NavLink to="/catalogue-maison" onClick={() => setMenuOpen(false)} className="mob-link">Catalogue maison</NavLink>
              <NavLink to="/energie"          onClick={() => setMenuOpen(false)} className="mob-link">Energie</NavLink>
              <NavLink to="/securite"         onClick={() => setMenuOpen(false)} className="mob-link">Securite</NavLink>
              <NavLink to="/login"       onClick={() => setMenuOpen(false)} className="mob-link">Connexion</NavLink>
              <NavLink to="/creer-maison" onClick={() => setMenuOpen(false)} className="mob-link">Créer ma maison</NavLink>
              <NavLink to="/inscription" onClick={() => setMenuOpen(false)} className="mob-link">Inscription</NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}
