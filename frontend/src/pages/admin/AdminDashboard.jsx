import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DevicesContext';
import { Users, Cpu, Settings, BarChart2, Shield, AlertTriangle, Check, X, KeyRound, MessageSquare } from 'lucide-react';
import { formatDateTime } from '../../constants/smartHome';

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
const LEVEL_POINTS = { Débutant: 0, Intermédiaire: 25, Avancé: 50, Expert: 75 };
const APP_ROLES = [
  { value: 'habitant', label: 'Habitant' },
  { value: 'admin', label: 'Administrateur' },
];

function getStatusBadge(status) {
  if (status === 'approved') return { className: 'badge-success', label: 'Approuvé' };
  if (status === 'rejected') return { className: 'badge-danger', label: 'Rejeté' };
  return { className: 'badge-warning', label: 'En attente' };
}

export default function AdminDashboard() {
  const { users, currentUser, updateUser, deleteUser, adminRequests, pendingAdminRequests, houseConsumption }   = useAuth();
  const { devices } = useDevices();
  const [rightsByUser, setRightsByUser] = useState({});

  const pendingUsers = users.filter(u => u.status === 'pending');
  const pending  = pendingUsers.length;
  const approved = users.filter(u => u.status === 'approved').length;
  const lowBatt  = devices.filter(d => d.battery !== null && d.battery !== undefined && d.battery < 25).length;
  const inProgressRequests = adminRequests.filter(request => request.status === 'en_cours').length;
  const consumptionExceeded = Boolean(houseConsumption?.exceeded);

  const cards = [
    { to: '/admin/utilisateurs', icon: <Users size={28} />, label: 'Gestion Utilisateurs', value: `${approved} actifs`, extra: pending ? `${pending} en attente` : null, color: '#dbeafe', tc: '#1a73e8' },
    { to: '/admin/objets',       icon: <Cpu size={28} />,   label: 'Gestion Objets',       value: `${devices.length} objets`, extra: lowBatt ? `${lowBatt} batterie faible` : null, color: '#d1fae5', tc: '#22c55e' },
    { to: '/admin/consommation', icon: <AlertTriangle size={28} />, label: 'Dépassements conso', value: consumptionExceeded ? 'Alerte active' : 'Historique', extra: houseConsumption ? `${Number(houseConsumption.consumptionKwh || 0).toFixed(1)} kWh` : null, color: '#fee2e2', tc: '#ef4444' },
    { to: '/demandes-admin',     icon: <MessageSquare size={28} />, label: 'Demandes habitants', value: `${pendingAdminRequests} nouvelle(s)`, extra: inProgressRequests ? `${inProgressRequests} en cours` : null, color: '#fce7f3', tc: '#db2777' },
    { to: '/gestion/rapports',   icon: <BarChart2 size={28} />, label: 'Rapports',           value: 'Statistiques',     extra: null, color: '#fef3c7', tc: '#f59e0b' },
    { to: '/admin/parametres',   icon: <Settings size={28} />,  label: 'Paramètres',         value: 'Plateforme',       extra: null, color: '#ede9fe', tc: '#8b5cf6' },
  ];

  const getRights = (user) => ({
    niveau: user.niveau || 'Débutant',
    rolee: user.appRole || 'habitant',
    ...(rightsByUser[user.id] || {}),
  });

  const updateRights = (userId, patch) => {
    setRightsByUser(previous => ({
      ...previous,
      [userId]: { ...previous[userId], ...patch },
    }));
  };

  const approveUser = (user) => {
    const rights = getRights(user);
    const niveau = rights.rolee === 'admin' ? 'Expert' : rights.niveau;
    updateUser(user.id, {
      status: 'approved',
      niveau,
      rolee: rights.rolee,
      points: LEVEL_POINTS[niveau] ?? user.points ?? 0,
    });
  };

  return (
    <div className="container section animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '2rem' }}>
        <Shield size={28} color="var(--color-primary)" aria-hidden="true" />
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Administration</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Panneau de contrôle global de la plateforme</p>
        </div>
      </div>

      {pending > 0 && (
        <div className="alert alert-warning mb-4" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          {pending} inscription(s) en attente de validation. <Link to="/admin/utilisateurs" style={{ fontWeight: 700 }}>Voir →</Link>
        </div>
      )}

      {currentUser?.maisonCode && (
        <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Code d'accès de la maison</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>Partagez ce code avec les personnes que vous voulez inviter.</p>
          </div>
          <div className="access-code-box">
            <KeyRound size={18} aria-hidden="true" />
            <strong>{currentUser.maisonCode}</strong>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Demandes d'accès</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>Validez les personnes qui souhaitent entrer dans votre maison.</p>
          </div>
          <span className={`badge ${pending ? 'badge-warning' : 'badge-success'}`}>{pending} en attente</span>
        </div>

        {pendingUsers.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>Aucune demande en attente.</p>
        ) : (
          <div className="table-wrapper" style={{ padding: 0 }}>
            <table className="table" aria-label="Demandes d'accès à la maison">
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Niveau</th>
                  <th>Droits</th>
                  <th>Décision</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(user => (
                  <tr key={user.id}>
                    <td><strong>{user.prenom} {user.nom}</strong><br /><span style={{ color: 'var(--color-text-muted)', fontSize: '.8rem' }}>@{user.login}</span></td>
                    <td>{user.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{user.role}</td>
                    <td>
                      <select
                        className="form-select"
                        value={getRights(user).niveau}
                        onChange={event => updateRights(user.id, {
                          niveau: event.target.value,
                          points: LEVEL_POINTS[event.target.value] ?? 0,
                        })}
                        disabled={getRights(user).rolee === 'admin'}
                        style={{ minWidth: 150 }}
                      >
                        {LEVELS.map(level => <option key={level}>{level}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={getRights(user).rolee}
                        onChange={event => updateRights(user.id, {
                          rolee: event.target.value,
                          niveau: event.target.value === 'admin' ? 'Expert' : getRights(user).niveau,
                          points: event.target.value === 'admin' ? LEVEL_POINTS.Expert : (LEVEL_POINTS[getRights(user).niveau] ?? user.points ?? 0),
                        })}
                        style={{ minWidth: 150 }}
                      >
                        {APP_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-sm btn-secondary" onClick={() => approveUser(user)}>
                          <Check size={14} /> Valider
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => updateUser(user.id, { status: 'rejected' })}>
                          <X size={14} /> Refuser
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => deleteUser(user.id)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-2 mb-4">
        {cards.map(c => (
          <Link key={c.to} to={c.to} className="card card-clickable" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.tc, flexShrink: 0 }} aria-hidden="true">
              {c.icon}
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{c.label}</h2>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: c.tc }}>{c.value}</p>
              {c.extra && <p style={{ fontSize: '.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>{c.extra}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Aperçu utilisateurs récents */}
      <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Utilisateurs récents</h2>
      <div className="table-wrapper card" style={{ padding: 0 }}>
        <table className="table" aria-label="Utilisateurs récents" role="table">
          <thead>
            <tr>
              <th scope="col">Login</th>
              <th scope="col">Nom</th>
              <th scope="col">Niveau</th>
              <th scope="col">Points</th>
              <th scope="col">Statut</th>
              <th scope="col">Dernière connexion</th>
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 5).map(u => {
              const statusBadge = getStatusBadge(u.status);
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>@{u.login}</td>
                  <td>{u.prenom} {u.nom}</td>
                  <td><span className="badge badge-primary">{u.niveau}</span></td>
                  <td>{Number(u.points || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>
                    {formatDateTime(u.lastLogin)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
