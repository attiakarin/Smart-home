import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const FORCE = process.argv.includes('--force');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
});

const OFFICIAL_PHOTOS = [
  {
    key: 'nest-thermostat',
    matches: ['nest thermostat', 'thermostat nest'],
    imageUrl: 'https://lh3.googleusercontent.com/tuge8YeDXyA89OHEXIJljJXXUo_s57_GERNC2J0DMwWhOqY6frchd_t7817Dm4e190dHptdilzFHmnqvW2Gdv3Pxnr3dXVUybn5jQio',
    sourcePage: 'https://store.google.com/us/product/nest_learning_thermostat_4th_gen',
  },
  {
    key: 'nest-protect',
    matches: ['nest protect', 'detecteur nest', 'détecteur nest', 'detecteur fumee', 'détecteur fumée'],
    imageUrl: 'https://lh3.googleusercontent.com/zOLfrH4_-sVBy1_FsTzzGcdjrLIDuOJv_SFxk-CroSN-FE1MoLWZ2Bw1UNyIJH5eNQ0=w400',
    sourcePage: 'https://support.google.com/googlenest/answer/9229922',
  },
  {
    key: 'ring-camera',
    matches: ['ring camera', 'camera ring', 'caméra ring', 'camera', 'caméra'],
    imageUrl: 'https://images.ctfassets.net/2xsswpd01u70/variant-60718173585755-fr-fr/3766b19469770aeb3d123cbf4a426f93/variant-60718173585755-fr-fr.jpg',
    sourcePage: 'https://ring.com/products/pan-tilt-indoor-cam',
  },
  {
    key: 'philips-hue-bulb',
    matches: ['philips hue', 'eclairage philips', 'éclairage philips', 'ampoule', 'eclairage', 'éclairage'],
    imageUrl: 'https://www.assets.signify.com/is/image/Signify/046677590826-929003853701-Hue-WCA-810-A19-E26-1P-NAM-RTP',
    sourcePage: 'https://www.philips-hue.com/en-us/p/hue-white-and-color-ambiance-60w-a19-e26-smart-bulb/046677590826',
  },
  {
    key: 'samsung-washer',
    matches: ['samsung lave', 'samsung machine', 'lave-linge', 'lave linge', 'machine a laver', 'machine à laver', 'machine a linge', 'machine à linge'],
    imageUrl: 'https://image-us.samsung.com/SamsungUS/home/home-appliances/washers/bespoke/wf90f53adsa5/gallery/360/WF90F53ADSA5-00.jpg',
    sourcePage: 'https://www.samsung.com/us/home-appliances/washers/bespoke/bespoke-5-3-cu-ft-ultra-capacity-ai-front-load-washer-with-ai-home-and-ai-optiwash-in-dark-steel-wf90f53adsa5/',
  },
  {
    key: 'samsung-tv',
    matches: ['samsung tv', 'tele samsung', 'télé samsung', 'televiseur samsung', 'téléviseur samsung', 'television samsung', 'télévision samsung'],
    imageUrl: 'https://image-us.samsung.com/SamsungUS/home/television-home-theater/tvs/qled-4k-tvs/10142024/QN55Q70DAFXZA-S.COM_Version_1_V01.jpg',
    sourcePage: 'https://www.samsung.com/us/televisions-home-theater/tvs/qled-4k-tvs/55-class-qled-4k-q70d-qn55q70dafxza.html',
  },
  {
    key: 'dyson-vacuum',
    matches: ['dyson aspirateur', 'aspirateur dyson', 'robot vacuum', 'aspirateur'],
    imageUrl: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6451/6451330_sd.jpg',
    sourcePage: 'https://www.dyson.com/vacuum-cleaners/cordless/v15',
  },
  {
    key: 'samsung-coffee-maker',
    matches: ['samsung cafe', 'samsung café', 'cafetiere samsung', 'cafetière samsung', 'brewer kit samsung'],
    imageUrl: 'https://images.samsung.com/kdp/cms_task/C20260213000012/47784/7bbace97-c53d-41c8-a5f6-1bc34af52926.jpg?$FB_TYPE_A_JPG$',
    sourcePage: 'https://www.samsung.com/sec/kitchen-accessories/brewer-kit-RA-F00BAA/RA-F00BAA/',
  },
  {
    key: 'bosch-cooktop',
    matches: ['bosch plaque', 'plaque bosch', 'plaque de cuisson', 'table de cuisson', 'cuisson bosch', 'bosch energie', 'bosch énergie', 'energie bosch', 'énergie bosch'],
    imageUrl: 'https://media3.bosch-home.com/Product_Shots/1600x900/MCSA03303465_NIT8660UC_STP_def.webp',
    sourcePage: 'https://www.bosch-home.com/us/experience-bosch/home-connect',
  },
  {
    key: 'philips-hue-smart-plug',
    matches: ['philips hue prise', 'philips hue smart plug', 'prise connectee philips', 'prise connectée philips', 'smart plug philips', 'smart plug'],
    imageUrl: 'https://www.assets.signify.com/is/image/Signify/046677552343_929002240601_p0-RTP',
    sourcePage: 'https://www.philips-hue.com/en-us/p/hue-smart-plug/046677552343',
  },
  {
    key: 'tp-link-smart-plug',
    matches: ['tp-link prise', 'prise tp-link', 'prise intelligente', 'smart plug', 'prise'],
    imageUrl: 'https://static.tp-link.com/upload/image-line/KP125M_1.0_large_20221228024437g.jpg',
    sourcePage: 'https://www.tp-link.com/us/home-networking/smart-plug/kp125m/',
  },
  {
    key: 'august-lock',
    matches: ['august serrure', 'serrure august', 'serrure', 'securite august', 'sécurité august'],
    imageUrl: 'https://cdn.shopify.com/s/files/1/1354/7835/products/August_Wi-Fi_Smart_Lock_1.png?v=1578361895',
    sourcePage: 'https://august.com/products/august-wifi-smart-lock',
  },
  {
    key: 'netatmo-sensor',
    matches: ['netatmo capteur', 'capteur netatmo', 'capteur', 'temperature humidity', 'température humidité'],
    imageUrl: 'https://www.netatmo.com/img/2cd433b6-b2cd-4776-aecb-1dae619de5db',
    sourcePage: 'https://www.netatmo.com/smart-weather-station',
  },
  {
    key: 'amazon-echo',
    matches: ['amazon echo', 'echo dot', 'alexa'],
    imageUrl: 'https://m.media-amazon.com/images/I/714Rq4k05UL._AC_SL1500_.jpg',
    sourcePage: 'https://www.amazon.com/echo-dot/',
  },
];

