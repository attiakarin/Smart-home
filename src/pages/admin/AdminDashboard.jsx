import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DevicesContext';
import { Users, Cpu, Settings, BarChart2, Shield, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { users }   = useAuth();
  const { devices } = useDevices();

  const pending  = users.filter(u => u.status === 'pending').length;
  const approved = users.filter(u => u.status === 'approved').length;
  const lowBatt  = devices.filter(d => d.battery !== null && d.battery !== undefined && d.battery < 25).length;

  const cards = [
    { to: '/admin/utilisateurs', icon: <Users size={28} />, label: 'Gestion Utilisateurs', value: `${approved} actifs`, extra: pending ? `${pending} en attente` : null, color: '#dbeafe', tc: '#1a73e8' },
    { to: '/admin/objets',       icon: <Cpu size={28} />,   label: 'Gestion Objets',       value: `${devices.length} objets`, extra: lowBatt ? `${lowBatt} batterie faible` : null, color: '#d1fae5', tc: '#22c55e' },
    { to: '/gestion/rapports',   icon: <BarChart2 size={28} />, label: 'Rapports',           value: 'Statistiques',     extra: null, color: '#fef3c7', tc: '#f59e0b' },
    { to: '/admin/parametres',   icon: <Settings size={28} />,  label: 'Paramètres',         value: 'Plateforme',       extra: null, color: '#ede9fe', tc: '#8b5cf6' },
  ];

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
            {users.slice(0, 5).map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>@{u.login}</td>
                <td>{u.prenom} {u.nom}</td>
                <td><span className="badge badge-primary">{u.niveau}</span></td>
                <td>{u.points.toFixed(2)}</td>
                <td>
                  <span className={`badge ${u.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                    {u.status === 'approved' ? 'Approuvé' : 'En attente'}
                  </span>
                </td>
                <td style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
