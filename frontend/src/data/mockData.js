// Mock database — objets connectés
export const DEVICES = [
  {
    id: 'dev-001',
    name: 'Thermostat Salon',
    type: 'Thermostat',
    brand: 'Nest',
    room: 'Salon',
    status: 'active',
    connectivity: 'Wi-Fi',
    signal: 'Fort',
    battery: 82,
    currentTemp: 21,
    targetTemp: 23,
    mode: 'Automatique',
    energyConsumption: 1.2,
    lastSeen: '2026-04-03T10:00:00',
    description: 'Thermostat intelligent pour réguler la température du salon.',
    tags: ['température', 'confort', 'énergie'],
    history: generateHistory(30, 18, 24, 'kWh'),
  },
  {
    id: 'dev-002',
    name: 'Caméra Entrée',
    type: 'Caméra',
    brand: 'Ring',
    room: 'Entrée',
    status: 'active',
    connectivity: 'Wi-Fi',
    signal: 'Moyen',
    battery: 47,
    resolution: '1080p',
    motionDetection: true,
    energyConsumption: 0.5,
    lastSeen: '2026-04-03T09:55:00',
    description: "Caméra de surveillance de l'entrée principale.",
    tags: ['sécurité', 'surveillance', 'caméra'],
    history: generateHistory(30, 0, 1, 'événements'),
  },
  {
    id: 'dev-003',
    name: 'Smart Bulb Chambre',
    type: 'Éclairage',
    brand: 'Philips Hue',
    room: 'Chambre',
    status: 'inactive',
    connectivity: 'Zigbee',
    signal: 'Fort',
    battery: null,
    brightness: 0,
    color: '#ffffff',
    energyConsumption: 0.09,
    lastSeen: '2026-04-02T23:15:00',
    description: 'Ampoule connectée avec contrôle de la luminosité et de la couleur.',
    tags: ['éclairage', 'ambiance', 'couleur'],
    history: generateHistory(30, 0, 0.2, 'kWh'),
  },
  {
    id: 'dev-004',
    name: 'Lave-Linge Connecté',
    type: 'Électroménager',
    brand: 'Samsung',
    room: 'Buanderie',
    status: 'active',
    connectivity: 'Wi-Fi',
    signal: 'Fort',
    battery: null,
    currentCycle: 'Coton 60°C',
    remainingTime: 42,
    energyConsumption: 2.1,
    lastSeen: '2026-04-03T09:00:00',
    description: 'Lave-linge avec programmes programmables à distance.',
    tags: ['électroménager', 'lavage', 'énergie'],
    history: generateHistory(30, 0, 3, 'kWh'),
  },
  {
    id: 'dev-005',
    name: 'Aspirateur Robot',
    type: 'Robot',
    brand: 'iRobot Roomba',
    room: 'Salon',
    status: 'inactive',
    connectivity: 'Wi-Fi',
    signal: 'Fort',
    battery: 100,
    lastCleaning: '2026-04-02T18:30:00',
    areaCovered: 45,
    energyConsumption: 0.4,
    lastSeen: '2026-04-02T20:00:00',
    description: 'Aspirateur robot programmable avec carte de la maison.',
    tags: ['nettoyage', 'robot', 'automatisation'],
    history: generateHistory(30, 0, 1, 'cycles'),
  },
  {
    id: 'dev-006',
    name: 'Lave-Vaisselle',
    type: 'Électroménager',
    brand: 'Bosch',
    room: 'Cuisine',
    status: 'active',
    connectivity: 'Wi-Fi',
    signal: 'Moyen',
    battery: null,
    currentCycle: 'Éco 50°C',
    remainingTime: 28,
    energyConsumption: 1.05,
    lastSeen: '2026-04-03T08:30:00',
    description: 'Lave-vaisselle connecté avec démarrage différé.',
    tags: ['électroménager', 'cuisine', 'water'],
    history: generateHistory(30, 0, 1.5, 'kWh'),
  },
  {
    id: 'dev-007',
    name: 'Serrure Connectée',
    type: 'Sécurité',
    brand: 'Yale',
    room: 'Entrée',
    status: 'active',
    connectivity: 'Bluetooth',
    signal: 'Fort',
    battery: 63,
    locked: true,
    accessLog: 15,
    energyConsumption: 0.02,
    lastSeen: '2026-04-03T07:45:00',
    description: 'Serrure intelligente avec accès par code ou smartphone.',
    tags: ['sécurité', 'accès', 'serrure'],
    history: generateHistory(30, 0, 5, 'accès'),
  },
  {
    id: 'dev-008',
    name: 'Capteur CO₂ Cuisine',
    type: 'Capteur',
    brand: 'Airthings',
    room: 'Cuisine',
    status: 'active',
    connectivity: 'Wi-Fi',
    signal: 'Fort',
    battery: 90,
    co2Level: 612,
    humidity: 58,
    temperature: 22,
    energyConsumption: 0.01,
    lastSeen: '2026-04-03T10:05:00',
    description: 'Capteur de qualité de l\'air mesurant CO₂, humidité et température.',
    tags: ['qualité air', 'capteur', 'santé'],
    history: generateHistory(30, 400, 900, 'ppm'),
  },
  {
    id: 'dev-009',
    name: 'Panneau Solaire',
    type: 'Énergie',
    brand: 'SolarEdge',
    room: 'Toit',
    status: 'active',
    connectivity: 'Wi-Fi',
    signal: 'Fort',
    battery: null,
    powerOutput: 3.4,
    dailyProduction: 12.8,
    energyConsumption: -12.8,
    lastSeen: '2026-04-03T10:00:00',
    description: 'Panneau solaire photovoltaïque avec monitoring en temps réel.',
    tags: ['énergie', 'solaire', 'production'],
    history: generateHistory(30, 5, 20, 'kWh'),
  },
  {
    id: 'dev-010',
    name: 'Thermostat Chambre',
    type: 'Thermostat',
    brand: 'Honeywell',
    room: 'Chambre',
    status: 'active',
    connectivity: 'Wi-Fi',
    signal: 'Fort',
    battery: 75,
    currentTemp: 19,
    targetTemp: 20,
    mode: 'Nuit',
    energyConsumption: 0.8,
    lastSeen: '2026-04-03T09:30:00',
    description: 'Thermostat intelligent programmable pour la chambre.',
    tags: ['température', 'confort', 'chambre'],
    history: generateHistory(30, 17, 23, 'kWh'),
  },
];

