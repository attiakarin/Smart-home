import { BatteryWarning, Gauge, Lightbulb, Plug, Zap } from 'lucide-react';
import { DEVICES } from '../../data/mockData';

export default function PlacesPage() {
  const energyDevices = DEVICES
    .filter(device => Number(device.energyConsumption) > 0)
    .sort((a, b) => Number(b.energyConsumption) - Number(a.energyConsumption));
  const totalEnergy = energyDevices.reduce((sum, device) => sum + Number(device.energyConsumption || 0), 0).toFixed(2);
  const lowBattery = DEVICES.filter(device => device.battery !== null && device.battery !== undefined && device.battery < 25);

  const tips = [
    { icon: <Plug size={20} />, title: 'Couper les veilles', text: 'Utiliser des prises connectees pour eteindre les appareils multimedia quand personne ne les utilise.' },
    { icon: <Lightbulb size={20} />, title: 'Automatiser la lumiere', text: 'Associer les eclairages a des horaires ou des capteurs de presence pour eviter les oublis.' },
    { icon: <Gauge size={20} />, title: 'Surveiller les pics', text: 'Identifier les objets qui consomment le plus et adapter leur utilisation pendant la journee.' },
  ];

  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><Zap size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Energie & consommation</h1>
      <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Vue de demonstration pour montrer comment une maison connectee aide a comprendre et reduire la consommation.
      </p>

      <div className="grid grid-3 mb-4">
        <div className="card text-center">
          <strong style={{ fontSize: '1.6rem', color: 'var(--color-primary)' }}>{totalEnergy}</strong>
          <p style={{ color: 'var(--color-text-muted)' }}>kWh suivis</p>
        </div>
        <div className="card text-center">
          <strong style={{ fontSize: '1.6rem', color: '#f59e0b' }}>{energyDevices.length}</strong>
          <p style={{ color: 'var(--color-text-muted)' }}>objets mesures</p>
        </div>
        <div className="card text-center">
          <strong style={{ fontSize: '1.6rem', color: '#ea4335' }}>{lowBattery.length}</strong>
          <p style={{ color: 'var(--color-text-muted)' }}>batteries faibles</p>
        </div>
      </div>

      <div className="grid grid-2 mb-4">
        <section className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Objets les plus consommateurs</h2>
          <div className="grid gap-2">
            {energyDevices.slice(0, 6).map(device => (
              <div key={device.id} className="flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '.65rem' }}>
                <div>
                  <strong>{device.name}</strong>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '.84rem' }}>{device.room} - {device.type}</p>
                </div>
                <span className="badge badge-warning">{device.energyConsumption} kWh</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Actions recommandees</h2>
          <div className="grid gap-2">
            {tips.map(tip => (
              <div key={tip.title} className="flex gap-2">
                <span style={{ color: 'var(--color-primary)' }}>{tip.icon}</span>
                <div>
                  <strong>{tip.title}</strong>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '.86rem' }}>{tip.text}</p>
                </div>
              </div>
            ))}
            {lowBattery.length > 0 && (
              <div className="alert alert-warning mt-2">
                <BatteryWarning size={18} aria-hidden="true" />
                {lowBattery.length} objet(s) ont une batterie faible.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