function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function classifyDevice(device) {
  const haystack = normalize(`${device.nom || ''} ${device.type_obj || ''} ${device.marque || ''}`);
  const type = normalize(device.type_obj || '');
  const brand = normalize(device.marque || '');
  const name = normalize(device.nom || '');

  if (brand.includes('ring') || type.includes('camera') || name.includes('camera')) return 'ring-camera';
  if (type.includes('eclairage') || name.includes('ampoule')) return 'philips-hue-bulb';
  if ((brand.includes('philips') || brand.includes('philips hue')) && (name.includes('prise') || name.includes('smart plug') || type.includes('prise'))) return 'philips-hue-smart-plug';
  if (brand.includes('tp-link') || type.includes('prise')) return 'tp-link-smart-plug';
  if (brand.includes('august') || type.includes('serrure') || type.includes('securite')) return 'august-lock';
  if (brand.includes('netatmo') || type.includes('capteur')) return 'netatmo-sensor';
  if (brand.includes('bosch') && (name.includes('plaque') || type.includes('cuisson') || type.includes('energie'))) return 'bosch-cooktop';
  if (brand.includes('dyson') || name.includes('aspirateur')) return 'dyson-vacuum';
  if (brand.includes('samsung') && (name.includes('cafe') || name.includes('café') || name.includes('cafetiere') || name.includes('cafetière') || type.includes('cafetiere') || type.includes('cafetière'))) return 'samsung-coffee-maker';
  if (brand.includes('samsung') && (name.includes('tele') || name.includes('télé') || name.includes('tv') || type.includes('television') || type.includes('télévision'))) return 'samsung-tv';
  if (type.includes('detecteur')) return 'nest-protect';
  if (brand.includes('nest') || (!brand && type.includes('thermostat'))) return 'nest-thermostat';
  if (type.includes('thermostat')) return null;
  if (name.includes('alexa') || name.includes('echo')) return 'amazon-echo';
  if (name.includes('machine a laver') || name.includes('lave-linge')) return 'samsung-washer';
  if (brand.includes('samsung') && type.includes('electromenager')) return 'samsung-washer';

  return OFFICIAL_PHOTOS.find(item => item.matches.some(match => haystack.includes(normalize(match))))?.key || null;
}

