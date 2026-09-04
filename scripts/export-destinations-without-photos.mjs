import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const destinations = [];

for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('destinations')
    .select('name,latitude,longitude,cover_image_url')
    .order('name')
    .range(from, from + 999);
  if (error) throw error;
  destinations.push(...data);
  if (data.length < 1000) break;
}

const csv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const withoutPhotos = destinations.filter((destination) => !destination.cover_image_url);
const rows = withoutPhotos.map((destination) => {
  const waze = `https://www.waze.com/ul?ll=${encodeURIComponent(`${destination.latitude},${destination.longitude}`)}&navigate=yes`;
  return `${csv(destination.name)},${csv(waze)}`;
});

await mkdir('reports', { recursive: true });
await writeFile('reports/sitios-turisticos-sin-fotografia.csv', `\uFEFFnombre,enlace_de_waze\r\n${rows.join('\r\n')}\r\n`);
console.log(`Exportados ${withoutPhotos.length} sitios turísticos sin fotografía.`);
