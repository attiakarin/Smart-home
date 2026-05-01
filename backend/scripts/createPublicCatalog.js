import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
});

const PUBLIC_CATALOG_ITEMS = [
  {
    nom: 'Thermostat Nest',
    type_obj: 'Thermostat',
    marque: 'Google Nest',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Fort',
    energie_consommer: 0.5,
    description: "Thermostat intelligent Google Nest pour un confort thermique optimal.",
    photo: 'https://lh3.googleusercontent.com/tuge8YeDXyA89OHEXIJljJXXUo_s57_GERNC2J0DMwWhOqY6frchd_t7817Dm4e190dHptdilzFHmnqvW2Gdv3Pxnr3dXVUybn5jQio',
    feature: 'confort',
  },
  {
    nom: 'Detecteur Nest Protect',
    type_obj: 'Detecteur de fumee',
    marque: 'Google Nest',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Bon',
    energie_consommer: 0.2,
    description: "Detecteur de fumee et de monoxyde de carbone connecte avec alertes intelligentes.",
    photo: 'https://lh3.googleusercontent.com/zOLfrH4_-sVBy1_FsTzzGcdjrLIDuOJv_SFxk-CroSN-FE1MoLWZ2Bw1UNyIJH5eNQ0=w400',
    feature: 'sécurité',
  },
  {
    nom: 'Camera Ring Indoor',
    type_obj: 'Camera',
    marque: 'Ring',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Fort',
    energie_consommer: 0.3,
    description: "Camera de surveillance Ring avec detection de mouvement et vision nocturne.",
    photo: 'https://images.ctfassets.net/2xsswpd01u70/variant-60718173585755-fr-fr/3766b19469770aeb3d123cbf4a426f93/variant-60718173585755-fr-fr.jpg',
    feature: 'sécurité',
  },
  {
    nom: 'Ampoule Philips Hue',
    type_obj: 'Eclairage',
    marque: 'Philips Hue',
    type_connexion: 'Bluetooth',
    signal_obj: 'Bon',
    energie_consommer: 0.1,
    description: "Ampoule connectee Philips Hue avec des millions de couleurs et controle intelligent.",
    photo: 'https://www.assets.signify.com/is/image/Signify/046677590826-929003853701-Hue-WCA-810-A19-E26-1P-NAM-RTP',
    feature: 'confort',
  },
  {
    nom: 'Machine a linge Samsung',
    type_obj: 'Electromenager',
    marque: 'Samsung',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Fort',
    energie_consommer: 2.0,
    description: "Machine a linge connectee Samsung avec programmes pilotables a distance.",
    photo: 'https://image-us.samsung.com/SamsungUS/home/home-appliances/washers/bespoke/wf90f53adsa5/gallery/360/WF90F53ADSA5-00.jpg',
    feature: 'énergie',
  },
  {
    nom: 'Tele Samsung 55"',
    type_obj: 'Television',
    marque: 'Samsung',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Fort',
    energie_consommer: 0.35,
    description: "Televiseur Samsung connecte avec acces aux services et reglages intelligents.",
    photo: 'https://image-us.samsung.com/SamsungUS/home/television-home-theater/tvs/qled-4k-tvs/10142024/QN55Q70DAFXZA-S.COM_Version_1_V01.jpg',
    feature: 'confort',
  },
  {
    nom: 'Aspirateur Dyson',
    type_obj: 'Robot aspirateur',
    marque: 'Dyson',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Bon',
    energie_consommer: 1.8,
    description: "Aspirateur connecte Dyson pour le nettoyage automatise de la maison.",
    photo: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6451/6451330_sd.jpg',
    feature: 'énergie',
  },
  {
    nom: 'Cafetiere Samsung',
    type_obj: 'Cafetiere',
    marque: 'Samsung',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Bon',
    energie_consommer: 0.8,
    description: "Cafetiere Samsung connectee pour preparer le cafe depuis la maison intelligente.",
    photo: 'https://images.samsung.com/kdp/cms_task/C20260213000012/47784/7bbace97-c53d-41c8-a5f6-1bc34af52926.jpg?$FB_TYPE_A_JPG$',
    feature: 'confort',
  },
  {
    nom: 'Plaque de cuisson Bosch',
    type_obj: 'Plaque de cuisson',
    marque: 'Bosch',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Fort',
    energie_consommer: 1.5,
    description: "Plaque de cuisson Bosch connectee compatible avec le pilotage a distance.",
    photo: 'https://media3.bosch-home.com/Product_Shots/1600x900/MCSA03303465_NIT8660UC_STP_def.webp',
    feature: 'confort',
  },
  {
    nom: 'Prise connectee Philips Hue',
    type_obj: 'Prise',
    marque: 'Philips Hue',
    type_connexion: 'Bluetooth',
    signal_obj: 'Bon',
    energie_consommer: 0.05,
    description: "Prise connectee Philips Hue Smart Plug controlable en Bluetooth ou via l'ecosystem Hue.",
    photo: 'https://www.assets.signify.com/is/image/Signify/046677552343_929002240601_p0-RTP',
    feature: 'énergie',
  },
  {
    nom: 'Serrure August Smart Lock',
    type_obj: 'Serrure',
    marque: 'August',
    type_connexion: 'Bluetooth',
    signal_obj: 'Bon',
    energie_consommer: 0.15,
    description: "Serrure connectee August pour securiser l'acces a votre domicile intelligemment.",
    photo: 'https://cdn.shopify.com/s/files/1/1354/7835/products/August_Wi-Fi_Smart_Lock_1.png?v=1578361895',
    feature: 'sécurité',
  },
  {
    nom: 'Capteur Netatmo',
    type_obj: 'Capteur',
    marque: 'Netatmo',
    type_connexion: 'Wi-Fi',
    signal_obj: 'Bon',
    energie_consommer: 0.1,
    description: "Capteur Netatmo pour mesurer temperature, humidite et qualite de l'air.",
    photo: 'https://www.netatmo.com/img/2cd433b6-b2cd-4776-aecb-1dae619de5db',
    feature: 'suivi',
  },
];

