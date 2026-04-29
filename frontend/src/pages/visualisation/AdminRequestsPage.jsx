import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MessageSquarePlus, Send, Shield, Wrench, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI } from '../../services/api';
import { formatDateTime } from '../../constants/smartHome';

const REQUEST_TYPES = [
  { value: 'ajout_objet', label: 'Ajouter un objet' },
  { value: 'configuration', label: 'Configurer un objet' },
  { value: 'maintenance', label: 'Signaler un problème' },
  { value: 'droits', label: 'Demander un droit' },
  { value: 'autre', label: 'Autre demande' },
];

const PRIORITIES = [
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'basse', label: 'Basse' },
];

const STATUS = {
  nouvelle: { label: 'Nouvelle', className: 'badge-warning' },
  en_cours: { label: 'En cours', className: 'badge-primary' },
  traitee: { label: 'Traitée', className: 'badge-success' },
  refusee: { label: 'Refusée', className: 'badge-danger' },
};

function typeLabel(value) {
  return REQUEST_TYPES.find(type => type.value === value)?.label || 'Autre demande';
}

export default function AdminRequestsPage() {
  const {
    currentUser,
    setAdminRequests,
    setResidentRequests,
    refreshAdminRequests,
    markResidentRepliesRead,
  } = useAuth();
  const isAdmin = currentUser.appRole === 'admin';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [replyById, setReplyById] = useState({});
  const [form, setForm] = useState({
    type: 'ajout_objet',
    priority: 'normale',
    title: '',
    message: '',
  });

  const openRequests = useMemo(
    () => requests.filter(request => ['nouvelle', 'en_cours'].includes(request.status)).length,
    [requests]
  );
  const newRequests = useMemo(
    () => requests.filter(request => request.status === 'nouvelle').length,
    [requests]
  );
  const inProgressRequests = useMemo(
    () => requests.filter(request => request.status === 'en_cours').length,
    [requests]
  );

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = isAdmin ? await requestsAPI.getAll() : await requestsAPI.getMine();
      setRequests(data);
      if (isAdmin) setAdminRequests(data);
      if (!isAdmin) {
        setResidentRequests(data);
        if (data.some(request => request.adminReply && !request.replyRead)) {
          await markResidentRepliesRead();
          setRequests(previous => previous.map(request => ({ ...request, replyRead: true })));
        }
      }
      setReplyById(Object.fromEntries(data.map(request => [request.id, request.adminReply || ''])));
    } catch (err) {
      setError(err.message || 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [isAdmin]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const created = await requestsAPI.create(form);
      setRequests(previous => [created, ...previous]);
      setForm({ type: 'ajout_objet', priority: 'normale', title: '', message: '' });
      setSuccess('Demande envoyée à vos administrateurs.');
    } catch (err) {
      setError(err.message || 'Impossible d’envoyer la demande.');
    }
  };

  const handleUpdate = async (request, status) => {
    setError('');
    setSuccess('');
    try {
      const updated = await requestsAPI.update(request.id, {
        status,
        adminReply: replyById[request.id] || '',
      });
      setRequests(previous => previous.map(item => item.id === request.id ? updated : item));
      if (isAdmin) await refreshAdminRequests();
      setSuccess('Demande mise à jour.');
    } catch (err) {
      setError(err.message || 'Impossible de mettre à jour la demande.');
    }
  };

  return (
    <div className="container section animate-fade">
      <Link to="/tableau-de-bord" className="btn btn-ghost btn-sm mb-4">
        <ArrowLeft size={15} /> Retour
      </Link>

      <div className="dashboard-welcome">
        <div>
          <h1>Demandes à l’admin</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {isAdmin
              ? 'Suivez les demandes des habitants et répondez depuis un seul endroit.'
              : 'Expliquez ce dont vous avez besoin: nouvel objet, configuration, aide ou accès.'}
          </p>
        </div>
        <div className="flex gap-1" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className={`badge ${newRequests ? 'badge-warning' : 'badge-success'}`}>
            {newRequests} nouvelle(s)
          </span>
          <span className={`badge ${inProgressRequests ? 'badge-primary' : 'badge-gray'}`}>
            {inProgressRequests} en cours
          </span>
          <span className="badge badge-gray">{openRequests} ouverte(s)</span>
        </div>
      </div>

      {success && <div className="alert alert-success mb-3" role="status">{success}</div>}
      {error && <div className="alert alert-error mb-3" role="alert">{error}</div>}

      {!isAdmin && (
        <div className="card mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1rem' }}>
            <MessageSquarePlus size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Nouvelle demande</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-2 gap-2">
              <div className="form-group">
                <label className="form-label" htmlFor="request-type">Type</label>
                <select id="request-type" className="form-select" value={form.type} onChange={event => setForm(previous => ({ ...previous, type: event.target.value }))}>
                  {REQUEST_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="request-priority">Priorité</label>
                <select id="request-priority" className="form-select" value={form.priority} onChange={event => setForm(previous => ({ ...previous, priority: event.target.value }))}>
                  {PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="request-title">Titre</label>
              <input id="request-title" className="form-input" maxLength={120} value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} placeholder="Ex: Ajouter une caméra dans le garage" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="request-message">Message</label>
              <textarea id="request-message" className="form-input" rows={5} value={form.message} onChange={event => setForm(previous => ({ ...previous, message: event.target.value }))} placeholder="Décrivez votre besoin, la pièce concernée et pourquoi c’est utile." required />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              <Send size={15} /> Envoyer
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-2">
        {loading ? (
          <p className="card" style={{ color: 'var(--color-text-muted)' }}>Chargement des demandes...</p>
        ) : requests.length === 0 ? (
          <p className="card" style={{ color: 'var(--color-text-muted)' }}>Aucune demande pour le moment.</p>
        ) : requests.map(request => {
          const status = STATUS[request.status] || STATUS.nouvelle;
          return (
            <article key={request.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                <div>
                  <span className="badge badge-gray">{typeLabel(request.type)}</span>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '.5rem' }}>{request.title}</h2>
                </div>
                <span className={`badge ${status.className}`}>{status.label}</span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>{request.message}</p>
              <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                <span className="badge badge-gray">Priorité: {request.priority}</span>
                <span className="badge badge-gray">{formatDateTime(request.createdAt)}</span>
                {isAdmin && request.requester?.login && (
                  <span className="badge badge-primary">@{request.requester.login} - {request.requester.niveau}</span>
                )}
              </div>

              {request.adminReply && !isAdmin && (
                <div className={`alert ${request.replyRead ? 'alert-info' : 'alert-warning'} mt-3`} role="status">
                  <Shield size={16} /> {request.replyRead ? 'Réponse admin' : 'Nouvelle réponse admin'}: {request.adminReply}
                </div>
              )}

              {isAdmin && (
                <div className="mt-3">
                  <label className="form-label" htmlFor={`reply-${request.id}`}>Réponse admin</label>
                  <textarea
                    id={`reply-${request.id}`}
                    className="form-input"
                    rows={3}
                    value={replyById[request.id] || ''}
                    onChange={event => setReplyById(previous => ({ ...previous, [request.id]: event.target.value }))}
                    placeholder="Message visible par l’habitant"
                  />
                  <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => handleUpdate(request, 'en_cours')} disabled={request.status === 'en_cours'}>
                      <Wrench size={14} /> En cours
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleUpdate(request, 'traitee')}>
                      <CheckCircle2 size={14} /> Traiter
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleUpdate(request, 'refusee')}>
                      <XCircle size={14} /> Refuser
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
