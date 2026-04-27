import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
import { LEVELS } from '../../data/mockData';

export default function ProfilePage() {
  const { currentUser, updateUser, computeLevel, users } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [form, setForm] = useState({
    login: currentUser.login,
    prenom: currentUser.prenom,
    nom: currentUser.nom,
    age: currentUser.age,
    sexe: currentUser.sexe,
    dateNaissance: currentUser.dateNaissance,
    role: currentUser.role,
    password: '',
    photo: currentUser.photo,
  });
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');

  const levelColors = { débutant:'#6b7280', intermédiaire:'#3b82f6', avancé:'#8b5cf6', expert:'#f59e0b' };
  const nextLevels  = { débutant:'intermédiaire', intermédiaire:'avancé', avancé:'expert', expert:null };
  const nextLvl     = nextLevels[currentUser.niveau];
  const nextPts     = nextLvl ? LEVELS[nextLvl].points : null;
  const progress    = nextPts ? Math.min(100, (currentUser.points / nextPts) * 100).toFixed(0) : 100;

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = (e) => {
    e.preventDefault();
    setError('');
    if (form.password && form.password.length < 8) {
      setError('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    // Check login uniqueness
    const conflict = users.find(u => u.login === form.login && u.id !== currentUser.id);
    if (conflict) { setError('Ce login est déjà utilisé.'); return; }

    const updates = {
      login: form.login,
      prenom: form.prenom,
      nom: form.nom,
      age: parseInt(form.age) || 0,
      sexe: form.sexe,
      dateNaissance: form.dateNaissance,
      role: form.role,
    };
    if (form.password) updates.password = form.password;
    updateUser(currentUser.id, updates);
    setSuccess('Profil mis à jour avec succès !');
    setEditing(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Try to upgrade level
  const handleLevelUp = () => {
    if (!nextLvl) return;
    if (currentUser.points >= LEVELS[nextLvl].points) {
      updateUser(currentUser.id, { niveau: nextLvl });
      setSuccess(`Félicitations ! Vous avez atteint le niveau ${nextLvl} !`);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  return (
    <div className="container section animate-fade">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 className="section-title">Mon Profil</h1>

        {success && <div className="alert alert-success mb-3" role="status">{success}</div>}
        {error   && <div className="alert alert-error mb-3"   role="alert">{error}</div>}

        {/* Avatar + infos publiques */}
        <div className="card mb-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: levelColors[currentUser.niveau],
              color: '#fff', fontSize: '1.8rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `3px solid ${levelColors[currentUser.niveau]}`,
            }} aria-label="Avatar utilisateur">
              {currentUser.prenom?.[0]}{currentUser.nom?.[0]}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currentUser.prenom} {currentUser.nom}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>@{currentUser.login}</p>
              <span className="badge mt-1" style={{ background: levelColors[currentUser.niveau] + '22', color: levelColors[currentUser.niveau] }}>
                {currentUser.niveau}
              </span>
            </div>
            {!editing && (
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Modifier
              </button>
            )}
          </div>

          {/* Profil public */}
          {!editing ? (
            <dl className="profile-dl">
              <div><dt>Pseudonyme</dt><dd>@{currentUser.login}</dd></div>
              <div><dt>Rôle</dt><dd style={{ textTransform: 'capitalize' }}>{currentUser.role}</dd></div>
              <div><dt>Âge</dt><dd>{currentUser.age} ans</dd></div>
              <div><dt>Sexe</dt><dd>{currentUser.sexe}</dd></div>
              <div><dt>Date de naissance</dt><dd>{currentUser.dateNaissance}</dd></div>
              <div><dt>Connexions</dt><dd>{currentUser.connexions}</dd></div>
              <div><dt>Actions</dt><dd>{currentUser.actions}</dd></div>
            </dl>
          ) : (
            <form onSubmit={handleSave} noValidate>
              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-login">Pseudonyme</label>
                  <input id="p-login" name="login" className="form-input" value={form.login} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-role">Rôle</label>
                  <select id="p-role" name="role" className="form-select" value={form.role} onChange={handleChange}>
                    {['mère','père','enfant','autre'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-prenom">Prénom</label>
                  <input id="p-prenom" name="prenom" className="form-input" value={form.prenom} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-nom">Nom</label>
                  <input id="p-nom" name="nom" className="form-input" value={form.nom} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-age">Âge</label>
                  <input id="p-age" name="age" type="number" className="form-input" value={form.age} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-sexe">Sexe</label>
                  <select id="p-sexe" name="sexe" className="form-select" value={form.sexe} onChange={handleChange}>
                    <option>Homme</option><option>Femme</option><option>Non-binaire</option><option>Préfère ne pas préciser</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-dob">Date de naissance</label>
                  <input id="p-dob" name="dateNaissance" type="date" className="form-input" value={form.dateNaissance} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label" htmlFor="p-pw">Nouveau mot de passe</label>
                  <input id="p-pw" name="password" type={showPw ? 'text' : 'password'} className="form-input"
                    value={form.password} onChange={handleChange} placeholder="Laisser vide = inchangé" style={{ paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Masquer' : 'Afficher'}
                    style={{ position: 'absolute', right: '.75rem', top: '2.1rem', background: 'none', border: 'none', color: 'var(--color-text-muted)' }}>
                    {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary btn-sm"><Save size={14} /> Sauvegarder</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setError(''); }}>
                  <X size={14} /> Annuler
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Level progress */}
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Progression de niveau</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem', fontSize: '.88rem' }}>
            <span>Points : <strong>{Number(currentUser.points || 0).toFixed(2)}</strong></span>
            {nextLvl && <span>Prochain niveau ({nextLvl}) : <strong>{nextPts} pts</strong></span>}
          </div>
          <div style={{ height: 10, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: levelColors[currentUser.niveau], borderRadius: 999, transition: 'width .6s ease' }}
              role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Progression vers le niveau suivant" />
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {Object.entries(LEVELS).map(([key, val]) => (
              <div key={key} style={{ textAlign: 'center', opacity: currentUser.niveau === key ? 1 : .4 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: levelColors[key], margin: '0 auto .25rem' }} aria-hidden="true" />
                <span style={{ fontSize: '.75rem', fontWeight: 600, color: levelColors[key] }}>{val.label}</span>
                <div style={{ fontSize: '.7rem', color: 'var(--color-text-muted)' }}>{val.points} pts</div>
              </div>
            ))}
          </div>
          {nextLvl && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleLevelUp}
              disabled={currentUser.points < LEVELS[nextLvl].points}
              title={currentUser.points < LEVELS[nextLvl].points ? `Il vous manque ${(LEVELS[nextLvl].points - currentUser.points).toFixed(2)} pts` : ''}
            >
              Passer au niveau {nextLvl}
            </button>
          )}
          {!nextLvl && <p className="badge badge-warning">Vous avez atteint le niveau maximum !</p>}
        </div>

        <style>{`
          .profile-dl { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
          .profile-dl > div { display: flex; flex-direction: column; }
          .profile-dl dt { font-size: .78rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
          .profile-dl dd { font-size: .95rem; font-weight: 600; }
          @media(max-width:480px){ .profile-dl { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    </div>
  );
}