function generateHistory(days, min, max, unit) {
  const history = [];
  const now = new Date('2026-04-03');
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    history.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat((Math.random() * (max - min) + min).toFixed(2)),
      unit,
    });
  }
  return history;
}

// Mock database — utilisateurs
export const USERS = [
  {
    id: 'usr-001',
    login: 'admin_martin',
    password: 'Admin2026!',
    nom: 'Martin',
    prenom: 'Sophie',
    email: 'sophie.martin@smarthome.fr',
    age: 42,
    sexe: 'Femme',
    dateNaissance: '1984-03-15',
    role: 'père',
    niveau: 'expert',
    points: 42.5,
    photo: null,
    status: 'approved',
    connexions: 120,
    actions: 85,
    lastLogin: '2026-04-03T08:00:00',
    loginHistory: generateLoginHistory(30),
  },
  {
    id: 'usr-002',
    login: 'jerome_m',
    password: 'Maison2026!',
    nom: 'Martin',
    prenom: 'Jérôme',
    email: 'jerome.martin@smarthome.fr',
    age: 44,
    sexe: 'Homme',
    dateNaissance: '1982-07-22',
    role: 'père',
    niveau: 'avancé',
    points: 18.75,
    photo: null,
    status: 'approved',
    connexions: 75,
    actions: 60,
    lastLogin: '2026-04-02T20:00:00',
    loginHistory: generateLoginHistory(30),
  },
  {
    id: 'usr-003',
    login: 'lea_martin',
    password: 'Lea2026!',
    nom: 'Martin',
    prenom: 'Léa',
    email: 'lea.martin@smarthome.fr',
    age: 16,
    sexe: 'Femme',
    dateNaissance: '2010-01-10',
    role: 'enfant',
    niveau: 'intermédiaire',
    points: 8.5,
    photo: null,
    status: 'approved',
    connexions: 34,
    actions: 28,
    lastLogin: '2026-04-03T07:30:00',
    loginHistory: generateLoginHistory(30),
  },
  {
    id: 'usr-004',
    login: 'tom_m',
    password: 'Tom2026!',
    nom: 'Martin',
    prenom: 'Tom',
    email: 'tom.martin@smarthome.fr',
    age: 12,
    sexe: 'Homme',
    dateNaissance: '2014-06-05',
    role: 'enfant',
    niveau: 'débutant',
    points: 2.25,
    photo: null,
    status: 'approved',
    connexions: 9,
    actions: 5,
    lastLogin: '2026-04-01T18:00:00',
    loginHistory: generateLoginHistory(30),
  },
  {
    id: 'usr-005',
    login: 'emma_b',
    password: 'Emma2026!',
    nom: 'Bertrand',
    prenom: 'Emma',
    email: 'emma.b@smarthome.fr',
    age: 28,
    sexe: 'Femme',
    dateNaissance: '1998-11-20',
    role: 'mère',
    niveau: 'débutant',
    points: 0.75,
    photo: null,
    status: 'pending',
    connexions: 3,
    actions: 1,
    lastLogin: null,
    loginHistory: [],
  },
];

