import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Edit3, Check, X } from 'lucide-react';
import { LEVEL_OPTIONS, LEVEL_POINTS, formatDateTime } from '../../constants/smartHome';


export default function AdminUsers() {
  const levelOptions = LEVEL_OPTIONS;
  const levelPoints = LEVEL_POINTS;
  const appRoles = [
    { value: 'habitant', label: 'Habitant' },
    { value: 'admin', label: 'Administrateur' },
  ];
  const { users, updateUser, deleteUser, createUser } = useAuth();
  const [filter, setFilter]     = useState('all');
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const initialAddForm = {
    login: '',
    prenom: '',
    nom: '',
    email: '',
    password: '',
    role: 'enfant',
    sexe: '-',
    dateNaissance: '',
    niveau: 'Débutant',
    rolee: 'habitant',
    points: 0,
  };
  const [addForm, setAddForm]   = useState(initialAddForm);
  const [addError, setAddError] = useState('');
  const [saved, setSaved]       = useState('');

  const filtered = users.filter(u =>
    filter === 'all' ? true : filter === 'pending' ? u.status === 'pending' : u.status === 'approved'
  );

  const startEdit = (u) => {
    setEditId(u.id);
    setEditForm({ niveau: u.niveau, role: u.role, rolee: u.appRole || 'habitant', points: u.points, status: u.status });
  };

  const saveEdit = async (id) => {
    try {
      const nextNiveau = editForm.rolee === 'admin' ? 'Expert' : editForm.niveau;
      await updateUser(id, {
        niveau: nextNiveau,
        role: editForm.role,
        rolee: editForm.rolee,
        points: levelPoints[nextNiveau] ?? 0,
        status: editForm.status,
      });
      setEditId(null);
      setSaved('Utilisateur mis à jour.');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setSaved('');
      setAddError(err.message || 'Impossible de modifier cet utilisateur.');
    }
  };

  const handleApprove = (user) => updateUser(user.id, {
    status: 'approved',
    niveau: user.niveau || 'Débutant',
    rolee: user.appRole || 'habitant',
    points: user.points || 0,
  });
  const handleReject = async (id) => {
    try {
      await updateUser(id, { status: 'rejected' });
    } catch (err) {
      setAddError(err.message || 'Impossible de rejeter cet utilisateur.');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.login || !addForm.email || !addForm.password || !addForm.nom || !addForm.prenom) {
      setAddError('Pseudonyme, prénom, nom, email et mot de passe sont obligatoires.');
      return;
    }
    try {
      const rolee = addForm.rolee;
      const niveau = rolee === 'admin' ? 'Expert' : addForm.niveau;
      await createUser({
        ...addForm,
        rolee,
        niveau,
        points: rolee === 'admin' ? levelPoints.Expert : (Number(addForm.points) || levelPoints[niveau] || 0),
        status: 'approved',
        photo: null,
      });
      setShowAdd(false);
      setAddForm(initialAddForm);
      setSaved('Utilisateur créé et approuvé !');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setAddError(err.message || 'Impossible de créer cet utilisateur.');
    }
  };

  return (
    <div className="container section animate-fade">
      <Link to="/admin" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour admin</Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Gestion des Utilisateurs</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}><UserPlus size={15} /> Ajouter</button>
      </div>

      {saved && <div className="alert alert-success mb-3" role="status">{saved}</div>}
      {addError && !showAdd && <div className="alert alert-error mb-3" role="alert">{addError}</div>}

      {/* Add form */}
      {showAdd && (
        <div className="card mb-4 animate-fade">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Nouvel utilisateur</h2>
          {addError && <div className="alert alert-error mb-2" role="alert">{addError}</div>}
          <form onSubmit={handleAdd} noValidate>
            <div className="grid grid-3 gap-2">
              {[['login','Pseudonyme'],['prenom','Prénom'],['nom','Nom'],['email','Email'],['password','Mot de passe']].map(([f, l]) => (
                <div key={f} className="form-group">
                  <label className="form-label" htmlFor={`au-${f}`}>{l} *</label>
                  <input id={`au-${f}`} type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'}
                    className="form-input" value={addForm[f]} onChange={e => setAddForm(p => ({ ...p, [f]: e.target.value }))} required />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label" htmlFor="au-role">Rôle dans la maison</label>
                <select id="au-role" className="form-select" value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="enfant">Enfant</option>
                  <option value="mère">Mère</option>
                  <option value="père">Père</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="au-sexe">Genre</label>
                <select id="au-sexe" className="form-select" value={addForm.sexe} onChange={e => setAddForm(p => ({ ...p, sexe: e.target.value }))}>
                  <option value="-">Non précisé</option>
                  <option value="F">Femme</option>
                  <option value="H">Homme</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="au-date-naissance">Date de naissance</label>
                <input id="au-date-naissance" type="date" className="form-input" value={addForm.dateNaissance} max={new Date().toISOString().slice(0, 10)} onChange={e => setAddForm(p => ({ ...p, dateNaissance: e.target.value }))} />
                <span className="form-hint">Un administrateur peut ajouter un enfant de sa maison.</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="au-droits">Droits</label>
                <select id="au-droits" className="form-select" value={addForm.rolee} onChange={e => setAddForm(p => ({ ...p, rolee: e.target.value, niveau: e.target.value === 'admin' ? 'Expert' : p.niveau }))}>
                  {appRoles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="au-niveau">Niveau</label>
                <select id="au-niveau" className="form-select" value={addForm.niveau} onChange={e => setAddForm(p => ({ ...p, niveau: e.target.value, points: levelPoints[e.target.value] || 0 }))} disabled={addForm.rolee === 'admin'}>
                  {levelOptions.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="au-points">Points</label>
                <input id="au-points" type="number" step="0.25" min="0" className="form-input" value={addForm.rolee === 'admin' ? levelPoints.Expert : addForm.points} onChange={e => setAddForm(p => ({ ...p, points: e.target.value }))} disabled={addForm.rolee === 'admin'} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" className="btn btn-primary btn-sm">Créer</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-2 mb-3">
        {[['all','Tous'],['approved','Approuvés'],['pending','En attente']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="table-wrapper card" style={{ padding: 0 }}>
        <table className="table" aria-label="Gestion des utilisateurs" role="table">
          <thead>
            <tr>
              <th scope="col">Login</th>
              <th scope="col">Nom</th>
              <th scope="col">Email</th>
              <th scope="col">Niveau</th>
              <th scope="col">Droits</th>
              <th scope="col">Points</th>
              <th scope="col">Dernière connexion</th>
              <th scope="col">Statut</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>@{u.login}</td>
                <td>{u.prenom} {u.nom}</td>
                <td style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>{u.email}</td>
                <td>
                  {editId === u.id ? (
                    <select className="form-select" style={{ padding: '.2rem .5rem', fontSize: '.85rem' }}
                      value={editForm.niveau} onChange={e => setEditForm(f => ({
                        ...f,
                        niveau: e.target.value,
                        points: levelPoints[e.target.value] ?? 0,
                      }))}>
                      {levelOptions.map(l => <option key={l}>{l}</option>)}
                    </select>
                  ) : (
                    <span className="badge badge-primary">{u.niveau}</span>
                  )}
                </td>
                <td>
                  {editId === u.id ? (
                    <select className="form-select" style={{ padding: '.2rem .5rem', fontSize: '.85rem' }}
                      value={editForm.rolee} onChange={e => setEditForm(f => ({
                        ...f,
                        rolee: e.target.value,
                        niveau: e.target.value === 'admin' ? 'Expert' : f.niveau,
                        points: e.target.value === 'admin' ? levelPoints.Expert : (levelPoints[f.niveau] ?? f.points),
                      }))}>
                      {appRoles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  ) : (
                    <span className="badge badge-gray">{u.appRole === 'admin' ? 'Administrateur' : 'Habitant'}</span>
                  )}
                </td>
                <td>
                  {editId === u.id ? (
                    <input type="number" step="0.25" className="form-input" style={{ width: 80, padding: '.2rem .5rem', fontSize: '.85rem' }}
                      value={editForm.points} onChange={e => setEditForm(f => ({ ...f, points: e.target.value }))} />
                  ) : Number(u.points || 0).toFixed(2)}
                </td>
                <td style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>
                  {formatDateTime(u.lastLogin)}
                </td>
                <td>
                  <span className={`badge ${u.status === 'approved' ? 'badge-success' : u.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                    {u.status === 'approved' ? 'Approuvé' : u.status === 'pending' ? 'En attente' : 'Rejeté'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                    {u.status === 'pending' && <>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleApprove(u)} aria-label={`Approuver ${u.login}`}><Check size={13} /></button>
                      <button className="btn btn-sm btn-danger"    onClick={() => handleReject(u.id)}  aria-label={`Rejeter ${u.login}`}><X size={13} /></button>
                    </>}
                    {editId === u.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => saveEdit(u.id)} aria-label="Sauvegarder"><Check size={13} /></button>
                        <button className="btn btn-sm btn-ghost"   onClick={() => setEditId(null)} aria-label="Annuler"><X size={13} /></button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-outline" onClick={() => startEdit(u)} aria-label={`Modifier ${u.login}`}><Edit3 size={13} /></button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(u.id)} aria-label={`Supprimer ${u.login}`}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="del-usr-title">
          <div className="modal">
            <div className="modal-header">
              <h2 id="del-usr-title" style={{ fontSize: '1rem' }}>Supprimer l'utilisateur ?</h2>
            </div>
            <div className="modal-body">
              <p>Cette action est irréversible.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={async () => { try { await deleteUser(deleteId); setDeleteId(null); setSaved('Utilisateur supprimé.'); setTimeout(() => setSaved(''), 2500); } catch (err) { setDeleteId(null); setAddError(err.message || 'Impossible de supprimer cet utilisateur.'); } }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
