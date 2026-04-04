import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Eye, EyeOff, Home } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]   = useState({ login: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.login || !form.password) { setError('Veuillez remplir tous les champs.'); return; }
    setLoading(true);
    // Simulate async delay
    await new Promise(r => setTimeout(r, 400));
    const result = login(form.login, form.password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    } else {
      navigate('/tableau-de-bord');
    }
  };

  return (
    <div className="container section animate-fade">
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="card">
          <div className="text-center mb-4">
            <Home size={36} color="var(--color-primary)" aria-hidden="true" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '.5rem 0 .25rem' }}>Connexion</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>Accédez à votre maison connectée</p>
          </div>

          {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

          {/* Comptes de démonstration */}
          <details className="mb-3" style={{ fontSize: '.82rem', background: '#f8fafc', borderRadius: 8, padding: '.75rem 1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Comptes de démo</summary>
            <ul style={{ marginTop: '.5rem', paddingLeft: '1rem', color: 'var(--color-text-muted)' }}>
              <li><strong>admin_martin</strong> / Admin2026! — Expert (Admin)</li>
              <li><strong>jerome_m</strong> / Maison2026! — Avancé (Gestion)</li>
              <li><strong>lea_martin</strong> / Lea2026! — Intermédiaire</li>
              <li><strong>tom_m</strong> / Tom2026! — Débutant</li>
            </ul>
          </details>

          <form onSubmit={handleSubmit} noValidate aria-label="Formulaire de connexion">
            <div className="form-group mb-3">
              <label className="form-label" htmlFor="login-id">Pseudonyme</label>
              <input id="login-id" name="login" type="text" className="form-input"
                value={form.login} onChange={handleChange} required autoComplete="username" />
            </div>
            <div className="form-group mb-3" style={{ position: 'relative' }}>
              <label className="form-label" htmlFor="login-pw">Mot de passe</label>
              <input id="login-pw" name="password" type={showPw ? 'text' : 'password'} className="form-input"
                value={form.password} onChange={handleChange} required autoComplete="current-password" style={{ paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Masquer' : 'Afficher'}
                style={{ position: 'absolute', right: '.75rem', top: '2.1rem', background: 'none', border: 'none', color: 'var(--color-text-muted)' }}>
                {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
              {loading ? ' Connexion…' : ' Se connecter'}
            </button>
          </form>

          <p className="text-center mt-3" style={{ fontSize: '.88rem', color: 'var(--color-text-muted)' }}>
            Pas encore de compte ? <Link to="/inscription" style={{ color: 'var(--color-primary)' }}>S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
