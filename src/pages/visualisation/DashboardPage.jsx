import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DevicesContext';
import { Link } from 'react-router-dom';
import { Cpu, User, BarChart2, Zap, TrendingUp, Activity } from 'lucide-react';
import { LEVELS } from '../../data/mockData';

export default function DashboardPage() {
  const { currentUser, canAccess } = useAuth();
  const { devices } = useDevices();
  const active   = devices.filter(d => d.status === 'active').length;
  const inactive = devices.filter(d => d.status === 'inactive').length;
  const totalEnergy = devices.reduce((s, d) => s + (d.energyConsumption > 0 ? d.energyConsumption : 0), 0).toFixed(1);

  const levelColors = {
    débutant:      '#6b7280',
    intermédiaire: '#3b82f6',
    avancé:        '#8b5cf6',
    expert:        '#f59e0b',
  };
  const nextLevel = {
    débutant:      'intermédiaire',
    intermédiaire: 'avancé',
    avancé:        'expert',
    expert:        null,
  };
  const next = nextLevel[currentUser.niveau];
  const nextPts = next ? LEVELS[next].points : null;
  const progress = nextPts
    ? Math.min(100, (currentUser.points / nextPts) * 100).toFixed(0)
    : 100;

  return (
    <div className="container section animate-fade">
      {/* Bienvenue */}
      <div className="dashboard-welcome">
        <div>
          <h1>Bonjour, {currentUser.prenom} 👋</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Votre tableau de bord personnel — <em>Ma Maison Connectée</em></p>
        </div>
        <Link to="/profil" className="btn btn-outline btn-sm"><User size={15} /> Mon profil</Link>
      </div>

      {/* Level card */}
      <div className="level-card card mb-4">
        <div className="level-card__header">
          <div>
            <span className="badge" style={{ background: levelColors[currentUser.niveau] + '22', color: levelColors[currentUser.niveau], fontSize: '.9rem', padding: '.3rem .8rem' }}>
              {currentUser.niveau.charAt(0).toUpperCase() + currentUser.niveau.slice(1)}
            </span>
            <p style={{ marginTop: '.3rem', fontSize: '.88rem', color: 'var(--color-text-muted)' }}>
              {currentUser.points.toFixed(2)} / {nextPts ?? '∞'} points
              {next && <> — prochain niveau : <strong style={{ color: levelColors[next] }}>{next}</strong></>}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '.85rem', color: 'var(--color-text-muted)' }}>
            <p>{currentUser.connexions} connexion(s)</p>
            <p>{currentUser.actions} action(s)</p>
          </div>
        </div>
        <div className="level-progress" aria-label={`Progression : ${progress}%`}>
          <div className="level-progress__bar" style={{ width: `${progress}%`, background: levelColors[currentUser.niveau] }} />
        </div>
        {canAccess('gestion') && (
          <Link to="/gestion" className="btn btn-primary btn-sm mt-2" style={{ alignSelf: 'flex-start' }}>
            <BarChart2 size={15} /> Accéder à la Gestion
          </Link>
        )}
      </div>

      {/* Stats objets */}
      <h2 className="section-title" style={{ fontSize: '1.2rem' }}>État de la maison</h2>
      <div className="grid grid-4 mb-4">
        <StatCard icon={<Cpu size={22} />} value={devices.length} label="Objets connectés" color="#dbeafe" iconColor="#1a73e8" />
        <StatCard icon={<Activity size={22} />} value={active} label="Actifs" color="#d1fae5" iconColor="#22c55e" />
        <StatCard icon={<Activity size={22} />} value={inactive} label="Inactifs" color="#fee2e2" iconColor="#ef4444" />
        <StatCard icon={<Zap size={22} />} value={`${totalEnergy} kWh`} label="Consommation" color="#fef3c7" iconColor="#f59e0b" />
      </div>

      {/* Raccourcis */}
      <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Accès rapides</h2>
      <div className="grid grid-3 mb-4">
        <QuickLink to="/objets"   icon={<Cpu size={20} />}       title="Mes objets"         desc="Consulter tous les objets connectés" />
        <QuickLink to="/membres"  icon={<User size={20} />}      title="Membres"            desc="Voir les profils des membres" />
        <QuickLink to="/profil"   icon={<TrendingUp size={20} />} title="Mon niveau"        desc="Gérer votre profil et vos points" />
        {canAccess('gestion') && <>
          <QuickLink to="/gestion"          icon={<BarChart2 size={20} />} title="Gestion"  desc="Gérer les objets connectés" />
          <QuickLink to="/gestion/rapports" icon={<BarChart2 size={20} />} title="Rapports" desc="Statistiques et rapports d'utilisation" />
        </>}
      </div>

      {/* Derniers objets actifs */}
      <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Objets actifs récents</h2>
      <div className="grid grid-3">
        {devices.filter(d => d.status === 'active').slice(0, 6).map(d => (
          <Link key={d.id} to={`/objets/${d.id}`} className="card card-clickable" style={{ padding: '1rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="status-dot active" aria-hidden="true" />
              <strong style={{ fontSize: '.92rem' }}>{d.name}</strong>
            </div>
            <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
              <span className="badge badge-gray">{d.type}</span>
              <span className="badge badge-gray">{d.room}</span>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginTop: '.4rem' }}>{d.brand}</p>
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
