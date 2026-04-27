import { useAuth } from '../../context/AuthContext';
import { Users } from 'lucide-react';

export default function MembersPage() {
  const { users, currentUser } = useAuth();
  const approved = users.filter(u => u.status === 'approved');

  const levelColors = { débutant:'#6b7280', intermédiaire:'#3b82f6', avancé:'#8b5cf6', expert:'#f59e0b' };

  return (
    <div className="container section animate-fade">
      <h1 className="section-title"><Users size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />Membres de la maison</h1>
      <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>{approved.length} membre(s) actif(s)</p>

      <div className="grid grid-3" role="list" aria-label="Liste des membres">
        {approved.map(u => {
          const isMe = u.id === currentUser.id;
          return (
            <article key={u.id} className="card" role="listitem" style={{ outline: isMe ? `2px solid var(--color-primary)` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: levelColors[u.niveau] || '#6b7280',
                  color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} aria-hidden="true">
                  {u.prenom?.[0]}{u.nom?.[0]}
                </div>
                <div>
                  <strong style={{ fontSize: '.95rem' }}>{u.prenom} {isMe ? '(Moi)' : ''}</strong>
                  <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>@{u.login}</p>
                </div>
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem', fontSize: '.82rem' }}>
                <div><dt style={{ color: 'var(--color-text-muted)', fontSize: '.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Rôle</dt>
                  <dd style={{ textTransform: 'capitalize' }}>{u.role}</dd></div>
                <div><dt style={{ color: 'var(--color-text-muted)', fontSize: '.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Âge</dt>
                  <dd>{u.age} ans</dd></div>
                <div><dt style={{ color: 'var(--color-text-muted)', fontSize: '.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Genre</dt>
                  <dd>{u.sexe}</dd></div>
                <div><dt style={{ color: 'var(--color-text-muted)', fontSize: '.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Niveau</dt>
                  <dd><span className="badge" style={{ background: levelColors[u.niveau] + '22', color: levelColors[u.niveau] }}>{u.niveau}</span></dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
