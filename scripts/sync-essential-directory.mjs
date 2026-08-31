import { createClient } from '@supabase/supabase-js';

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const query = '[out:json][timeout:120];area(3600287667)->.cr;(nwr["amenity"="embassy"](area.cr);nwr["office"="diplomatic"](area.cr);nwr["aeroway"="aerodrome"](area.cr););out center tags;';
const apply = process.argv.includes('--apply');
const internationalCodes = new Set(['SJO', 'LIR', 'SYQ', 'LIO']);
const directoryOptions = [
  { kind: 'commerce_category', id: 'embassies', label_es: 'Directorio de embajadas', label_en: 'Embassy directory', icon: 'flag-variant', parent_id: null, allowed_targets: null, sort_order: 115, active: true },
  { kind: 'commerce_category', id: 'airports', label_es: 'Aeropuertos', label_en: 'Airports', icon: 'airplane', parent_id: null, allowed_targets: null, sort_order: 120, active: true },
  { kind: 'commerce_subcategory', id: 'embassy', label_es: 'Embajada / consulado', label_en: 'Embassy / consulate', icon: null, parent_id: 'embassies', allowed_targets: null, sort_order: 10, active: true },
  { kind: 'commerce_subcategory', id: 'international_airport', label_es: 'Aeropuerto internacional', label_en: 'International airport', icon: null, parent_id: 'airports', allowed_targets: null, sort_order: 10, active: true },
  { kind: 'commerce_subcategory', id: 'aerodrome', label_es: 'Aeródromo', label_en: 'Aerodrome', icon: null, parent_id: 'airports', allowed_targets: null, sort_order: 20, active: true },
];

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
if (apply) {
  const { error } = await supabase.from('app_options').upsert(directoryOptions, { onConflict: 'kind,id' });
  if (error) throw error;
  console.log('Categorías del directorio verificadas.');
}
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const point = (item) => item.type === 'node' ? item : item.center;

async function sourceRows() {
  const failures = [];
  for (const endpoint of OVERPASS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, { headers: { 'user-agent': 'DescubriendoCR/1.0 (directory sync)' }, signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`${endpoint} respondió ${response.status}`);
        return (await response.json()).elements ?? [];
      } catch (error) {
        failures.push(`${endpoint} (intento ${attempt}): ${error instanceof Error ? error.message : String(error)}`);
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }
  throw new Error(`No fue posible consultar OpenStreetMap. ${failures.join(' | ')}`);
}

const rows = (await sourceRows()).flatMap((item) => {
  const coordinates = point(item);
  const tags = item.tags ?? {};
  const name = clean(tags.name || tags['name:es'] || tags['name:en']);
  if (!coordinates || !name) return [];
  const embassy = tags.amenity === 'embassy' || tags.diplomatic === 'embassy' || /\b(embajada|embassy)\b/i.test(name);
  if (tags.office === 'diplomatic' && !embassy) return [];
  const iata = clean(tags.iata).toUpperCase();
  const subcategory = embassy ? 'embassy' : internationalCodes.has(iata) ? 'international_airport' : 'aerodrome';
  return [{
    osm_type: item.type,
    osm_id: item.id,
    category: embassy ? 'embassies' : 'airports',
    subcategories: [subcategory],
    main_category: embassy ? 'embassy' : 'airport',
    subcategory,
    title: name,
    description: embassy
      ? `Sede diplomática${tags['diplomatic:country'] ? ` de ${tags['diplomatic:country']}` : ''}. Verificá horarios y requisitos antes de visitar.`
      : `${subcategory === 'international_airport' ? 'Aeropuerto internacional' : 'Aeródromo'}${iata ? ` · IATA ${iata}` : ''}.`,
    phone_whatsapp: clean(tags['contact:phone'] || tags.phone) || null,
    external_url: clean(tags['contact:website'] || tags.website) || null,
    opening_hours: clean(tags.opening_hours) || null,
    location: `POINT(${coordinates.lon} ${coordinates.lat})`,
    osm_tags: tags,
    data_source: 'OpenStreetMap',
    source_license: 'ODbL-1.0',
    source_updated_at: new Date().toISOString(),
    imported_at: new Date().toISOString(),
    source: 'community',
    is_sponsored: false,
  }];
}).filter((row, index, all) => all.findIndex((other) => {
  const samePlace = other.category === 'embassies' && row.category === 'embassies'
    ? other.title.localeCompare(row.title, undefined, { sensitivity: 'base' }) === 0
    : other.osm_type === row.osm_type && other.osm_id === row.osm_id;
  return samePlace;
}) === index);

const stats = { embassies: rows.filter((row) => row.category === 'embassies').length, airports: rows.filter((row) => row.category === 'airports').length };
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', source: 'OpenStreetMap', ...stats }, null, 2));
if (!apply) process.exit(0);

const current = [];
for (let from = 0; ; from += 1_000) {
  const { data, error } = await supabase
    .from('commercial_services')
    .select('id,osm_type,osm_id')
    .not('osm_type', 'is', null)
    .not('osm_id', 'is', null)
    .range(from, from + 999);
  if (error) throw error;
  current.push(...(data ?? []));
  if ((data?.length ?? 0) < 1_000) break;
}
const existing = new Map(current.map((row) => [`${row.osm_type}:${row.osm_id}`, row.id]));
for (const [index, row] of rows.entries()) {
  const id = existing.get(`${row.osm_type}:${row.osm_id}`);
  const request = id ? supabase.from('commercial_services').update(row).eq('id', id) : supabase.from('commercial_services').insert(row);
  const { error } = await request;
  if (error) throw error;
  if ((index + 1) % 25 === 0 || index + 1 === rows.length) console.log(`Sincronizados ${index + 1}/${rows.length}.`);
}
console.log(`Importación completada: ${stats.embassies} embajadas y ${stats.airports} aeropuertos/aeródromos.`);
