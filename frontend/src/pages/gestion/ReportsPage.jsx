import { Link } from 'react-router-dom';
import { useDevices } from '../../context/DevicesContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['#1a73e8','#34a853','#f9ab00','#ea4335','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const { devices } = useDevices();
  const { users }   = useAuth();

  const downloadReport = () => {
    const headers = ['id', 'nom', 'type', 'piece', 'etat', 'marque', 'connexion', 'batterie', 'consommation_kwh'];
    const rows = devices.map(device => [
      device.id,
      device.name,
      device.type,
      device.room,
      device.status === 'active' ? 'Actif' : 'Inactif',
      device.brand,
      device.connectivity,
      device.battery ?? '',
      device.energyConsumption ?? 0,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-maison-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Data par pièce
  const byRoom = Object.entries(
    devices.reduce((acc, d) => { acc[d.room] = (acc[d.room] || 0) + 1; return acc; }, {})
  ).map(([room, count]) => ({ room, count }));

  // Data par type
  const byType = Object.entries(
    devices.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Consommation énergétique par objet (uniquement les objets actifs)
  const energyData = devices
    .filter(d => d.status === 'active' && d.energyConsumption > 0)
    .map(d => ({ name: d.name.slice(0, 12), conso: d.energyConsumption }))
    .sort((a, b) => b.conso - a.conso)
    .slice(0, 8);

  // Connexions des utilisateurs sur les 7 derniers jours
  const connexionData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = formatDateKey(d);
    const total = users.reduce((s, u) => {
      const day = u.loginHistory?.find(h => h.date === dateStr);
      return s + (day?.connexions || 0);
    }, 0);
    return { date: dateStr.slice(5), connexions: total };
  });

  // Statut
  const active   = devices.filter(d => d.status === 'active').length;
  const inactive = devices.filter(d => d.status === 'inactive').length;
  const statusData = [{ name: 'Actifs', value: active }, { name: 'Inactifs', value: inactive }];

  return (
    <div className="container section animate-fade">
      <Link to="/gestion" className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={15} /> Retour</Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Rapports & Statistiques</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Synthèse des objets, états et consommations enregistrés.</p>
        </div>
        <button className="btn btn-primary" onClick={downloadReport}>
          <Download size={16} /> Télécharger le rapport CSV
        </button>
      </div>

      <div className="grid grid-4 mb-4">
        <div className="card text-center"><strong style={{ fontSize: '1.5rem', color: '#1a73e8' }}>{devices.length}</strong><p style={{ color: 'var(--color-text-muted)' }}>Objets</p></div>
        <div className="card text-center"><strong style={{ fontSize: '1.5rem', color: '#22c55e' }}>{active}</strong><p style={{ color: 'var(--color-text-muted)' }}>Actifs</p></div>
        <div className="card text-center"><strong style={{ fontSize: '1.5rem', color: '#ef4444' }}>{inactive}</strong><p style={{ color: 'var(--color-text-muted)' }}>Inactifs</p></div>
        <div className="card text-center"><strong style={{ fontSize: '1.5rem', color: '#f59e0b' }}>{devices.filter(d => d.status === 'active').reduce((sum, d) => sum + (d.energyConsumption > 0 ? d.energyConsumption : 0), 0).toFixed(1)} kWh</strong><p style={{ color: 'var(--color-text-muted)' }}>Consommation</p></div>
      </div>

      <div className="grid grid-2" style={{ gap: '1.5rem' }}>
        {/* Consommation énergétique */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Consommation énergétique (kWh)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={energyData} aria-label="Consommation énergétique par objet">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v} kWh`, 'Consommation']} />
              <Bar dataKey="conso" fill="#1a73e8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par type */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Objets par type</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart aria-label="Répartition des objets par type">
              <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90}>
                {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} objet${v > 1 ? 's' : ''}`, n]} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Objets par pièce */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Objets par pièce</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byRoom} layout="vertical" aria-label="Objets par pièce">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="room" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={(v) => [v, 'Objets']} />
              <Bar dataKey="count" fill="#34a853" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Connexions 7 jours */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Connexions (7 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={connexionData} aria-label="Connexions des 7 derniers jours">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v, 'Connexions']} />
              <Line type="monotone" dataKey="connexions" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Statuts */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Statuts des objets</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart aria-label="Répartition actifs / inactifs">
              <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({name, value}) => `${name}: ${value}`}>
                <Cell fill="#22c55e" /><Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Résumé table */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Résumé utilisateurs</h2>
          <div className="table-wrapper">
            <table className="table" aria-label="Résumé des utilisateurs" role="table">
              <thead>
                <tr>
                  <th scope="col">Login</th>
                  <th scope="col">Niveau</th>
                  <th scope="col">Points</th>
                  <th scope="col">Connexions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.status === 'approved').map(u => (
                  <tr key={u.id}>
                    <td>@{u.login}</td>
                    <td><span className="badge badge-primary">{u.niveau}</span></td>
                    <td>{Number(u.points || 0).toFixed(2)}</td>
                    <td>{u.connexions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
