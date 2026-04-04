import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

const ROLES = ['mère', 'père', 'enfant', 'autre'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    login: '', password: '', confirmPassword: '',
    nom: '', prenom: '', email: '',
    age: '', sexe: 'Homme', dateNaissance: '', role: 'père',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.login || !form.password || !form.nom || !form.prenom || !form.email || !form.dateNaissance) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Adresse email invalide.');
      return;
    }

    const { confirmPassword, ...data } = form;
    const result = register({ ...data, age: parseInt(data.age) || 0 });
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="container section text-center animate-fade">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Inscription envoyée !</h1>
          <div className="alert alert-success mb-3">
            Un email de validation vous a été envoyé (simulation). Votre compte sera activé après vérification par l'administrateur.
          </div>
          <Link to="/login" className="btn btn-primary">Se connecter</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section animate-fade">
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card">
          <div className="text-center mb-4">
            <UserPlus size={36} color="var(--color-primary)" aria-hidden="true" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '.5rem 0 .25rem' }}>Créer un compte</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>
              Rejoignez votre maison connectée
            </p>
          </div>

          {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate aria-label="Formulaire d'inscription">
            <div className="grid grid-2 gap-2">

              {/* Infos publiques */}
              <div className="form-group">
                <label className="form-label" htmlFor="reg-login">Pseudonyme (login) *</label>
                <input id="reg-login" name="login" type="text" className="form-input"
                  value={form.login} onChange={handleChange} required autoComplete="username" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email *</label>
                <input id="reg-email" name="email" type="email" className="form-input"
                  value={form.email} onChange={handleChange} required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-prenom">Prénom *</label>
                <input id="reg-prenom" name="prenom" type="text" className="form-input"
                  value={form.prenom} onChange={handleChange} required autoComplete="given-name" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-nom">Nom *</label>
                <input id="reg-nom" name="nom" type="text" className="form-input"
                  value={form.nom} onChange={handleChange} required autoComplete="family-name" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-age">Âge</label>
                <input id="reg-age" name="age" type="number" className="form-input" min="1" max="120"
                  value={form.age} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-sexe">Sexe / Genre</label>
                <select id="reg-sexe" name="sexe" className="form-select" value={form.sexe} onChange={handleChange}>
                  <option>Homme</option><option>Femme</option><option>Non-binaire</option><option>Préfère ne pas préciser</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-dob">Date de naissance *</label>
                <input id="reg-dob" name="dateNaissance" type="date" className="form-input"
                  value={form.dateNaissance} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-role">Rôle dans la maison</label>
                <select id="reg-role" name="role" className="form-select" value={form.role} onChange={handleChange}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Mots de passe */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="reg-pw">Mot de passe *</label>
                <input id="reg-pw" name="password" type={showPw ? 'text' : 'password'} className="form-input"
                  value={form.password} onChange={handleChange} required autoComplete="new-password" style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  style={{ position: 'absolute', right: '.75rem', top: '2.1rem', background: 'none', border: 'none', color: 'var(--color-text-muted)' }}>
                  {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
                <span className="form-hint">Minimum 8 caractères</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm">Confirmer le mot de passe *</label>
                <input id="reg-confirm" name="confirmPassword" type={showPw ? 'text' : 'password'} className="form-input"
                  value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-3" style={{ width: '100%' }}>
              <UserPlus size={16} aria-hidden="true" /> Créer mon compte
            </button>
          </form>

          <p className="text-center mt-3" style={{ fontSize: '.88rem', color: 'var(--color-text-muted)' }}>
            Déjà un compte ? <Link to="/login" style={{ color: 'var(--color-primary)' }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
