import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

const API = 'https://api.quebuenlugar.com';
const SITE = 'https://quebuenlugar.com';
const PROVIDER = 'Qué Buen Lugar';
const PHOTO_LIMIT = 10;
const COSTA_RICA_PROVINCES = new Set(['Alajuela', 'Cartago', 'Guanacaste', 'Heredia', 'Limón', 'Puntarenas', 'San José']);
const PROVINCE_OVERRIDES = new Map([[74, 'Alajuela'], [150, 'Cartago']]);
const COORDINATE_OVERRIDES = new Map([
  [150, { latitude: 9.9675, longitude: -83.8822 }],
  [347, { latitude: 8.4603583, longitude: -83.4616237 }],
  [349, { latitude: 8.4603583, longitude: -83.4616237 }],
]);
const REGION_BY_PROVINCE = {
  Alajuela: 'Valle Central', Cartago: 'Valle Central', Guanacaste: 'Guanacaste', Heredia: 'Valle Central',
  Limón: 'Caribe', Puntarenas: 'Pacífico', 'San José': 'Valle Central',
};
const CATEGORY_BY_TYPE = {
  Catarata: 'Cataratas', Laguna: 'Ríos y Pozas', Mirador: 'Miradores', Montaña: 'Senderismo',
  'Parques Nacionales': 'Parques Nacionales', Playa: 'Playas', Río: 'Ríos y Pozas',
  Aventura: 'Senderismo', Camping: 'Senderismo', Extremo: 'Senderismo', Paseo: 'Senderismo',
};
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const descriptionsOnly = args.has('--descriptions-only');
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice(8));
const sourceId = Number(process.argv.find((arg) => arg.startsWith('--source-id='))?.slice(12));

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
}

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase();
const clean = (value = '') => String(value).replace(/[#*_`>]/g, '').replace(/\[([^\]]+)]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
const translated = (entity, language) => entity?.translations?.find((item) => item.languages_code?.startsWith(language)) ?? entity ?? {};
const relationValues = (rows, key, language) => (rows ?? []).map((row) => clean(translated(row[key], language).title)).filter(Boolean);
const sourceUrl = (place) => {
  const slug = translated(place, 'es').slug || place.slug;
  return slug ? `${SITE}/es/lugares/${encodeURIComponent(slug)}` : `${API}/items/Lugares?filter[id][_eq]=${place.id}`;
};
const assetUrl = (id) => `${API}/assets/${id}?width=1280&quality=82&fit=cover&format=webp`;

function stableId(sourceRecordId) {
  const hex = createHash('sha256').update(`quebuenlugar:${sourceRecordId}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function coordinates(value, id) {
  if (COORDINATE_OVERRIDES.has(id)) return COORDINATE_OVERRIDES.get(id);
  const text = String(value ?? '');
  for (const match of text.matchAll(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)) {
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (latitude >= 8 && latitude <= 11.5 && longitude >= -86.5 && longitude <= -82.3) return { latitude, longitude };
  }
  const dms = text.match(/(\d+)°\s*(\d+)[′']\s*(\d+)[″"]?\s*([NS])[^\d]+(\d+)°\s*(\d+)[′']\s*(\d+)[″"]?\s*([EWO])/i);
  if (!dms) return null;
  const latitude = (Number(dms[1]) + Number(dms[2]) / 60 + Number(dms[3]) / 3600) * (dms[4].toUpperCase() === 'S' ? -1 : 1);
  const longitude = (Number(dms[5]) + Number(dms[6]) / 60 + Number(dms[7]) / 3600) * (/[WO]/i.test(dms[8]) ? -1 : 1);
  return { latitude, longitude };
}

function price(specifications = '') {
  if (/\b(gratis|gratuito|free)\b/i.test(specifications)) return 0;
  const costLine = String(specifications).split('\n').find((line) => /costo|cost/i.test(line)) ?? '';
  const match = costLine.match(/[₡¢]\s*([\d.,]+)/);
  return match ? Number(match[1].replace(/[.,](?=\d{3}\b)/g, '')) : null;
}

function wazeUrl(...specifications) {
  const match = specifications.join('\n').match(/https:\/\/(?:ul\.)?waze\.com\/[^)\s]+/i)?.[0];
  return match?.split('](').at(-1) ?? null;
}

function difficulty(values) {
  const text = normalize(values.join(' '));
  if (/dificil|alta|high|hard/.test(text)) return 'Difícil';
  if (/moderad|media|medium/.test(text)) return 'Moderada';
  return 'Fácil';
}

function category(types) {
  const categories = [...new Set(types.map((type) => CATEGORY_BY_TYPE[type]).filter(Boolean))];
  const priority = ['Parques Nacionales', 'Playas', 'Cataratas', 'Ríos y Pozas', 'Miradores', 'Senderismo'];
  return priority.find((item) => categories.includes(item)) ?? 'Senderismo';
}

function editorialName(title) {
  const cleanTitle = clean(title)
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleanTitle.split(/\s*(?:\||–|—|:)\s*/)[0].trim() || cleanTitle;
}

function descriptionCategory(category) {
  if (/catarata/i.test(category)) return 'Cataratas';
  if (/r[ií]o|poza|laguna/i.test(category)) return 'Ríos y Pozas';
  if (/mirador/i.test(category)) return 'Miradores';
  if (/parque nacional/i.test(category)) return 'Parques Nacionales';
  if (/playa/i.test(category)) return 'Playas';
  return 'Senderismo';
}

function description(name, province, category, language) {
  const destinationName = editorialName(name);
  const destinationCategory = descriptionCategory(category);
  const descriptions = language === 'es'
    ? {
      'Cataratas': `${destinationName} es una catarata ubicada en ${province}, Costa Rica, rodeada de un entorno natural.`,
      'Ríos y Pozas': `${destinationName} es un espacio de río y pozas naturales ubicado en ${province}, Costa Rica.`,
      Miradores: `${destinationName} es un mirador ubicado en ${province}, Costa Rica, con vistas del paisaje de la zona.`,
      'Parques Nacionales': `${destinationName} es un espacio natural en ${province}, Costa Rica, para conocer los paisajes y la biodiversidad de la zona.`,
      Playas: `${destinationName} es una playa de ${province}, Costa Rica, para disfrutar la costa y su entorno natural.`,
      Senderismo: `${destinationName} es un destino de senderismo en ${province}, Costa Rica, para recorrer y conocer el entorno natural.`,
    }
    : {
      'Cataratas': `${destinationName} is a waterfall in ${province}, Costa Rica, surrounded by a natural setting.`,
      'Ríos y Pozas': `${destinationName} is a river and natural swimming-hole destination in ${province}, Costa Rica.`,
      Miradores: `${destinationName} is a viewpoint in ${province}, Costa Rica, with views of the surrounding landscape.`,
      'Parques Nacionales': `${destinationName} is a natural area in ${province}, Costa Rica, where visitors can explore the region's landscapes and biodiversity.`,
      Playas: `${destinationName} is a beach in ${province}, Costa Rica, for enjoying the coast and its natural surroundings.`,
      Senderismo: `${destinationName} is a hiking destination in ${province}, Costa Rica, for exploring the natural surroundings.`,
    };
  return descriptions[destinationCategory] ?? descriptions.Senderismo;
}

function photoUrls(place) {
  const ids = [place.featured_image, ...(place.gallery ?? []).map((item) => item.directus_files_id?.id)].filter(Boolean);
  return [...new Set(ids)].slice(0, PHOTO_LIMIT).map(assetUrl);
}

function distanceKm(left, right) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(right.latitude - left.latitude);
  const dLon = radians(right.longitude - left.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nameSimilarity(left, right) {
  const a = new Set(normalize(left).split(' ').filter((word) => word.length > 2));
  const b = new Set(normalize(right).split(' ').filter((word) => word.length > 2));
  const common = [...a].filter((word) => b.has(word)).length;
  return common / Math.max(1, Math.min(a.size, b.size));
}

function matchExisting(place, existing, sourcePhotoOwners) {
  const url = sourceUrl(place);
  const title = clean(translated(place, 'es').title || place.title);
  const imported = existing.find((item) => item.id === stableId(place.id));
  if (imported) return imported;
  const sourced = existing.find((item) => item.source_url === url);
  if (sourced && nameSimilarity(title, sourced.name) >= 0.5) return sourced;
  const sourcePhotoOwner = sourcePhotoOwners.has(url) ? existing.find((item) => item.id === sourcePhotoOwners.get(url)) : null;
  if (sourcePhotoOwner && nameSimilarity(title, sourcePhotoOwner.name) >= 0.5) return sourcePhotoOwner;
  const nearby = existing.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && distanceKm(place, item) <= 5);
  return nearby.find((item) => nameSimilarity(title, item.name) >= 0.8)
    ?? nearby.find((item) => distanceKm(place, item) <= 0.2 && nameSimilarity(title, item.name) >= 0.5);
}

async function sourcePlaces() {
  const fields = [
    'id', 'title', 'slug', 'featured_image', 'youtube_video', 'map_coordinates',
    'translations.languages_code', 'translations.title', 'translations.slug', 'translations.specifications',
    'gallery.directus_files_id.id', 'tipo.Tipo_id.title', 'tipo.Tipo_id.translations.languages_code', 'tipo.Tipo_id.translations.title',
    'provincia.Provincia_id.title', 'carro.Carro_id.title', 'carro.Carro_id.translations.languages_code', 'carro.Carro_id.translations.title',
    'dificultad.Dificultad_id.title', 'dificultad.Dificultad_id.translations.languages_code', 'dificultad.Dificultad_id.translations.title',
    'distancia.Distancia_id.title', 'distancia.Distancia_id.translations.languages_code', 'distancia.Distancia_id.translations.title',
    'costo.Costo_id.title', 'costo.Costo_id.translations.languages_code', 'costo.Costo_id.translations.title',
    'accesibilidad.Accesibilidad_id.title', 'accesibilidad.Accesibilidad_id.translations.languages_code', 'accesibilidad.Accesibilidad_id.translations.title',
  ];
  const query = new URLSearchParams({ fields: fields.join(','), limit: '-1', 'filter[status][_eq]': 'published' });
  const response = await fetch(`${API}/items/Lugares?${query}`);
  if (!response.ok) throw new Error(`Qué Buen Lugar respondió ${response.status}.`);
  const records = (await response.json()).data ?? [];
  if (!sourceId && !Number.isFinite(limit) && records.length < 300) throw new Error(`Respuesta incompleta: ${records.length} registros.`);
  return records;
}

async function allRows(table, fields) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(fields).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

async function insertBatches(table, rows) {
  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + 100));
    if (error) throw error;
  }
}