async function main() {
  try {
    console.log('Création de la table catalogue_visiteur...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogue_visiteur (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(150) NOT NULL,
        type_obj VARCHAR(80) NOT NULL,
        marque VARCHAR(100),
        type_connexion VARCHAR(50),
        signal_obj VARCHAR(20),
        energie_consommer NUMERIC(10,2) DEFAULT 0,
        description TEXT,
        photo TEXT,
        feature VARCHAR(50),
        date_creation TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✓ Table créée avec succès');

    // Vérifier combien d'éléments existent déjà
    const { rows: existing } = await pool.query('SELECT COUNT(*) FROM catalogue_visiteur');
    const existingCount = parseInt(existing[0].count);
    console.log(`Éléments existants: ${existingCount}`);

    if (existingCount === 0) {
      console.log('Insertion des 12 objets du catalogue...');
      for (let i = 0; i < PUBLIC_CATALOG_ITEMS.length; i++) {
        const item = PUBLIC_CATALOG_ITEMS[i];
        await pool.query(
          `INSERT INTO catalogue_visiteur (nom, type_obj, marque, type_connexion, signal_obj, energie_consommer, description, photo, feature)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            item.nom,
            item.type_obj,
            item.marque,
            item.type_connexion,
            item.signal_obj,
            item.energie_consommer,
            item.description,
            item.photo,
            item.feature,
          ]
        );
        console.log(`  ${i + 1}/12 - ${item.nom} ✓`);
      }
      console.log('✓ Tous les objets ont été insérés');
    } else {
      console.log('Le catalogue contient déjà des données, insertion ignorée');
    }

    const { rows: final } = await pool.query('SELECT COUNT(*) FROM catalogue_visiteur');
    console.log(`\nTotal dans le catalogue visiteur: ${final[0].count} objets`);

  } catch (err) {
    console.error('Erreur:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
