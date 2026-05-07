import { Camera, CheckCircle2, Lock, Shield, UserCheck, Wifi } from 'lucide-react';
import { DEVICES } from '../../data/mockData';

export default function TransportsPage() {
  const securityDevices = DEVICES.filter(device => (
    ['Caméra', 'Sécurité', 'Sécurité', 'Capteur', 'Détecteur'].includes(device.type) ||
    ['caméra', 'surveillance', 'sécurité', 'securite', 'serrure'].some(tag => device.tags?.join(' ').toLowerCase().includes(tag))
  ));

  const checks = [
    { icon: <UserCheck size={20} />, title: 'Valider les habitants', text: 'L’administrateur contrôle les demandes avant de donner accès à la maison.' },
    { icon: <Camera size={20} />, title: 'Surveiller les zones sensibles', text: 'Les cameras et capteurs donnent une vue rapide des entrees et pieces importantes.' },
    { icon: <Wifi size={20} />, title: 'Vérifier la connexion', text: 'Un objet de sécurité doit garder un signal correct pour remonter les alertes.' },
    { icon: <Lock size={20} />, title: 'Garder la main admin', text: 'Les droits admin permettent de bloquer, corriger ou supprimer un accès douteux.' },
  ];

  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><Shield size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Sécurité maison</h1>
      <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Onglet dédié aux usages de sécurité dans une maison connectée : accès, caméras, capteurs et contrôle administrateur.
      </p>

      <div className="grid grid-2 mb-4">
        <section className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Objets de sécurité</h2>
          <div className="grid gap-2">
            {securityDevices.map(device => (
              <div key={device.id} className="flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '.65rem' }}>
                <div>
                  <strong>{device.name}</strong>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '.84rem' }}>{device.room} - signal {device.signal}</p>
                </div>
                <span className={device.status === 'active' ? 'badge badge-success' : 'badge badge-danger'}>
                  {device.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Checklist protection</h2>
          <div className="grid gap-2">
            {checks.map(check => (
              <div key={check.title} className="flex gap-2">
                <span style={{ color: 'var(--color-primary)' }}>{check.icon}</span>
                <div>
                  <strong>{check.title}</strong>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '.86rem' }}>{check.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="alert alert-info">
        <CheckCircle2 size={18} aria-hidden="true" />
        Ces données servent à présenter le module sécurité avant connexion. Les vrais contrôles restent disponibles dans l’espace admin.
      </div>
    </div>
  );
}