assert.match(stableId(61), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
assert.deepEqual(coordinates('9.781, -83.807'), { latitude: 9.781, longitude: -83.807 });
assert.deepEqual(coordinates('10°55′20″N 85°42′40″O'), { latitude: 10.922222222222222, longitude: -85.71111111111111 });

const [source, existing, existingPhotos] = await Promise.all([
  sourcePlaces(),
  allRows('destinations', 'id,name,province,category,description,description_en,cover_image_url,waze_url,source_url,latitude,longitude'),
  allRows('destination_photos', 'destination_id,image_url,sort_order,source_url'),
]);
const sourcePhotoOwners = new Map(existingPhotos.filter((photo) => photo.source_url?.startsWith(`${SITE}/`)).map((photo) => [photo.source_url, photo.destination_id]));
let places = source.flatMap((place) => {
  const point = coordinates(place.map_coordinates, place.id);
  const province = clean(place.provincia?.[0]?.Provincia_id?.title) || PROVINCE_OVERRIDES.get(place.id);
  return point && COSTA_RICA_PROVINCES.has(province) ? [{ ...place, ...point, province }] : [];
});
if (Number.isFinite(sourceId)) places = places.filter((place) => place.id === sourceId);
if (Number.isFinite(limit) && limit > 0) places = places.slice(0, limit);

if (descriptionsOnly) {
  const imported = existing.filter((item) => item.source_url?.startsWith(`${SITE}/`));
  const updates = imported.map((item) => ({
    id: item.id,
    patch: {
      description: description(item.name, item.province, item.category, 'es'),
      description_en: description(item.name, item.province, item.category, 'en'),
    },
  }));
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run', descriptionsOnly, source: PROVIDER,
    sourceRecords: source.length, costaRicaPlaces: places.length, updatedDescriptions: updates.length,
  }, null, 2));
  if (!apply) process.exit(0);
  for (const update of updates) {
    const { error } = await supabase.from('destinations').update(update.patch).eq('id', update.id);
    if (error) throw error;
  }
  console.log(`Descripciones actualizadas: ${updates.length} destinos.`);
  process.exit(0);
}

