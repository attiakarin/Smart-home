import { Bus, Clock } from 'lucide-react';

const TRANSPORTS = [];

export default function TransportsPage() {
  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><Bus size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Transports & Horaires</h1>
      <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>Prochains départs en temps réel.</p>

      <div className="grid grid-2" role="list">
        {TRANSPORTS.map(t => (
          <article key={t.id} className="card" role="listitem">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-primary">{t.type}</span>
              <strong style={{ fontSize: '1.05rem' }}>{t.line}</strong>
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '.6rem' }}>Direction : <strong>{t.direction}</strong></p>
            <div className="flex gap-2 flex-wrap">
              {t.nextDepartures.map((dep, i) => (
                <span key={i} className="flex items-center gap-1 badge badge-gray">
                  <Clock size={12} aria-hidden="true" /> {dep}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
