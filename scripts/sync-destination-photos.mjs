import { createClient } from '@supabase/supabase-js';

const PHOTO_LIMIT = 10;
const REQUEST_INTERVAL_MS = 3500;
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const destinationArg = process.argv.find((arg) => arg.startsWith('--destination='))?.slice('--destination='.length);
const limitArg = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length));

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clean = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
const freeLicense = (license = '') => /^(CC BY|CC BY-SA|CC0|Public domain)/i.test(license.trim());
let nextRequestAt = 0;

class WikimediaRateLimitError extends Error {}

function retryAfterMilliseconds(value) {
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 30000;
}

async function wikimediaRequest(url, progress) {
  await sleep(Math.max(0, nextRequestAt - Date.now()));
  let response = await fetch(url, { headers: { 'User-Agent': 'DescubriendoCR/1.0 (tourism destination photo synchronizer)' } });
  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
  if (response.status !== 429) return response;
  const wait = retryAfterMilliseconds(response.headers.get('retry-after'));
  console.log(`${progress}: Wikimedia pidió esperar ${Math.ceil(wait / 1000)} s; reintentando una vez...`);
  await sleep(wait);
  response = await fetch(url, { headers: { 'User-Agent': 'DescubriendoCR/1.0 (tourism destination photo synchronizer)' } });
  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
  if (response.status === 429) throw new WikimediaRateLimitError('Wikimedia mantiene el límite; se detiene el lote para no saturarlo.');
  return response;
}

async function wikimediaSearch(search, progress) {
  const query = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '30', gsrsearch: search, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1600', origin: '*' });
  const response = await wikimediaRequest(`https://commons.wikimedia.org/w/api.php?${query}`, progress);
  if (!response.ok) throw new Error(`Wikimedia respondió ${response.status}.`);
  const pages = Object.values((await response.json()).query?.pages ?? {});
  return pages.map((page) => {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata ?? {};
    const license = clean(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
    const fileName = page.title.replace(/^File:/, '');
    return { image_url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1280`, source_url: info?.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`, attribution: clean(metadata.Artist?.value) || clean(metadata.Credit?.value) || fileName, license };
  }).filter((photo) => photo.image_url && freeLicense(photo.license));
}

async function wikimediaPhotos(destination, required, progress) {
  const baseName = destination.name.replace(/\s*[-–—]\s*[^-–—]+$/, '').replace(/\s*\([^)]*\)/g, '').trim();
  const queries = [...new Set([`"${destination.name}" Costa Rica`, `${destination.name} Costa Rica`, destination.name, `${baseName} Costa Rica`, baseName])].filter(Boolean);
  const unique = new Map();
  for (const [index, query] of queries.entries()) {
    console.log(`${progress}: consulta ${index + 1}/${queries.length} en Wikimedia...`);
    for (const photo of await wikimediaSearch(query, progress)) unique.set(photo.image_url, photo);
    if (unique.size >= required) break;
  }
  return [...unique.values()];
}

let destinationsQuery = supabase.from('destinations').select('id,name,province,cover_image_url').eq('status', 'Activo').order('name');
if (destinationArg) destinationsQuery = destinationsQuery.ilike('name', `%${destinationArg}%`);
if (Number.isFinite(limitArg) && limitArg > 0) destinationsQuery = destinationsQuery.limit(limitArg);
const { data: destinations, error: destinationsError } = await destinationsQuery;
if (destinationsError) throw destinationsError;
const { data: existingPhotos, error: existingError } = destinations?.length ? await supabase.from('destination_photos').select('destination_id,image_url,sort_order').in('destination_id', destinations.map((destination) => destination.id)) : { data: [], error: null };
if (existingError) throw existingError;

const photosByDestination = new Map();
for (const photo of existingPhotos ?? []) photosByDestination.set(photo.destination_id, [...(photosByDestination.get(photo.destination_id) ?? []), photo]);
const stats = { destinations: destinations?.length ?? 0, planned: 0, inserted: 0, skippedComplete: 0, withoutEnoughFreePhotos: 0, failed: 0, rateLimited: false };
console.log(`Inicio: ${stats.destinations} destinos · modo ${apply ? 'aplicar' : 'prueba'} · fuente Wikimedia Commons.`);

for (const [index, destination] of (destinations ?? []).entries()) {
  const existing = photosByDestination.get(destination.id) ?? [];
  const progress = `[${index + 1}/${stats.destinations}] ${destination.name}`;
  if (existing.length >= PHOTO_LIMIT) { stats.skippedComplete += 1; console.log(`${progress}: completo (${PHOTO_LIMIT}/${PHOTO_LIMIT}).`); continue; }
  console.log(`${progress}: buscando ${PHOTO_LIMIT - existing.length} foto(s) (${existing.length}/${PHOTO_LIMIT} existentes)...`);
  const usedUrls = new Set(existing.map((photo) => photo.image_url));
  const slots = Array.from({ length: PHOTO_LIMIT }, (_, order) => order).filter((order) => !existing.some((photo) => photo.sort_order === order));
  let candidates;
  try { candidates = (await wikimediaPhotos(destination, slots.length, progress)).filter((photo) => !usedUrls.has(photo.image_url)).slice(0, slots.length); }
  catch (error) {
    stats.failed += 1;
    console.warn(`${progress}: omitido — ${error.message}`);
    if (error instanceof WikimediaRateLimitError) { stats.rateLimited = true; break; }
    continue;
  }
  if (candidates.length < slots.length) stats.withoutEnoughFreePhotos += 1;
  console.log(`${progress}: ${candidates.length} foto(s) libres encontradas.`);
  const rows = candidates.map((photo, rowIndex) => ({ destination_id: destination.id, image_url: photo.image_url, sort_order: slots[rowIndex], source_provider: 'Wikimedia Commons', source_url: photo.source_url, attribution: photo.attribution, license: photo.license }));
  stats.planned += rows.length;
  if (apply && rows.length) {
    const { error } = await supabase.from('destination_photos').insert(rows);
    if (error) throw error;
    stats.inserted += rows.length;
    console.log(`${progress}: ${rows.length} foto(s) guardadas.`);
    if (!destination.cover_image_url) {
      const first = rows[0];
      const { error: coverError } = await supabase.from('destinations').update({ cover_image_url: first.image_url, image_verified: true, image_attribution: first.attribution, image_license: first.license, image_source_url: first.source_url }).eq('id', destination.id);
      if (coverError) throw coverError;
    }
  }
  if (!apply) console.log(`${progress}: prueba, no se guardó nada.`);
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', source: 'Wikimedia Commons', ...stats }, null, 2));