function generateLoginHistory(days) {
  const history = [];
  const now = new Date('2026-04-03');
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (Math.random() > 0.4) {
      history.push({
        date: date.toISOString().split('T')[0],
        connexions: Math.floor(Math.random() * 4) + 1,
      });
    }
  }
  return history;
}

// Événements locaux (module Information visiteur)
export const EVENTS = [
  { id: 'evt-001', title: 'Marché de Printemps', type: 'Marché', date: '2026-04-05', location: 'Place du Village', description: 'Marché artisanal avec produits locaux.' },
  { id: 'evt-002', title: 'Concert Jazz en Plein Air', type: 'Concert', date: '2026-04-12', location: 'Parc Municipal', description: 'Soirée jazz avec des artistes locaux.' },
  { id: 'evt-003', title: 'Atelier Jardinage', type: 'Atelier', date: '2026-04-08', location: 'Centre Culturel', description: 'Conseils pour un jardin connecté et éco-responsable.' },
  { id: 'evt-004', title: 'Festival des Lumières', type: 'Festival', date: '2026-04-20', location: 'Rue Principale', description: 'Spectacle de lumières et animations pour toute la famille.' },
  { id: 'evt-005', title: 'Expo Smart Home', type: 'Exposition', date: '2026-04-25', location: 'Salle Polyvalente', description: 'Découvrez les dernières innovations en domotique.' },
];

// Lieux d'intérêt
export const PLACES = [
  { id: 'plc-001', name: 'Parc Municipal', type: 'Parc', distance: 0.3, horaires: '7h-22h', free: true, description: 'Grand parc vert avec aire de jeux et espace sportif.' },
  { id: 'plc-002', name: 'Bibliothèque Municipale', type: 'Bibliothèque', distance: 0.8, horaires: '9h-19h', free: true, description: 'Grande bibliothèque avec espace numérique.' },
  { id: 'plc-003', name: 'Musée de la Ville', type: 'Musée', distance: 1.2, horaires: '10h-18h', free: false, description: 'Histoire de la ville et expositions temporaires.' },
  { id: 'plc-004', name: 'Restaurant Le Terroir', type: 'Restaurant', distance: 0.5, horaires: '12h-22h', free: false, description: 'Cuisine du terroir avec produits frais.' },
  { id: 'plc-005', name: 'Piscine Municipale', type: 'Sport', distance: 1.5, horaires: '7h-21h', free: false, description: 'Piscine olympique couverte.' },
];

// Horaires transports
export const TRANSPORTS = [
  { id: 'tr-001', line: 'Bus 12', direction: 'Centre-Ville', nextDepartures: ['10:15', '10:35', '11:05'], type: 'Bus' },
  { id: 'tr-002', line: 'Bus 7', direction: 'Gare SNCF', nextDepartures: ['10:22', '10:52', '11:22'], type: 'Bus' },
  { id: 'tr-003', line: 'Tram A', direction: 'Université', nextDepartures: ['10:08', '10:18', '10:28'], type: 'Tramway' },
  { id: 'tr-004', line: 'Vélo+', direction: 'Station Parc', nextDepartures: ['Disponible'], type: 'Vélo' },
];

// Niveaux d'utilisateur
export const LEVELS = {
  débutant:      { points: 0,    label: 'Débutant',      color: '#6b7280' },
  intermédiaire: { points: 5,    label: 'Intermédiaire', color: '#3b82f6' },
  avancé:        { points: 15,   label: 'Avancé',        color: '#8b5cf6' },
  expert:        { points: 30,   label: 'Expert',        color: '#f59e0b' },
};

export const POINTS_CONFIG = {
  connexion: 0.25,
  consultation: 0.50,
};

// Pièces de la maison
export const ROOMS = [
  'Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Buanderie', 'Garage', 'Entrée', 'Bureau', 'Toit',
];

export const DEVICE_TYPES = [
  'Thermostat', 'Caméra', 'Éclairage', 'Électroménager', 'Robot', 'Sécurité', 'Capteur', 'Énergie',
];
