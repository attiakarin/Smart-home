import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { currentUser } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container site-footer__inner">
        <div className="footer-brand">
          <Home size={18} aria-hidden="true" />
          <span>Ma Maison Connectée</span>
        </div>
        <nav aria-label="Liens du pied de page">
          <ul className="footer-links" role="list">
            <li><Link to="/">Accueil</Link></li>
            {!currentUser && <li><Link to="/inscription">Rejoindre une maison</Link></li>}
          </ul>
        </nav>
        <p className="footer-copy">© {year} Ma Maison Connectée — Projet ING1</p>
      </div>
      <style>{`
        .site-footer {
          background: #1f2937;
          color: #9ca3af;
          padding: 2.5rem 0 1.5rem;
          margin-top: auto;
        }
        .site-footer__inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          text-align: center;
        }
        .footer-brand {
          display: flex;
          align-items: center;
          gap: .4rem;
          font-weight: 700;
          font-size: 1rem;
          color: #fff;
        }
        .footer-links {
          display: flex;
          gap: 1.5rem;
          list-style: none;
          flex-wrap: wrap;
          justify-content: center;
        }
        .footer-links a {
          color: #9ca3af;
          font-size: .88rem;
          transition: color var(--transition);
        }
        .footer-links a:hover { color: #fff; }
        .footer-copy { font-size: .82rem; }
      `}</style>
    </footer>
  );
}
