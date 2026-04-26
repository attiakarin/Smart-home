export function mapStatusToApi(status) {
  return status === 'Active' ? 'active' : 'inactive';
}

export function mapStatusToDb(status) {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  return status;
}

export function mapDevice(device) {
  if (!device) return null;

  return {
    ...device,
    id: device.id,
    name: device.nom,
    type: device.type_obj,
    brand: device.marque || '',
    room: device.piece_nom || device.room || '',
    roomId: device.piece_id,
    status: mapStatusToApi(device.statut),
    connectivity: device.type_connexion || '',
    signal: device.signal_obj || '',
    battery: device.batterie,
    energyConsumption: Number(device.energie_consommer || 0),
    description: device.description || '',
    lastConnection: device.derniere_connexion,
    createdAt: device.date_creation,
  };
}

export function mapDeviceInput(body) {
  return {
    nom: body.name ?? body.nom,
    type_obj: body.type ?? body.type_obj,
    marque: body.brand ?? body.marque,
    piece_id: body.roomId ?? body.piece_id,
    statut: mapStatusToDb(body.status ?? body.statut),
    type_connexion: body.connectivity ?? body.type_connexion,
    signal_obj: body.signal ?? body.signal_obj,
    batterie: body.battery ?? body.batterie,
    energie_consommer: body.energyConsumption ?? body.energie_consommer,
    description: body.description,
  };
}
