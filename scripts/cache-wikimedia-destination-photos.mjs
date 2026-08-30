import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length));
if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bucket = supabase.storage.from('destination-photos');
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const requestInterval = 3500;
let nextRequestAt = 0;

async function fetchThumbnail(url, progress) {
  await sleep(Math.max(0, nextRequestAt - Date.now()));
  let response = await fetch(url, { headers: { 'User-Agent': 'DescubriendoCR/1.0 (tourism destination image cache)' } });
  nextRequestAt = Date.now() + requestInterval;
  if (response.status !== 429) return response;
  const retryAfter = Number(response.headers.get('retry-after')) || 30;
  console.log(`${progress}: Wikimedia pidió esperar ${retryAfter} s; reintentando una vez...`);
  await sleep(retryAfter * 1000);
  response = await fetch(url, { headers: { 'User-Agent': 'DescubriendoCR/1.0 (tourism destination image cache)' } });
  nextRequestAt = Date.now() + requestInterval;
  return response;
}

function thumbnailUrl(sourceUrl, imageUrl) {
  try {
    const sourcePath = decodeURIComponent(new URL(sourceUrl ?? imageUrl).pathname);
    const fileName = sourcePath.match(/\/wiki\/File:(.+)$/)?.[1] ?? sourcePath.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\//)?.[1] ?? sourcePath.split('/').at(-1);
    return fileName ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1280` : imageUrl;
  } catch { return imageUrl; }
}

function extension(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

let query = supabase.from('destination_photos').select('id,destination_id,image_url,source_url').eq('source_provider', 'Wikimedia Commons').order('id');
if (Number.isFinite(limit) && limit > 0) query = query.limit(limit);
const { data: photos, error } = await query;
if (error) throw error;
const { data: destinations, error: destinationsError } = await supabase.from('destinations').select('id,cover_image_url').eq('status', 'Activo');
if (destinationsError) throw destinationsError;
const covers = new Map((destinations ?? []).map((destination) => [destination.id, destination.cover_image_url]));
const pending = (photos ?? [])
  .filter((photo) => !photo.image_url.includes('/storage/v1/object/public/destination-photos/commons/'))
  .sort((left, right) => Number(covers.get(right.destination_id) === right.image_url) - Number(covers.get(left.destination_id) === left.image_url));
const stats = { mode: apply ? 'apply' : 'dry-run', total: pending.length, cached: 0, failed: 0 };
console.log(`Inicio: ${pending.length} fotos de Wikimedia · modo ${stats.mode}.`);

for (const [index, photo] of pending.entries()) {
  const progress = `[${index + 1}/${pending.length}] ${photo.destination_id}`;
  try {
    const response = await fetchThumbnail(thumbnailUrl(photo.source_url, photo.image_url), progress);
    const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (!response.ok || !contentType.startsWith('image/')) throw new Error(`Wikimedia respondió ${response.status} (${contentType || 'sin tipo'}).`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) throw new Error('La miniatura supera 8 MB.');
    const path = `commons/${photo.id}.${extension(contentType)}`;
    if (apply) {
      const { error: uploadError } = await bucket.upload(path, bytes, { cacheControl: '31536000', contentType, upsert: true });
      if (uploadError) throw uploadError;
      const imageUrl = bucket.getPublicUrl(path).data.publicUrl;
      const { error: updateError } = await supabase.from('destination_photos').update({ image_url: imageUrl }).eq('id', photo.id);
      if (updateError) throw updateError;
      if (covers.get(photo.destination_id) === photo.image_url) {
        const { error: coverError } = await supabase.from('destinations').update({ cover_image_url: imageUrl }).eq('id', photo.destination_id).eq('cover_image_url', photo.image_url);
        if (coverError) throw coverError;
      }
    }
    stats.cached += 1;
    console.log(`${progress}: ${apply ? 'guardada en Supabase' : 'lista para guardar'} (${Math.ceil(bytes.byteLength / 1024)} KB).`);
  } catch (cause) {
    stats.failed += 1;
    console.warn(`${progress}: omitida — ${cause.message}`);
  }
}

console.log(JSON.stringify(stats, null, 2));
