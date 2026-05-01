import pool from '../config/db.js';
import dotenv from 'dotenv';
import { computeConsumption, getTopConsumer, saveMonthlyConsumption } from '../routes/house.js';

dotenv.config();

async function main() {
  try {
    const m = await pool.query('SELECT id, nom FROM maisons ORDER BY id LIMIT 1');
    if (!m.rows[0]) {
      console.log('Aucune maison trouvee.');
      return;
    }
    const maisonId = m.rows[0].id;
    console.log('Maison test:', m.rows[0]);

    const consumption = await computeConsumption(maisonId);
    const top = await getTopConsumer(maisonId);
    const config = await pool.query('SELECT budget_kwh FROM maison_config WHERE maison_id = $1', [maisonId]);
    const budget = Number(config.rows[0]?.budget_kwh || 0);
    console.log('Consommation calculee:', consumption);
    console.log('Budget:', budget);
    console.log('Top consumer:', top);

    const result = await saveMonthlyConsumption(maisonId, consumption, budget, top);
    console.log('Result saveMonthlyConsumption:', {
      id: result.id,
      consommation_kwh: result.consommation_kwh,
      budget_kwh: result.budget_kwh,
      maintenance_declenchee: result.maintenance_declenchee,
      alerte_at: result.alerte_at,
      top_objet_nom: result.top_objet_nom,
      top_objet_conso: result.top_objet_conso,
    });

    // Lire dernières demandes_admin
    const dem = await pool.query('SELECT id, titre, message FROM demandes_admin WHERE maison_id = $1 ORDER BY id DESC LIMIT 3', [maisonId]);
    console.log('Dernieres demandes_admin:');
    dem.rows.forEach(d => console.log(d));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
