import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const origin = { latitude: 9.932, longitude: -84.08 };
const { data, error } = await supabase
  .from('commercial_services')
  .select('id,title,main_category,location')
  .eq('main_category', 'hospital')
  .limit(1000);
if (error) throw error;
assert(data.length > 0, 'No se encontraron hospitales públicos en la API.');

const rad = (degrees) => degrees * Math.PI / 180;
const distance = (location) => {
  const [longitude, latitude] = location.coordinates;
  const lat = rad(latitude - origin.latitude);
  const lng = rad(longitude - origin.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(rad(origin.latitude)) * Math.cos(rad(latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const sorted = data.map((service) => ({ ...service, distance: distance(service.location) })).sort((a, b) => a.distance - b.distance);
assert(sorted.every((service, index) => index === 0 || service.distance >= sorted[index - 1].distance), 'Los resultados no quedaron ordenados por cercanía.');
console.log(`Asistencia lista: ${sorted.length} hospitales; más cercano a San José: ${sorted[0].title} (${sorted[0].distance.toFixed(1)} km).`);
