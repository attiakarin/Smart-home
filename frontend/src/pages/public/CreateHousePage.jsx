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
  const [step, setStep] = useState(1);
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
    housingType: 'maison',
    nbPieces: 4,
    budgetKwh: 250,
  });
  const [pieces, setPieces] = useState(['Salon', 'Cuisine', 'Chambre', 'Salle de bain']);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const maxBirthDate = getAdultMaxBirthDate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'nbPieces') {
      const count = Math.max(1, Number(value || 1));
      setPieces(previous => Array.from({ length: count }, (_, index) => previous[index] || `Pièce ${index + 1}`));
    }
    setForm(previous => ({ ...previous, [name]: value }));
  };

  const validateAccountStep = () => {
    if (!form.houseName || !form.login || !form.password || !form.nom || !form.prenom || !form.email) {
      return 'Veuillez remplir les champs obligatoires.';
    }
    if (form.password !== form.confirmPassword) return 'Les mots de passe ne correspondent pas.';
    if (form.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (calculateAge(form.dateNaissance) < 18) return 'Vous devez avoir au moins 18 ans pour créer une maison.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (step === 1) {
      const message = validateAccountStep();
      if (message) {
        setError(message);
        return;
      }
      setStep(2);
      return;
    }

    const message = validateAccountStep();
    if (message) {
      setError(message);
      setStep(1);
      return;
    }

    const genreMap = { Homme: 'H', Femme: 'F', 'Non-binaire': '-', 'Préfère ne pas préciser': '-' };
    const { confirmPassword, ...data } = form;
    const result = await createHouse({
      ...data,
      sexe: genreMap[data.sexe] || '-',
      nbPieces: Number(data.nbPieces || 1),
      budgetKwh: Number(data.budgetKwh || 0),
      pieces: pieces.map(piece => piece.trim()).filter(Boolean),
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
            <div className="access-code-box" aria-label="Code d’accès maison">
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
          <p className="auth-muted">
            {step === 1
              ? 'Créez votre compte administrateur.'
              : 'Configurez votre logement, ses pièces et son seuil mensuel de consommation.'}
          </p>

          {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {step === 1 ? (
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
            ) : (
              <>
                <div className="alert alert-info mb-3" role="status">
                  Si le seuil est dépassé, le mode maintenance sera activé automatiquement et l’admin sera prévenu.
                </div>
                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="housing-type">Type de logement</label>
                    <select id="housing-type" name="housingType" className="form-select" value={form.housingType} onChange={handleChange}>
                      <option value="maison">Maison</option>
                      <option value="appartement">Appartement</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="nb-pieces">Nombre de pièces</label>
                    <input id="nb-pieces" name="nbPieces" type="number" min="1" max="30" className="form-input" value={form.nbPieces} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" htmlFor="budget-kwh">Consommation mensuelle à ne pas dépasser (kWh)</label>
                    <input id="budget-kwh" name="budgetKwh" type="number" min="0" step="0.1" className="form-input" value={form.budgetKwh} onChange={handleChange} />
                  </div>
                </div>
                <div className="grid grid-2 gap-2 mt-2">
                  {pieces.map((piece, index) => (
                    <div className="form-group" key={index}>
                      <label className="form-label" htmlFor={`piece-${index}`}>Pièce {index + 1}</label>
                      <input
                        id={`piece-${index}`}
                        className="form-input"
                        value={piece}
                        onChange={event => setPieces(previous => previous.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2 mt-3">
              {step === 2 && <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Retour</button>}
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {step === 1 ? 'Continuer' : loading ? 'Création en cours…' : 'Créer ma maison'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