function getOfficialPhoto(device) {
  const key = classifyDevice(device);
  return OFFICIAL_PHOTOS.find(item => item.key === key) || null;
}

async function assertImageReachable(imageUrl) {
  const response = await fetch(imageUrl, {
    method: 'HEAD',
    redirect: 'follow',
    headers: {
      'User-Agent': 'SmartHomeStudentProject/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`image HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`contenu non image: ${contentType || 'inconnu'}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est manquant dans backend/.env');
  }

  await pool.query('ALTER TABLE objets ADD COLUMN IF NOT EXISTS photo TEXT');
  await pool.query(`
    UPDATE objets
    SET marque = 'Dyson'
    WHERE LOWER(marque) = 'daison'
  `);
  await pool.query(`
    UPDATE objets
    SET type_obj = 'Assistant vocal', marque = 'Amazon'
    WHERE LOWER(nom) = 'alexa'
  `);
  await pool.query(`
    UPDATE objets
    SET nom = 'Machine à linge Samsung',
        type_obj = 'Électroménager',
        marque = 'Samsung',
        description = 'Machine à linge connectée Samsung avec programmes pilotables à distance.'
    WHERE LOWER(nom) IN ('machine à laver', 'machine a laver', 'machine à linge samsung', 'machine a linge samsung', 'machine à laver samsung', 'machine a laver samsung')
       OR (LOWER(marque) = 'samsung' AND LOWER(type_obj) LIKE '%lectrom%nager%')
  `);
  await pool.query(`
    WITH doublons AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rang
      FROM objets
      WHERE LOWER(nom) IN ('machine à linge samsung', 'machine a linge samsung')
        AND LOWER(marque) = 'samsung'
    )
    UPDATE objets
    SET nom = 'Cafetière Samsung',
        type_obj = 'Cafetière',
        marque = 'Samsung',
        type_connexion = COALESCE(type_connexion, 'Wi-Fi'),
        energie_consommer = COALESCE(NULLIF(energie_consommer, 0), 0.8),
        description = 'Cafetière Samsung connectée pour préparer le café depuis la maison intelligente.'
    WHERE id IN (SELECT id FROM doublons WHERE rang > 1)
  `);
  await pool.query(`
    WITH doublons AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rang
      FROM objets
      WHERE LOWER(nom) IN ('cafetière samsung', 'cafetiere samsung')
        AND LOWER(marque) = 'samsung'
    )
    DELETE FROM historique_objet
    USING doublons
    WHERE historique_objet.objt_id = doublons.id
      AND doublons.rang > 1
  `);
  await pool.query(`
    WITH doublons AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rang
      FROM objets
      WHERE LOWER(nom) IN ('cafetière samsung', 'cafetiere samsung')
        AND LOWER(marque) = 'samsung'
    )
    DELETE FROM config_objet
    USING doublons
    WHERE config_objet.objet_id = doublons.id
      AND doublons.rang > 1
  `);
  await pool.query(`
    WITH doublons AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rang
      FROM objets
      WHERE LOWER(nom) IN ('cafetière samsung', 'cafetiere samsung')
        AND LOWER(marque) = 'samsung'
    )
    DELETE FROM objets
    USING doublons
    WHERE objets.id = doublons.id
      AND doublons.rang > 1
  `);
  await pool.query(`
    UPDATE objets
    SET nom = 'Télé Samsung',
        type_obj = 'Télévision',
        marque = 'Samsung',
        type_connexion = COALESCE(type_connexion, 'Wi-Fi'),
        description = 'Téléviseur Samsung connecté avec accès aux services et réglages intelligents.'
    WHERE LOWER(nom) IN ('tele samsung', 'télé samsung', 'tv samsung', 'television samsung', 'télévision samsung')
  `);
  await pool.query(`
    INSERT INTO objets (
      maison_id, nom, type_obj, marque, piece_id, statut, type_connexion,
      signal_obj, batterie, energie_consommer, description, derniere_connexion, date_creation
    )
    SELECT
      (SELECT maison_id FROM objets WHERE maison_id IS NOT NULL LIMIT 1),
      'Télé Samsung',
      'Télévision',
      'Samsung',
      (SELECT id FROM piece_maison WHERE nom = 'Salon' LIMIT 1),
      'Active'::statut_objet_enum,
      'Wi-Fi',
      'Fort',
      NULL,
      0.35,
      'Téléviseur Samsung connecté avec accès aux services et réglages intelligents.',
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM objets
      WHERE LOWER(nom) IN ('tele samsung', 'télé samsung', 'tv samsung', 'television samsung', 'télévision samsung')
    )
  `);
  await pool.query(`
    UPDATE objets
    SET nom = 'Aspirateur Dyson',
        type_obj = 'Robot',
        marque = 'Dyson',
        description = 'Aspirateur connecté Dyson pour le nettoyage automatisé de la maison.'
    WHERE LOWER(nom) LIKE '%aspirateur%'
       OR LOWER(marque) IN ('dyson', 'irobot roomba')
  `);
  await pool.query(`
    UPDATE objets
    SET nom = 'Caméra de surveillance',
        type_obj = 'Caméra',
        marque = COALESCE(NULLIF(marque, ''), 'Ring'),
        description = 'Caméra de surveillance connectée avec détection de mouvement.'
    WHERE LOWER(type_obj) LIKE '%cam%ra%'
       OR LOWER(nom) LIKE '%camera%'
       OR LOWER(nom) LIKE '%caméra%'
  `);
  await pool.query(`
    UPDATE objets
    SET nom = 'Philips Hue Prise Connectée Smart Plug',
        type_obj = 'Prise',
        marque = 'Philips Hue',
        type_connexion = COALESCE(type_connexion, 'Bluetooth'),
        description = 'Prise connectée Philips Hue Smart Plug contrôlable en Bluetooth ou via l’écosystème Hue.'
    WHERE LOWER(marque) IN ('philips', 'phillips')
      AND (LOWER(type_obj) LIKE '%thermostat%'
        OR LOWER(type_obj) LIKE '%sèche-serviette%'
        OR LOWER(type_obj) LIKE '%seche-serviette%'
        OR LOWER(nom) LIKE '%sèche-serviette%'
        OR LOWER(nom) LIKE '%seche-serviette%')
  `);
  await pool.query(`
    UPDATE objets
    SET nom = 'Plaque de cuisson connectée',
        type_obj = 'Plaque de cuisson',
        marque = 'Bosch',
        description = 'Plaque de cuisson Bosch connectée compatible avec le pilotage à distance.'
    WHERE LOWER(marque) = 'bosch'
      AND (LOWER(type_obj) LIKE '%energie%' OR LOWER(type_obj) LIKE '%énergie%' OR LOWER(nom) LIKE '%plaque%')
  `);
  await pool.query(`
    UPDATE objets
    SET marque = 'Philips'
    WHERE LOWER(marque) = 'phillips'
  `);

  const { rows: devices } = await pool.query(
    `SELECT id, nom, type_obj, marque, photo
     FROM objets
     ORDER BY id`
  );

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const device of devices) {
    if (device.photo && !FORCE) {
      skipped += 1;
      console.log(`- ignore #${device.id} ${device.nom}: photo deja presente`);
      continue;
    }

    const officialPhoto = getOfficialPhoto(device);
    if (!officialPhoto) {
      missing += 1;
      if (FORCE) {
        await pool.query('UPDATE objets SET photo = NULL WHERE id = $1', [device.id]);
      }
      console.warn(`- aucune source officielle #${device.id} ${device.nom} (${device.type_obj || 'type inconnu'} / ${device.marque || 'marque inconnue'})`);
      continue;
    }

    try {
      await assertImageReachable(officialPhoto.imageUrl);
      await pool.query('UPDATE objets SET photo = $1 WHERE id = $2', [officialPhoto.imageUrl, device.id]);
      updated += 1;
      console.log(`- photo officielle #${device.id} ${device.nom}: ${officialPhoto.sourcePage}`);
    } catch (error) {
      missing += 1;
      if (FORCE) {
        await pool.query('UPDATE objets SET photo = NULL WHERE id = $1', [device.id]);
      }
      console.warn(`- echec #${device.id} ${device.nom}: ${error.message}`);
    }
  }

  console.log(`Termine: ${updated} photo(s) officielle(s) ajoutee(s), ${skipped} ignoree(s), ${missing} sans correspondance.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
