import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice(8));
const offset = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.slice(9)) || 0;

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
}

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase();
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const NAME_CORRESPONDENCE = new Map([
  ['d5b62a62-4d1a-49f3-8107-f4171755ebd9', 'Estación de Guardaparques Sirena'],
  ['e7ea3d67-ee8a-4268-8768-c06debb45460', 'Playa del Carmen'],
  ['da01f59f-0045-4aa2-b4ea-79ef67f4b8fd', 'Refugio Nacional de Visa Silvestre Gandoca-Manzanillo'],
  ['d84effa4-43dd-4669-a662-cf181f06002a', 'Ruinas El Miro'],
  ['e3fea0d3-78f6-4e64-b1a9-f17935afc3ee', 'Volcán Tortuguero'],
  ['2c91fbca-8665-4586-9c37-3018204f7ad8', 'Catarata Nauyaca'],
  ['d599ee5d-2dbe-4886-9cd9-f3dbb48271c4', 'Refugio de Vida Silvestre Curú'],
]);

function osmReference(url) {
  const match = String(url ?? '').match(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/(\d+)/i);
  return match ? { type: match[1].toLowerCase(), id: match[2] } : null;
}

function description() {
  return {
    es: 'Ubicación cartográfica verificada en OpenStreetMap. Confirmá el acceso, los servicios y las condiciones de visita antes de salir.',
    en: 'Location verified in OpenStreetMap. Confirm access, services, and visit conditions before you go.',
  };
}

async function allRows() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('destinations')
      .select('id,name,province,source_url')
      .eq('status', 'Activo')
      .like('source_url', 'https://www.openstreetmap.org/%')
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

async function fetchElement(reference) {
  const response = await fetch(`https://api.openstreetmap.org/api/0.6/${reference.type}/${reference.id}.json`, {
    headers: { 'user-agent': 'GUIATURISTICA destination evidence audit' },
  });
  if (!response.ok) throw new Error(`OpenStreetMap respondió ${response.status} para ${reference.type}/${reference.id}.`);
  const payload = await response.json();
  const element = payload.elements?.[0];
  if (!element) throw new Error(`OpenStreetMap no devolvió ${reference.type}/${reference.id}.`);
  return element;
}

const candidates = (await allRows()).slice(offset, Number.isFinite(limit) && limit > 0 ? offset + limit : undefined);
const updates = [];
const failures = [];

for (const destination of candidates) {
  const reference = osmReference(destination.source_url);
  if (!reference) {
    failures.push({ id: destination.id, name: destination.name, reason: 'URL de OpenStreetMap no reconocida' });
    continue;
  }
  try {
    const element = await fetchElement(reference);
    const tags = element.tags ?? {};
    const sourceName = normalize(tags.name);
    const expectedSourceName = normalize(NAME_CORRESPONDENCE.get(destination.id));
    const nameMatches = !sourceName || normalize(destination.name).includes(sourceName) || sourceName.includes(normalize(destination.name)) || sourceName === expectedSourceName;
    if (!nameMatches) {
      failures.push({ id: destination.id, name: destination.name, reason: `El nombre cartográfico no coincide: ${tags.name}` });
      continue;
    }
    const copy = description(destination, tags);
    updates.push({ id: destination.id, patch: { description: copy.es, description_en: copy.en, source_checked_at: new Date().toISOString() } });
  } catch (error) {
    failures.push({ id: destination.id, name: destination.name, reason: error instanceof Error ? error.message : String(error) });
  }
  await wait(350);
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  candidates: candidates.length,
  individuallyVerified: updates.length,
  needsManualReview: failures.length,
  failures,
}, null, 2));

if (failures.length) throw new Error(`La auditoría se detuvo: ${failures.length} destinos necesitan revisión manual.`);
if (!apply) process.exit(0);

for (const update of updates) {
  const { error } = await supabase.from('destinations').update(update.patch).eq('id', update.id);
  if (error) throw error;
}

console.log(`Descripciones cartográficas actualizadas: ${updates.length} destinos.`);
