import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Edit3, Check, X } from 'lucide-react';

const LEVELS = ['débutant', 'intermédiaire', 'avancé', 'expert'];
const LEVEL_PTS = { débutant: 0, intermédiaire: 5, avancé: 15, expert: 30 };

export default function AdminUsers() {
  const { users, updateUser, deleteUser, register } = useAuth();
  const [filter, setFilter]     = useState('all');
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ login:'', prenom:'', nom:'', email:'', password:'', role:'père', niveau:'débutant' });
  const [addError, setAddError] = useState('');
  const [saved, setSaved]       = useState('');

  const filtered = users.filter(u =>
    filter === 'all' ? true : filter === 'pending' ? u.status === 'pending' : u.status === 'approved'
  );

  const startEdit = (u) => {
    setEditId(u.id);
    setEditForm({ niveau: u.niveau, role: u.role, points: u.points, status: u.status });
  };

  const saveEdit = (id) => {
    updateUser(id, {
      niveau: editForm.niveau,
      role: editForm.role,
      points: parseFloat(editForm.points) || 0,
      status: editForm.status,
    });
    setEditId(null);
    setSaved('Utilisateur mis à jour !');
    setTimeout(() => setSaved(''), 2500);
  };

  const handleApprove = (id) => updateUser(id, { status: 'approved' });
  const handleReject  = (id) => updateUser(id, { status: 'rejected' });

  const handleAdd = (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.login || !addForm.email || !addForm.password) { setAddError('Champs obligatoires manquants.'); return; }
    const res = register({ ...addForm, age: 0, sexe: 'Homme', dateNaissance: '', photo: null });
    if (!res.success) { setAddError(res.error); return; }
    // Auto-approve admin-created users
    const newU = users[users.length - 1];
    if (newU) updateUser(newU.id, { status: 'approved', niveau: addForm.niveau, points: LEVEL_PTS[addForm.niveau] });
    setShowAdd(false);
    setAddForm({ login:'', prenom:'', nom:'', email:'', password:'', role:'père', niveau:'débutant' });
    setSaved('Utilisateur créé et approuvé !');
    setTimeout(() => setSaved(''), 2500);
  };

  return (
    <div className="container section animate-fade">
      <Link to="/admin" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour admin</Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Gestion des Utilisateurs</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}><UserPlus size={15} /> Ajouter</button>
      </div>

      {saved && <div className="alert alert-success mb-3" role="status">{saved}</div>}

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
                <label className="form-label" htmlFor="au-niveau">Niveau</label>
                <select id="au-niveau" className="form-select" value={addForm.niveau} onChange={e => setAddForm(p => ({ ...p, niveau: e.target.value }))}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
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
              <th scope="col">Points</th>
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
                      value={editForm.niveau} onChange={e => setEditForm(f => ({ ...f, niveau: e.target.value }))}>
                      {LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  ) : (
                    <span className="badge badge-primary">{u.niveau}</span>
                  )}
                </td>
                <td>
                  {editId === u.id ? (
                    <input type="number" step="0.25" className="form-input" style={{ width: 80, padding: '.2rem .5rem', fontSize: '.85rem' }}
                      value={editForm.points} onChange={e => setEditForm(f => ({ ...f, points: e.target.value }))} />
                  ) : u.points.toFixed(2)}
                </td>
                <td>
                  <span className={`badge ${u.status === 'approved' ? 'badge-success' : u.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                    {u.status === 'approved' ? 'Approuvé' : u.status === 'pending' ? 'En attente' : 'Rejeté'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                    {u.status === 'pending' && <>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleApprove(u.id)} aria-label={`Approuver ${u.login}`}><Check size={13} /></button>
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
              <button className="btn btn-danger" onClick={() => { deleteUser(deleteId); setDeleteId(null); }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
