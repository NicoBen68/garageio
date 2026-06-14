export interface VehicleInfo {
  brand: string; model: string; year: number;
  fuelType: string; color: string; vin: string;
}

export async function fetchVehicleByPlate(plate: string): Promise<VehicleInfo | null> {
  const cleanPlate = plate.replace(/\s|-/g, '').toUpperCase();

  try {
    const response = await fetch(
      `https://api-plaque-immatriculation-siv.p.rapidapi.com/get-vehicule-info?token=TokenDemoRapidapi&host_name=https%3A%2F%2Fapiplaqueimmatriculation.com&immatriculation=${cleanPlate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type':    'application/json',
          'x-rapidapi-host': process.env.EXPO_PUBLIC_PLATE_API_HOST!,
          'x-rapidapi-key':  process.env.EXPO_PUBLIC_PLATE_API_KEY!,
        },
      }
    );

    const data = await response.json();
    const d = data?.data;
    if (!d || d.erreur) return null;

    return {
      brand:    d.marque  || '',
      model:    d.modele  || '',
      year:     parseInt((d.date1erCir_us || '').substring(0, 4)) || 0,
      fuelType: mapFuelType(d.energieNGC || d.type_moteur || ''),
      color:    d.couleur || '',
      vin:      d.vin     || '',
    };
  } catch (error) {
    console.error('Plate API error:', error);
    return null;
  }
}

function mapFuelType(raw: string): string {
  const val = raw.toLowerCase();
  if (val.includes('essence') || val.includes('sp'))     return 'essence';
  if (val.includes('diesel')  || val.includes('gazole')) return 'diesel';
  if (val.includes('hybrid'))                             return 'hybride';
  if (val.includes('electr')  || val.includes('ev'))     return 'electrique';
  if (val.includes('gpl')     || val.includes('lpg'))    return 'gpl';
  return 'autre';
}