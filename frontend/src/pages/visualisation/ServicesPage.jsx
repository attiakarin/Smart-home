import { useEffect, useMemo, useState, useCallback } from 'react';
import { CheckCircle, Cpu, Search, SlidersHorizontal, Thermometer, Wrench, X, Zap } from 'lucide-react';
import { publicAPI, automationAPI } from '../../services/api';
import { useDevices } from '../../context/DevicesContext';

const LEVELS = ['Tous', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

// ─── Configuration des actions concrètes par type de service ─────────────────
const SERVICE_CONFIG = {
  confort: {
    compatibleTypes: ['Thermostat', 'Éclairage', 'Sèche-serviette'],
    icon: '🌡️',
    summary: 'Définissez une température cible pour chaque thermostat sélectionné.',
    // patch appelé avec (globalCfg, deviceCfg) — deviceCfg contient la température par objet
    applyPatch: (globalCfg, deviceCfg) => ({
      status: 'active',
      settings: {
        mode: 'confort',
        temperature_consigne: String(
          deviceCfg?.temperature ?? globalCfg?.temperature ?? 20
        ),
      },
    }),
    globalFields: [
      { key: 'temperature', label: 'Température par défaut (°C)', type: 'number', default: 20, min: 10, max: 35 },
    ],
    // champ affiché inline sur chaque objet sélectionné
    perDeviceField: { key: 'temperature', label: '°C', type: 'number', default: 20, min: 10, max: 35 },
    actionLabel: 'Appliquer la température',
  },

  'sécurité': {
    compatibleTypes: ['Caméra', 'Capteur', 'Sécurité', 'Détecteur'],
    icon: '🔒',
    summary: "Activez la surveillance et choisissez son niveau d'alerte.",
    applyPatch: (globalCfg) => ({
      status: 'active',
      settings: {
        surveillance: 'active',
        mode_securite: globalCfg?.mode ?? 'standard',
      },
    }),
    globalFields: [
      {
        key: 'mode',
        label: 'Niveau de surveillance',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard — Surveillance normale' },
          { value: 'alerte', label: 'Alerte — Notifications activées' },
          { value: 'urgent', label: 'Urgent — Alerte maximale' },
        ],
        default: 'standard',
      },
    ],
    actionLabel: 'Activer la surveillance',
  },

  'énergie': {
    compatibleTypes: ['Prise', 'Énergie', 'Électroménager', 'Thermostat'],
    icon: '⚡',
    summary: 'Activez le mode éco ou désactivez les appareils énergivores.',
    applyPatch: (globalCfg) => ({
      status: globalCfg?.action === 'off' ? 'inactive' : 'active',
      settings: {
        mode_eco: globalCfg?.action === 'off' ? '0' : '1',
        alerte_surconsommation: 'active',
      },
    }),
    globalFields: [
      {
        key: 'action',
        label: 'Action à effectuer',
        type: 'radio',
        options: [
          { value: 'on', label: '⚡ Activer + mode éco' },
          { value: 'off', label: '🔌 Désactiver les appareils' },
        ],
        default: 'on',
      },
    ],
    actionLabel: 'Appliquer',
  },

  automatisation: {
    compatibleTypes: ['Éclairage', 'Thermostat', 'Prise', 'Électroménager', 'Cafetière'],
    icon: '⏰',
    summary: "Créez une règle simple : choisissez l'heure, l'action et les jours.",
    applyPatch: (globalCfg) => ({
      status: 'active',
      settings: {
        automatisation: 'active',
        alerte_push: 'active',
        heure_declenchement: globalCfg?.heure ?? '08:00',
        action_auto: globalCfg?.action_auto ?? 'activer',
        jours_actifs:
          Array.isArray(globalCfg?.jours) && globalCfg.jours.length > 0
            ? globalCfg.jours.join(',')
            : 'lun,mar,mer,jeu,ven',
      },
    }),
    globalFields: [
      { key: 'heure', label: 'Heure de déclenchement', type: 'time', default: '08:00' },
      {
        key: 'action_auto',
        label: 'Action automatique',
        type: 'select',
        options: [
          { value: 'activer', label: "Activer l'appareil" },
          { value: 'desactiver', label: "Désactiver l'appareil" },
        ],
        default: 'activer',
      },
      {
        key: 'jours',
        label: 'Jours actifs',
        type: 'checkboxgroup',
        options: DAYS.map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })),
        default: ['lun', 'mar', 'mer', 'jeu', 'ven'],
      },
    ],
    actionLabel: "Créer la règle d'automatisation",
  },

  suivi: {
    compatibleTypes: ['Capteur', 'Détecteur', 'Énergie', 'Thermostat'],
    icon: '📊',
    summary: 'Activez le suivi temps réel et les alertes push sur vos capteurs.',
    applyPatch: () => ({
      status: 'active',
      settings: { suivi_actif: '1', alerte_push: 'active' },
    }),
    actionLabel: 'Activer le suivi',
  },
};

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function normalize(str) {
  return (str ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function getServiceConfig(serviceType) {
  if (!serviceType) return null;
  const n = normalize(serviceType);
  const found = Object.entries(SERVICE_CONFIG).find(([key]) => {
    const nk = normalize(key);
    return n === nk || n.includes(nk) || nk.includes(n);
  });
  return found ? found[1] : null;
}

function initGlobalConfig(config) {
  if (!config?.globalFields) return {};
  return Object.fromEntries(config.globalFields.map(f => [f.key, f.default ?? '']));
}

// ─── Rendu d'un champ global de configuration ─────────────────────────────────
function GlobalField({ field, value, onChange }) {
  if (field.type === 'radio') {
    return (
      <div className="form-group">
        <span className="form-label">{field.label}</span>
        <div className="flex gap-3" style={{ flexWrap: 'wrap', marginTop: '.35rem' }}>
          {field.options.map(opt => (
            <label
              key={opt.value}
              style={{ display: 'flex', alignItems: 'center', gap: '.45rem', cursor: 'pointer' }}
            >
              <input
                type="radio"
                name={`svc-radio-${field.key}`}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: '.88rem' }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="form-group">
        <label className="form-label" htmlFor={`svc-${field.key}`}>{field.label}</label>
        <select
          id={`svc-${field.key}`}
          className="form-select"
          value={value ?? field.default}
          onChange={e => onChange(e.target.value)}
        >
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'checkboxgroup') {
    const vals = Array.isArray(value) ? value : (field.default ?? []);
    return (
      <div className="form-group">
        <span className="form-label">{field.label}</span>
        <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: '.35rem' }}>
          {field.options.map(opt => {
            const active = vals.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(active ? vals.filter(v => v !== opt.value) : [...vals, opt.value])}
                style={{
                  padding: '.22rem .6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: active ? 'var(--color-primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--color-text)',
                  fontSize: '.8rem',
                  fontWeight: active ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // number, time, text
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={`svc-${field.key}`}>{field.label}</label>
      <input
        id={`svc-${field.key}`}
        type={field.type}
        className="form-input"
        value={value ?? field.default}
        min={field.min}
        max={field.max}
        onChange={e => onChange(e.target.value)}
        style={{ maxWidth: field.type === 'number' ? 120 : field.type === 'time' ? 140 : undefined }}
      />
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function ServicesPage() {
  const { devices, updateDevice } = useDevices();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('Tous');
  const [level] = useState('Tous');

  // modal
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  // configuration globale du service (commune à tous les objets)
  const [globalConfig, setGlobalConfig] = useState({});
  // configuration par objet (ex: température individuelle pour chaque thermostat)
  const [deviceConfigs, setDeviceConfigs] = useState({});
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await publicAPI.getServices(level === 'Tous' ? {} : { minLevel: level });
        if (active) setServices(data);
      } catch {
        if (active) setServices([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [level]);

  const serviceTypes = useMemo(() => (
    ['Tous', ...new Set(services.map(s => s.service_type).filter(Boolean))]
  ), [services]);

  const filtered = services.filter(service => {
    return (type === 'Tous' || service.service_type === type);
  });

  const compatibleDevices = useMemo(() => {
    if (!selectedService) return [];
    const config = getServiceConfig(selectedService.service_type);
    if (!config) return devices;
    return devices.filter(d =>
      config.compatibleTypes.some(t => normalize(d.type) === normalize(t))
    );
  }, [selectedService, devices]);

  const openService = useCallback((service) => {
    const config = getServiceConfig(service.service_type);
    setSelectedService(service);
    setSelectedDeviceIds([]);
    setApplyResult(null);
    setApplying(false);
    setGlobalConfig(initGlobalConfig(config));
    setDeviceConfigs({});
  }, []);

  const closeModal = useCallback(() => {
    setSelectedService(null);
    setSelectedDeviceIds([]);
    setApplyResult(null);
    setApplying(false);
    setGlobalConfig({});
    setDeviceConfigs({});
  }, []);

  const toggleDeviceId = (id) => {
    setSelectedDeviceIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const setDeviceCfgField = (deviceId, key, value) => {
    setDeviceConfigs(prev => ({
      ...prev,
      [deviceId]: { ...(prev[deviceId] ?? {}), [key]: value },
    }));
  };

  const selectAll = () => {
    setSelectedDeviceIds(
      selectedDeviceIds.length === compatibleDevices.length
        ? []
        : compatibleDevices.map(d => d.id)
    );
  };

  const applyService = async () => {
    if (!selectedService || selectedDeviceIds.length === 0) return;
    const config = getServiceConfig(selectedService.service_type);
    const serviceNorm = normalize(selectedService.service_type ?? '');
    const isAutomation = serviceNorm.includes('auto');

    setApplying(true);
    setApplyResult(null);
    let successCount = 0;
    const failed = [];

    // détail de ce qui a été appliqué, pour l'affichage de confirmation
    const successes = [];

    for (const id of selectedDeviceIds) {
      const d = devices.find(d => String(d.id) === String(id));
      try {
        if (isAutomation) {
          await automationAPI.createRule(id, {
            heure:       globalConfig.heure       ?? '08:00',
            action_auto: globalConfig.action_auto  ?? 'activer',
            jours:       globalConfig.jours        ?? ['lun', 'mar', 'mer', 'jeu', 'ven'],
          });
          const joursTxt = Array.isArray(globalConfig.jours) && globalConfig.jours.length
            ? globalConfig.jours.join(', ')
            : 'lun–ven';
          successes.push({
            name:   d?.name ?? String(id),
            detail: `${globalConfig.action_auto === 'desactiver' ? 'Désactiver' : 'Activer'} à ${globalConfig.heure ?? '08:00'} (${joursTxt})`,
          });
        } else {
          const patch = config
            ? config.applyPatch(globalConfig, deviceConfigs[id])
            : { status: 'active' };
          // Construit un résumé lisible des valeurs appliquées
          const details = [];
          if (patch.settings?.temperature_consigne) details.push(`🌡 Température : ${patch.settings.temperature_consigne} °C`);
          if (patch.settings?.mode_securite)        details.push(`🔒 Surveillance : ${patch.settings.mode_securite}`);
          if (patch.settings?.mode_eco === '1')     details.push('⚡ Mode éco activé');
          if (patch.settings?.mode_eco === '0')     details.push('🔌 Appareils désactivés');
          if (patch.settings?.suivi_actif === '1')  details.push('📊 Suivi activé');
          const serviceLabel = `${selectedService.name}${details.length ? ' — ' + details.join(' · ') : ''}`;
          await updateDevice(id, { ...patch, serviceLabel });
          successes.push({ name: d?.name ?? String(id), detail: details.join(' · ') || 'Appliqué' });
        }
        successCount++;
      } catch {
        failed.push(d?.name ?? String(id));
      }
    }

    setApplyResult({ count: successCount, errors: failed, isAutomation, applied: successes });
    setApplying(false);
    setSelectedDeviceIds([]);
  };

  const compatCountFor = useCallback((service) => {
    const config = getServiceConfig(service.service_type);
    if (!config) return devices.length;
    return devices.filter(d =>
      config.compatibleTypes.some(t => normalize(d.type) === normalize(t))
    ).length;
  }, [devices]);

  // ─── Résumé de la règle d'automatisation ────────────────────────────────────
  const autoSummary = useMemo(() => {
    if (!selectedService) return null;
    const n = normalize(selectedService.service_type);
    if (!n.includes('auto')) return null;
    const action = globalConfig.action_auto === 'desactiver' ? 'désactiver' : 'activer';
    const jours = Array.isArray(globalConfig.jours) && globalConfig.jours.length > 0
      ? globalConfig.jours.join(', ')
      : 'lun–ven';
    return `Règle : ${action} à ${globalConfig.heure ?? '08:00'} les jours : ${jours}`;
  }, [selectedService, globalConfig]);

  return (
    <div className="container section animate-fade">
      <div className="dashboard-welcome">
        <div>
          <h1>
            <Wrench size={24} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Services de la maison
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Appliquez un service directement à vos objets connectés compatibles.
          </p>
        </div>
        <span className="badge badge-primary">{filtered.length} service(s)</span>
      </div>



      <div className="grid grid-3" role="list" aria-label="Liste des services">
        {filtered.map(service => {
          const count = compatCountFor(service);
          const cfg = getServiceConfig(service.service_type);
          return (
            <button
              key={service.id}
              type="button"
              className="card card-clickable"
              role="listitem"
              onClick={() => openService(service)}
              style={{ textAlign: 'left' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>{cfg?.icon ?? '⚙️'}</span>
                <span className="badge badge-gray">{service.service_type || 'Service'}</span>
                <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>
                  {service.service_type === 'confort' ? 'Avancé'
                    : service.service_type === 'énergie' ? 'Avancé'
                    : service.service_type === 'sécurité' ? 'Expert'
                    : service.min_niveau}
                </span>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '.35rem' }}>
                {service.name}
              </h2>
              <p style={{ fontSize: '.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '.6rem' }}>
                {service.description}
              </p>
              {cfg?.summary && (
                <p style={{ fontSize: '.8rem', color: 'var(--color-primary)', lineHeight: 1.4, marginBottom: '.5rem' }}>
                  {cfg.summary}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Cpu size={13} color="var(--color-text-muted)" aria-hidden="true" />
                <span className="form-hint">{count} objet(s) compatible(s)</span>
              </div>
            </button>
          );
        })}

        {!loading && filtered.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
            <Search size={32} style={{ display: 'block', margin: '0 auto .75rem' }} aria-hidden="true" />
            Aucun service ne correspond aux filtres.
          </p>
        )}
        {loading && (
          <p style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
            Chargement des services…
          </p>
        )}
      </div>

      {selectedService && (() => {
        const config = getServiceConfig(selectedService.service_type);
        return (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="svc-modal-title"
            onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <div className="modal" style={{ maxWidth: 600 }}>
              {/* ── En-tête ── */}
              <div className="modal-header">
                <h2 id="svc-modal-title" style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span aria-hidden="true">{config?.icon ?? '⚙️'}</span>
                  {selectedService.name}
                </h2>
                <button className="btn btn-ghost btn-sm" onClick={closeModal} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Badges */}
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-gray">{selectedService.service_type || 'Service'}</span>
                  <span className="badge badge-primary">Niveau {selectedService.min_niveau}</span>
                  {selectedService.categorie_nom && (
                    <span className="badge badge-warning">{selectedService.categorie_nom}</span>
                  )}
                </div>

                {/* Description */}
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  {selectedService.description}
                </p>

                {/* ── Confirmation détaillée ── */}
                {applyResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {/* Bannière succès / erreur */}
                    <div
                      className={`alert ${applyResult.count > 0 ? 'alert-success' : 'alert-error'}`}
                      role="status"
                      style={{ alignItems: 'flex-start', gap: '.6rem' }}
                    >
                      <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                      <div>
                        <strong>
                          {applyResult.count > 0
                            ? applyResult.isAutomation
                              ? `✅ Règle créée pour ${applyResult.count} objet(s) avec succès.`
                              : `✅ Service appliqué à ${applyResult.count} objet(s) avec succès.`
                            : "❌ Impossible d'appliquer le service."}
                        </strong>
                        {applyResult.errors.length > 0 && (
                          <p style={{ margin: '.25rem 0 0', fontSize: '.82rem' }}>
                            Échec sur : {applyResult.errors.join(', ')}.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Liste des objets traités avec ce qui a été appliqué */}
                    {applyResult.applied?.length > 0 && (
                      <div
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '.5rem .85rem',
                            background: 'var(--color-bg-subtle, #f1f5f9)',
                            fontSize: '.8rem',
                            fontWeight: 700,
                            color: 'var(--color-text-muted)',
                            borderBottom: '1px solid var(--color-border)',
                          }}
                        >
                          Récapitulatif des modifications
                        </div>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {applyResult.applied.map((item, i) => (
                            <li
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '.6rem',
                                padding: '.45rem .85rem',
                                fontSize: '.85rem',
                                borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                              }}
                            >
                              <CheckCircle size={13} color="var(--color-success, #16a34a)" style={{ flexShrink: 0 }} aria-hidden="true" />
                              <span style={{ fontWeight: 600, minWidth: 100 }}>{item.name}</span>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '.8rem' }}>{item.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {!applyResult && (
                  <>
                    {/* ── Champs de configuration globale ── */}
                    {config?.globalFields && config.globalFields.length > 0 && (
                      <div
                        style={{
                          background: 'var(--color-bg-subtle, #f8fafc)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                          padding: '.9rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '.75rem',
                        }}
                      >
                        <h3 style={{ fontSize: '.88rem', fontWeight: 700, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                          <SlidersHorizontal size={14} aria-hidden="true" />
                          Configuration de l'action
                        </h3>
                        {config.globalFields.map(field => (
                          <GlobalField
                            key={field.key}
                            field={field}
                            value={globalConfig[field.key]}
                            onChange={val => setGlobalConfig(prev => ({ ...prev, [field.key]: val }))}
                          />
                        ))}
                        {/* Résumé règle automatisation */}
                        {autoSummary && (
                          <p
                            style={{
                              margin: 0,
                              padding: '.45rem .7rem',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '.82rem',
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                            }}
                          >
                            📋 {autoSummary}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── Sélection des objets compatibles ── */}
                    <div>
                      <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '.9rem', fontWeight: 700 }}>
                          Objets compatibles ({compatibleDevices.length})
                        </h3>
                        {config?.compatibleTypes && (
                          <span className="form-hint">— {config.compatibleTypes.join(', ')}</span>
                        )}
                      </div>

                      {compatibleDevices.length === 0 ? (
                        <p className="form-hint">Aucun objet compatible dans votre maison pour ce service.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', maxHeight: 280, overflowY: 'auto' }}>
                          {compatibleDevices.map(device => {
                            const checked = selectedDeviceIds.includes(device.id);
                            const pf = config?.perDeviceField;
                            return (
                              <label
                                key={device.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '.7rem',
                                  padding: '.55rem .8rem',
                                  border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                  borderRadius: 'var(--radius-sm)',
                                  background: checked ? '#dbeafe' : '#f8fafc',
                                  cursor: 'pointer',
                                  transition: 'all var(--transition)',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleDeviceId(device.id)}
                                  style={{ accentColor: 'var(--color-primary)', flexShrink: 0 }}
                                />
                                <Cpu size={14} color="var(--color-primary)" aria-hidden="true" style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1, fontWeight: 600, fontSize: '.88rem', minWidth: 80 }}>
                                  {device.name}
                                </span>
                                <span className="badge badge-gray" style={{ fontSize: '.72rem' }}>{device.type}</span>
                                <span
                                  className={`badge ${device.status === 'active' ? 'badge-success' : 'badge-gray'}`}
                                  style={{ fontSize: '.72rem' }}
                                >
                                  {device.status === 'active' ? 'Actif' : 'Inactif'}
                                </span>
                                {device.room && (
                                  <span className="form-hint" style={{ fontSize: '.75rem', flexShrink: 0 }}>
                                    📍 {device.room}
                                  </span>
                                )}
                                {/* État actuel des réglages pertinents */}
                                {device.settings?.temperature_consigne && (
                                  <span className="form-hint" style={{ fontSize: '.75rem', flexShrink: 0 }}>
                                    🌡 {device.settings.temperature_consigne} °C
                                  </span>
                                )}
                                {device.settings?.mode_securite && (
                                  <span className="form-hint" style={{ fontSize: '.75rem', flexShrink: 0 }}>
                                    🔒 {device.settings.mode_securite}
                                  </span>
                                )}
                                {device.settings?.mode_eco === '1' && (
                                  <span className="badge badge-warning" style={{ fontSize: '.7rem' }}>éco</span>
                                )}
                                {device.settings?.automatisation === 'active' && (
                                  <span className="badge badge-primary" style={{ fontSize: '.7rem' }}>auto</span>
                                )}
                                {/* Champ par objet (ex: température individuelle) */}
                                {pf && checked && (
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '.4rem', width: '100%', paddingTop: '.35rem' }}
                                    onClick={e => e.preventDefault()}
                                  >
                                    <Thermometer size={13} color="var(--color-primary)" aria-hidden="true" />
                                    <label htmlFor={`dev-${device.id}-${pf.key}`} style={{ fontSize: '.8rem', fontWeight: 600 }}>
                                      {pf.label}
                                    </label>
                                    <input
                                      id={`dev-${device.id}-${pf.key}`}
                                      type={pf.type}
                                      className="form-input"
                                      value={deviceConfigs[device.id]?.[pf.key] ?? globalConfig[pf.key] ?? pf.default}
                                      min={pf.min}
                                      max={pf.max}
                                      onChange={e => {
                                        e.stopPropagation();
                                        setDeviceCfgField(device.id, pf.key, e.target.value);
                                      }}
                                      onClick={e => e.stopPropagation()}
                                      style={{ maxWidth: 80, padding: '.2rem .5rem', fontSize: '.85rem' }}
                                    />
                                  </div>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {compatibleDevices.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm mt-2"
                          onClick={selectAll}
                        >
                          {selectedDeviceIds.length === compatibleDevices.length
                            ? 'Tout désélectionner'
                            : 'Tout sélectionner'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ── Pied de modal ── */}
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeModal}>Fermer</button>
                {applyResult?.count > 0 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setApplyResult(null);
                      setSelectedDeviceIds([]);
                    }}
                  >
                    Appliquer à d'autres objets
                  </button>
                )}
                {!applyResult && (
                  <button
                    className="btn btn-primary"
                    disabled={applying || selectedDeviceIds.length === 0}
                    onClick={applyService}
                  >
                    <Zap size={15} aria-hidden="true" />
                    {applying
                      ? 'Application…'
                      : `${config?.actionLabel ?? 'Appliquer'} (${selectedDeviceIds.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
