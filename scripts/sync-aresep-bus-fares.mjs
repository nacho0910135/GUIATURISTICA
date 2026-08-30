import { createClient } from '@supabase/supabase-js';

const API = 'https://datos.aresep.go.cr/ws.datosabiertos/Services/IT/Autobus.svc/ObtenerEstadisticasAutobuses';
const AMBIGUOUS_KEYS = new Set(['san-jose-santa-cecilia', 'cartago-tierra-blanca']);
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const endpointWord = (city) => {
  const words = normalize(city).split(' ').filter((word) => word.length > 2 && word !== 'playa');
  return words.at(-1);
};
const matchesRouteName = (text, routeName) => normalize(routeName).split(' ').filter((word) => word.length > 2 && !['playa', 'por'].includes(word)).every((word) => normalize(text).includes(word));
const atEndpoint = (text, city, endpoint) => {
  const word = endpointWord(city);
  const segments = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[-–—]+/).map((segment) => normalize(segment.replace(/y viceversa/g, ''))).filter(Boolean);
  if (!word) return false;
  return (endpoint === 'start' ? segments[0] : segments.at(-1))?.includes(word) ?? false;
};

async function latestStats() {
  const now = new Date();
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const response = await fetch(`${API}/${date.getFullYear()}/${date.getMonth() + 1}`);
    if (!response.ok) continue;
    const body = await response.json();
    if (body.value?.length) return { period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, rows: body.value };
  }
  throw new Error('ARESEP no devolvió estadísticas recientes de autobús.');
}

function estimate(route, stats) {
  const candidates = stats.filter((row) => {
    const ramal = row.nombreRamal ?? row.nombreRuta ?? '';
    const text = `${row.nombreRuta ?? ''} ${ramal}`;
    const endpointMatch = (atEndpoint(ramal, route.origin_city, 'start') && atEndpoint(ramal, route.destination_city, 'end')) || (atEndpoint(ramal, route.destination_city, 'start') && atEndpoint(ramal, route.origin_city, 'end'));
    return !AMBIGUOUS_KEYS.has(route.source_key) && Number(row.pasajerosRegulares) > 0 && Number(row.ingresos) > 0 && endpointMatch && matchesRouteName(text, route.route_name);
  }).map((row) => ({ ...row, fare: Math.round(Number(row.ingresos) / Number(row.pasajerosRegulares)) }));
  if (candidates.length !== 1) return null;
  return candidates[0];
}

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stats = await latestStats();
const results = [];
let inspected = 0;

for (const table of ['tourist_bus_routes', 'cantonal_bus_routes']) {
  const { data: routes, error } = await supabase.from(table).select('source_key,route_name,origin_city,destination_city,fare_crc,fare_kind').eq('is_published', true).or('fare_crc.is.null,fare_kind.eq.estimated');
  if (error) throw error;
  for (const route of routes ?? []) {
    inspected += 1;
    const match = estimate(route, stats.rows);
    if (!match) continue;
    const { error: updateError } = await supabase.from(table).update({ fare_crc: match.fare, fare_kind: 'estimated', last_verified_at: new Date().toISOString() }).eq('source_key', route.source_key);
    if (updateError) throw updateError;
    results.push({ table, source_key: route.source_key, fare_crc: match.fare, aresep_route: match.nombreRamal });
  }
}

console.log(JSON.stringify({ period: stats.period, source: API, inspected, updated: results.length, results }, null, 2));