const newDestinations = [];
const updates = [];
const plannedPhotos = [];
const photosByDestination = new Map();
for (const photo of existingPhotos) {
  const photos = photosByDestination.get(photo.destination_id) ?? [];
  photos.push(photo);
  photosByDestination.set(photo.destination_id, photos);
}
let matchedExisting = 0;
let updatedDescriptions = 0;
for (const place of places) {
  const es = translated(place, 'es');
  const en = translated(place, 'en');
  const title = clean(es.title || place.title);
  const types = relationValues(place.tipo, 'Tipo_id', 'es');
  const specs = [es.specifications, en.specifications].filter(Boolean);
  const urls = photoUrls(place);
  const matched = matchExisting(place, existing, sourcePhotoOwners);
  const destinationId = matched?.id ?? stableId(place.id);
  const shared = {
    name: title,
    province: place.province,
    region: REGION_BY_PROVINCE[place.province],
    category: category(types),
    description: description(title, place.province, category(types), 'es'),
    description_en: description(title, place.province, category(types), 'en'),
    location: `POINT(${place.longitude} ${place.latitude})`,
    difficulty: difficulty(relationValues(place.dificultad, 'Dificultad_id', 'es')),
    price_national_crc: price(specs.join('\n')),
    fee_type: price(specs.join('\n')) === 0 ? 'Gratuito' : price(specs.join('\n')) ? 'De Pago' : 'Consultar en sitio',
    waze_url: wazeUrl(...specs),
    status: 'Activo',
    cover_image_url: urls[0] ?? null,
    image_verified: false,
    image_attribution: PROVIDER,
    image_license: 'Derechos reservados; verificar uso con la fuente',
    image_source_url: sourceUrl(place),
    source_url: sourceUrl(place),
    source_checked_at: new Date().toISOString(),
  };
  if (!matched) newDestinations.push({ id: destinationId, ...shared });
  else {
    matchedExisting += 1;
    const importedFromThisSource = matched.source_url === sourceUrl(place) || matched.id === stableId(place.id);
    const patch = {
      ...(importedFromThisSource ? { description: shared.description, description_en: shared.description_en } : {}),
      ...Object.fromEntries(['cover_image_url', 'waze_url', 'source_url'].filter((key) => !matched[key] && shared[key]).map((key) => [key, shared[key]])),
    };
    if (importedFromThisSource) updatedDescriptions += 1;
    if (Object.keys(patch).length) updates.push({ id: destinationId, patch });
  }
  const current = photosByDestination.get(destinationId) ?? [];
  const used = new Set(current.map((photo) => photo.image_url));
  const slots = Array.from({ length: PHOTO_LIMIT }, (_, index) => index).filter((slot) => !current.some((photo) => photo.sort_order === slot));
  urls.filter((url) => !used.has(url)).slice(0, slots.length).forEach((url, index) => {
    const photo = {
      destination_id: destinationId,
      image_url: url,
      sort_order: slots[index],
      source_provider: PROVIDER,
      source_url: sourceUrl(place),
      attribution: PROVIDER,
      license: 'Derechos reservados; verificar uso con la fuente',
    };
    plannedPhotos.push(photo);
    current.push(photo);
  });
  photosByDestination.set(destinationId, current);
}

const stats = { sourceRecords: source.length, costaRicaPlaces: places.length, matchedExisting, newDestinations: newDestinations.length, updatedDescriptions, photos: plannedPhotos.length };
assert.equal(new Set(plannedPhotos.map((photo) => `${photo.destination_id}:${photo.sort_order}`)).size, plannedPhotos.length, 'Hay posiciones de fotos duplicadas en el lote.');
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', source: PROVIDER, ...stats }, null, 2));
if (!apply) process.exit(0);

await insertBatches('destinations', newDestinations);
for (const update of updates) {
  const { error } = await supabase.from('destinations').update(update.patch).eq('id', update.id);
  if (error) throw error;
}
await insertBatches('destination_photos', plannedPhotos);
console.log(`Importación completada: ${newDestinations.length} destinos y ${plannedPhotos.length} fotos añadidos.`);
