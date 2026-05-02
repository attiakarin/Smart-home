import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function getAdultMaxBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return formatDateInput(date);
}


function calculateAge(dateValue) {
  if (!dateValue) return null;
  const birthDate = new Date(dateValue);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}



export default function CreateHousePage() {
  const { createHouse, loading } = useAuth();
  const [form, setForm] = useState({
    houseName: '',
    login: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    email: '',
    sexe: 'Homme',
    dateNaissance: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const maxBirthDate = getAdultMaxBirthDate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm(previous => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.houseName || !form.login || !form.password || !form.nom || !form.prenom || !form.email) {
      setError('Veuillez remplir les champs obligatoires.');
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

    if (calculateAge(form.dateNaissance) < 18) {
      setError('Vous devez avoir au moins 18 ans pour créer une maison.');
      return;
    }

    const genreMap = { Homme: 'H', Femme: 'F', 'Non-binaire': '-', 'Préfère ne pas préciser': '-' };
    const { confirmPassword, ...data } = form;
    const result = await createHouse({
      ...data,
      sexe: genreMap[data.sexe] || '-',
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    setCreated(result.house);
  };

  if (created) {
    return (
      <div className="container section animate-fade">
        <div className="auth-shell">
          <div className="card auth-card">
            <ShieldCheck size={40} color="var(--color-secondary)" aria-hidden="true" />
            <h1>Maison créée</h1>
            <p className="auth-muted">Votre compte administrateur est actif. Partagez ce code avec les habitants que vous voulez inviter.</p>
            <div className="access-code-box" aria-label="Code d'accès maison">
              <KeyRound size={18} aria-hidden="true" />
              <strong>{created.code_acces}</strong>
            </div>
            <Link to="/login" className="btn btn-primary">Se connecter</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container section animate-fade">
      <div className="auth-shell">
        <div className="card auth-card">
          <Home size={38} color="var(--color-primary)" aria-hidden="true" />
          <h1>Créer ma maison</h1>
          <p className="auth-muted">Créez votre espace maison. Vous deviendrez automatiquement administrateur.</p>

          {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-2 gap-2">
              <div className="form-group">
                <label className="form-label" htmlFor="house-name">Nom de la maison *</label>
                <input id="house-name" name="houseName" className="form-input" value={form.houseName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="house-login">Pseudonyme admin *</label>
                <input id="house-login" name="login" className="form-input" value={form.login} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="house-prenom">Prénom *</label>
                <input id="house-prenom" name="prenom" className="form-input" value={form.prenom} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="house-nom">Nom *</label>
                <input id="house-nom" name="nom" className="form-input" value={form.nom} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="house-email">Email *</label>
                <input id="house-email" name="email" type="email" className="form-input" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="house-sexe">Sexe / Genre</label>
                <select id="house-sexe" name="sexe" className="form-select" value={form.sexe} onChange={handleChange}>
                  <option>Homme</option><option>Femme</option><option>Non-binaire</option><option>Préfère ne pas préciser</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="house-dob">Date de naissance</label>
                <input id="house-dob" name="dateNaissance" type="date" className="form-input" value={form.dateNaissance} onChange={handleChange} max={maxBirthDate} />
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="house-password">Mot de passe *</label>
                <input id="house-password" name="password" type={showPw ? 'text' : 'password'} className="form-input" value={form.password} onChange={handleChange} required style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPw(value => !value)} aria-label={showPw ? 'Masquer' : 'Afficher'} className="password-eye">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="house-confirm">Confirmer le mot de passe *</label>
                <input id="house-confirm" name="confirmPassword" type={showPw ? 'text' : 'password'} className="form-input" value={form.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-3" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Création en cours...' : 'Créer ma maison'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
