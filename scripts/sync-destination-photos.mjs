import { createClient } from '@supabase/supabase-js';

const PHOTO_LIMIT = 10;
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const destinationArg = process.argv.find((arg) => arg.startsWith('--destination='))?.slice('--destination='.length);
const limitArg = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length));

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.UNSPLASH_ACCESS_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o UNSPLASH_ACCESS_KEY en .env.local.');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const unsplashHeaders = { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` };
const attributionSource = (url) => `${url}${url.includes('?') ? '&' : '?'}utm_source=descubriendo_cr&utm_medium=referral`;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function unsplashPhotos(destination) {
  const query = new URLSearchParams({ query: `${destination.name} Costa Rica`, per_page: '30', orientation: 'landscape', content_filter: 'high', order_by: 'relevant' });
  const response = await fetch(`https://api.unsplash.com/search/photos?${query}`, { headers: unsplashHeaders });
  if (!response.ok) throw new Error(`Unsplash respondió ${response.status}.`);
  const result = await response.json();
  return (result.results ?? []).map((photo) => ({
    image_url: photo.urls?.regular,
    source_url: attributionSource(photo.links?.html ?? `https://unsplash.com/photos/${photo.id}`),
    attribution: `Foto de ${photo.user?.name || 'Unsplash'} en Unsplash`,
    license: 'Unsplash License',
    download_location: photo.links?.download_location,
  })).filter((photo) => photo.image_url && photo.download_location);
}

async function trackUnsplashDownload(photo) {
  const response = await fetch(photo.download_location, { headers: unsplashHeaders, redirect: 'manual' });
  if (!response.ok && response.status !== 302) throw new Error(`Unsplash no registró la descarga (${response.status}).`);
}

let destinationsQuery = supabase.from('destinations').select('id,name,province,cover_image_url').eq('status', 'Activo').order('name');
if (destinationArg) destinationsQuery = destinationsQuery.ilike('name', `%${destinationArg}%`);
if (Number.isFinite(limitArg) && limitArg > 0) destinationsQuery = destinationsQuery.limit(limitArg);
const { data: destinations, error: destinationsError } = await destinationsQuery;
if (destinationsError) throw destinationsError;

const { data: existingPhotos, error: existingError } = destinations?.length
  ? await supabase.from('destination_photos').select('destination_id,image_url,sort_order').in('destination_id', destinations.map((destination) => destination.id))
  : { data: [], error: null };
if (existingError) throw existingError;

const photosByDestination = new Map();
for (const photo of existingPhotos ?? []) photosByDestination.set(photo.destination_id, [...(photosByDestination.get(photo.destination_id) ?? []), photo]);

const stats = { destinations: destinations?.length ?? 0, planned: 0, inserted: 0, skippedComplete: 0, withoutEnoughPhotos: 0, failed: 0 };
for (const destination of destinations ?? []) {
  const existing = photosByDestination.get(destination.id) ?? [];
  if (existing.length >= PHOTO_LIMIT) { stats.skippedComplete += 1; continue; }
  const usedUrls = new Set(existing.map((photo) => photo.image_url));
  const slots = Array.from({ length: PHOTO_LIMIT }, (_, index) => index).filter((order) => !existing.some((photo) => photo.sort_order === order));
  let candidates;
  try { candidates = (await unsplashPhotos(destination)).filter((photo) => !usedUrls.has(photo.image_url)).slice(0, slots.length); }
  catch (error) { stats.failed += 1; console.warn(`Omitido ${destination.name}: ${error.message}`); continue; }
  if (candidates.length < slots.length) stats.withoutEnoughPhotos += 1;
  if (apply) {
    try { for (const photo of candidates) await trackUnsplashDownload(photo); }
    catch (error) { stats.failed += 1; console.warn(`Omitido ${destination.name}: ${error.message}`); continue; }
  }
  const rows = candidates.map((photo, index) => ({ destination_id: destination.id, image_url: photo.image_url, sort_order: slots[index], source_provider: 'Unsplash', source_url: photo.source_url, attribution: photo.attribution, license: photo.license }));
  stats.planned += rows.length;
  if (apply && rows.length) {
    const { error } = await supabase.from('destination_photos').insert(rows);
    if (error) throw error;
    stats.inserted += rows.length;
    if (!destination.cover_image_url) {
      const first = rows[0];
      const { error: coverError } = await supabase.from('destinations').update({ cover_image_url: first.image_url, image_verified: true, image_attribution: first.attribution, image_license: first.license, image_source_url: first.source_url }).eq('id', destination.id);
      if (coverError) throw coverError;
    }
  }
  await sleep(1000);
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', source: 'Unsplash', ...stats }, null, 2));
