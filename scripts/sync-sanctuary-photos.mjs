import { createClient } from '@supabase/supabase-js';

const PHOTO_LIMIT = 10;
const REQUEST_INTERVAL_MS = 3500;
const TARGETS = {
  'Jaguar Rescue Center': ['Jaguar Rescue Center Costa Rica', 'Jaguar Rescue Centre Costa Rica'],
  'Ponderosa Adventure Park': ['Ponderosa Adventure Park Costa Rica'],
  'Rescate Wildlife Rescue Center': ['Rescate Wildlife Rescue Center Costa Rica', 'Zoo Ave Costa Rica'],
  'Toucan Rescue Ranch': ['Toucan Rescue Ranch Costa Rica'],
};
const apply = process.argv.includes('--apply');
if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bucket = supabase.storage.from('destination-photos');
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clean = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
const freeLicense = (license = '') => /^(CC BY|CC BY-SA|CC0|Public domain)/i.test(license.trim());
let nextRequestAt = 0;

function retryAfterMilliseconds(value) {
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 30000;
}

async function commonsRequest(url, progress) {
  await sleep(Math.max(0, nextRequestAt - Date.now()));
  let response = await fetch(url, { headers: { 'User-Agent': 'DescubriendoCR/1.0 (sanctuary photo synchronizer)' } });
  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
  if (response.status !== 429) return response;
  const wait = retryAfterMilliseconds(response.headers.get('retry-after'));
  console.log(`${progress}: Wikimedia pidió esperar ${Math.ceil(wait / 1000)} s; reintentando una vez...`);
  await sleep(wait);
  response = await fetch(url, { headers: { 'User-Agent': 'DescubriendoCR/1.0 (sanctuary photo synchronizer)' } });
  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
  return response;
}

async function searchCommons(query, progress) {
  const params = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '30', gsrsearch: query, prop: 'imageinfo', iiprop: 'extmetadata', origin: '*' });
  const response = await commonsRequest(`https://commons.wikimedia.org/w/api.php?${params}`, progress);
  if (!response.ok) throw new Error(`Wikimedia respondió ${response.status}.`);
  const pages = Object.values((await response.json()).query?.pages ?? {});
  return pages.map((page) => {
    const metadata = page.imageinfo?.[0]?.extmetadata ?? {};
    const license = clean(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
    const fileName = page.title.replace(/^File:/, '');
    return { fileName, imageUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1280`, sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`, attribution: clean(metadata.Artist?.value) || clean(metadata.Credit?.value) || fileName, license };
  }).filter((photo) => freeLicense(photo.license));
}

function extension(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

const { data: sanctuaries, error } = await supabase.from('fauna_sanctuaries').select('id,name,photos,photo_attributions').in('name', Object.keys(TARGETS)).order('name');
if (error) throw error;
const stats = { sanctuaries: sanctuaries?.length ?? 0, uploaded: 0, withoutEnoughFreePhotos: 0, failed: 0 };

for (const sanctuary of sanctuaries ?? []) {
  const existing = sanctuary.photos ?? [];
  const progress = sanctuary.name;
  if (existing.length >= PHOTO_LIMIT) { console.log(`${progress}: completo (${PHOTO_LIMIT}/${PHOTO_LIMIT}).`); continue; }
  const unique = new Map();
  try {
    for (const query of TARGETS[sanctuary.name]) {
      console.log(`${progress}: buscando en Wikimedia Commons (${query})...`);
      for (const photo of await searchCommons(query, progress)) unique.set(photo.fileName, photo);
      if (unique.size >= PHOTO_LIMIT - existing.length) break;
    }
    const candidates = [...unique.values()].slice(0, PHOTO_LIMIT - existing.length);
    if (candidates.length < PHOTO_LIMIT - existing.length) stats.withoutEnoughFreePhotos += 1;
    const uploaded = [];
    for (const [index, photo] of candidates.entries()) {
      try {
        const response = await commonsRequest(photo.imageUrl, progress);
        const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
        if (!response.ok || !contentType.startsWith('image/')) throw new Error(`No se pudo descargar ${photo.fileName}.`);
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 8 * 1024 * 1024) throw new Error(`${photo.fileName} supera 8 MB.`);
        const path = `sanctuaries/${sanctuary.id}/wikimedia-${existing.length + index}.${extension(contentType)}`;
        const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
        if (apply) {
          const { error: uploadError } = await bucket.upload(path, bytes, { cacheControl: '31536000', contentType, upsert: true });
          if (uploadError) throw uploadError;
        }
        uploaded.push({ url: publicUrl, attribution: photo.attribution, license: photo.license, provider: 'Wikimedia Commons', source_url: photo.sourceUrl });
        console.log(`${progress}: foto ${existing.length + uploaded.length}/${PHOTO_LIMIT} ${apply ? 'guardada' : 'lista'}.`);
      } catch (cause) { console.warn(`${progress}: foto omitida — ${cause.message}`); }
    }
    if (apply && uploaded.length) {
      const photos = [...existing, ...uploaded.map((photo) => photo.url)].slice(0, PHOTO_LIMIT);
      const attributions = [...(sanctuary.photo_attributions ?? []), ...uploaded.map(({ url, ...credit }) => ({ image_url: url, ...credit }))].slice(0, PHOTO_LIMIT);
      const { error: updateError } = await supabase.from('fauna_sanctuaries').update({ photos, photo_attributions: attributions, cover_image_url: photos[0] }).eq('id', sanctuary.id);
      if (updateError) throw updateError;
    }
    stats.uploaded += uploaded.length;
  } catch (cause) {
    stats.failed += 1;
    console.warn(`${progress}: omitido — ${cause.message}`);
  }
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', source: 'Wikimedia Commons (CC)', limitPerSanctuary: PHOTO_LIMIT, ...stats }, null, 2));
