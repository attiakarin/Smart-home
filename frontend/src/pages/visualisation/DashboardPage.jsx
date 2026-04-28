import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DevicesContext';
import { Link } from 'react-router-dom';
import { Activity, BarChart2, Bell, Cpu, KeyRound, Plus, Shield, TrendingUp, User, Wrench, Zap } from 'lucide-react';
import { LEVELS } from '../../constants/smartHome';

const LEVEL_COLORS = Object.fromEntries(
  Object.entries(LEVELS).map(([level, config]) => [level.toLowerCase(), config.color])
);

const NEXT_LEVEL = {
  débutant: 'Intermédiaire',
  intermédiaire: 'Avancé',
  avancé: 'Expert',
  expert: null,
};

export default function DashboardPage() {
  const { currentUser, users, canAccess } = useAuth();
  const { devices } = useDevices();

  const isAdmin = currentUser.appRole === 'admin';
  const canUseGestion = canAccess('gestion');
  const canCreateDevices = canAccess('device_create');
  const canSeeReports = canAccess('reports');
  const levelKey = currentUser.niveau?.toLowerCase();
  const pendingUsers = users.filter(user => user.status === 'pending');
  const active = devices.filter(device => device.status === 'active').length;
  const inactive = devices.filter(device => device.status === 'inactive').length;
  const lowBattery = devices.filter(device => device.battery !== null && device.battery !== undefined && device.battery < 25).length;
  const totalEnergy = devices.reduce((sum, device) => sum + (device.energyConsumption > 0 ? device.energyConsumption : 0), 0).toFixed(1);

  const next = NEXT_LEVEL[levelKey];
  const nextPts = next ? LEVELS[next].points : null;
  const progress = nextPts ? Math.min(100, (Number(currentUser.points || 0) / nextPts) * 100).toFixed(0) : 100;

  return (
    <div className="container section animate-fade">
      <div className="dashboard-welcome">
        <div>
          <h1>{isAdmin ? 'Pilotage de la maison' : `Bonjour, ${currentUser.prenom}`}</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {isAdmin
              ? `Espace administrateur${currentUser.maisonNom ? ` - ${currentUser.maisonNom}` : ''}`
              : 'Votre espace habitant - Ma Maison Connectée'}
          </p>
        </div>
        <Link to={isAdmin ? '/admin' : '/profil'} className="btn btn-outline btn-sm">
          {isAdmin ? <Shield size={15} /> : <User size={15} />}
          {isAdmin ? 'Administration' : 'Mon profil'}
        </Link>
      </div>

      {isAdmin && (
        <div className="grid grid-2 mb-4">
          <Link to="/admin" className="card card-clickable" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={24} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Demandes d'accès</h2>
              <p style={{ color: pendingUsers.length ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 700 }}>
                {pendingUsers.length ? `${pendingUsers.length} personne(s) à valider` : 'Aucune demande en attente'}
              </p>
            </div>
          </Link>

          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Code d'accès</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '.88rem' }}>À partager avec les habitants.</p>
            </div>
            <div className="access-code-box">
              <KeyRound size={18} aria-hidden="true" />
              <strong>{currentUser.maisonCode || 'MAISON2026'}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="level-card card mb-4">
        <div className="level-card__header">
          <div>
            <span className="badge" style={{ background: (LEVEL_COLORS[levelKey] || '#6b7280') + '22', color: LEVEL_COLORS[levelKey] || '#6b7280', fontSize: '.9rem', padding: '.3rem .8rem' }}>
              {currentUser.niveau}
            </span>
            <p style={{ marginTop: '.3rem', fontSize: '.88rem', color: 'var(--color-text-muted)' }}>
              {Number(currentUser.points || 0).toFixed(2)} / {nextPts ?? '∞'} points
              {!isAdmin && next && <> - prochain niveau : <strong style={{ color: LEVELS[next].color }}>{next}</strong></>}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '.85rem', color: 'var(--color-text-muted)' }}>
            {isAdmin && <p>{users.length} membre(s)</p>}
            <p>{currentUser.connexions} connexion(s)</p>
            <p>{currentUser.actions} action(s)</p>
          </div>
        </div>
        <div className="level-progress" aria-label={`Progression : ${progress}%`}>
          <div className="level-progress__bar" style={{ width: `${progress}%`, background: LEVEL_COLORS[levelKey] || '#6b7280' }} />
        </div>
        {canUseGestion && (
          <Link to="/gestion" className="btn btn-primary btn-sm mt-2" style={{ alignSelf: 'flex-start' }}>
            <BarChart2 size={15} /> Accéder à la gestion
          </Link>
        )}
      </div>

      <h2 className="section-title" style={{ fontSize: '1.2rem' }}>État de la maison</h2>
      <div className="grid grid-4 mb-4">
        <StatCard icon={<Cpu size={22} />} value={devices.length} label="Objets connectés" color="#dbeafe" iconColor="#1a73e8" />
        <StatCard icon={<Activity size={22} />} value={active} label="Actifs" color="#d1fae5" iconColor="#22c55e" />
        <StatCard icon={<Activity size={22} />} value={inactive} label="Inactifs" color="#fee2e2" iconColor="#ef4444" />
        <StatCard icon={<Zap size={22} />} value={isAdmin ? lowBattery : `${totalEnergy} kWh`} label={isAdmin ? 'Batteries faibles' : 'Consommation'} color="#fef3c7" iconColor="#f59e0b" />
      </div>

      <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Accès rapides</h2>
      <div className="grid grid-3 mb-4">
        <QuickLink to="/objets" icon={<Cpu size={20} />} title={isAdmin ? 'Parc objets' : 'Mes objets'} desc="Consulter les objets connectés" />
        <QuickLink to="/services" icon={<Wrench size={20} />} title="Services" desc="Rechercher les services disponibles" />
        <QuickLink to="/membres" icon={<User size={20} />} title="Membres" desc="Voir les membres de la maison" />
        <QuickLink to="/profil" icon={<TrendingUp size={20} />} title="Mon profil" desc="Gérer votre profil et vos points" />
        {isAdmin && <QuickLink to="/admin" icon={<Bell size={20} />} title="Demandes d'accès" desc="Valider ou refuser les habitants" />}
        {canUseGestion && <QuickLink to="/gestion" icon={<Plus size={20} />} title={canCreateDevices ? 'Ajouter un objet' : 'Piloter les objets'} desc={canCreateDevices ? 'Créer et enregistrer un objet connecté' : 'Activer ou désactiver les objets existants'} />}
        {canSeeReports && <QuickLink to="/gestion/rapports" icon={<BarChart2 size={20} />} title="Rapports" desc="Statistiques et rapports de la maison" />}
      </div>

      <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Objets actifs récents</h2>
      <div className="grid grid-3">
        {devices.filter(device => device.status === 'active').slice(0, 6).map(device => (
          <Link key={device.id} to={`/objets/${device.id}`} className="card card-clickable" style={{ padding: '1rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="status-dot active" aria-hidden="true" />
              <strong style={{ fontSize: '.92rem' }}>{device.name}</strong>
            </div>
            <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
              <span className="badge badge-gray">{device.type}</span>
              <span className="badge badge-gray">{device.room}</span>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginTop: '.4rem' }}>{device.brand}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, iconColor }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, margin: '0 auto .75rem' }} aria-hidden="true">
        {icon}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: iconColor }}>{value}</div>
      <div style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function QuickLink({ to, icon, title, desc }) {
  return (
    <Link to={to} className="card card-clickable" style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', padding: '1.2rem' }}>
      <div style={{ color: 'var(--color-primary)', marginTop: 2 }} aria-hidden="true">{icon}</div>
      <div>
        <strong style={{ fontSize: '.95rem' }}>{title}</strong>
        <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>{desc}</p>
      </div>
    </Link>
  );
}
