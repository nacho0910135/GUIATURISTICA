import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Usage: node generate-researched-destination-migration.mjs <input.json> <migration.sql>');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase environment variables.');

const researched = JSON.parse(await readFile(inputPath, 'utf8'));
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const { data: destinations, error } = await supabase
  .from('destinations')
  .select('id,name,latitude,longitude,status')
  .eq('status', 'Activo')
  .limit(1000);
if (error) throw error;

const manualMatches = new Map([
  [9, '79b9ae59-07c6-4549-aaae-f6ba8fad0816'],
  [11, 'cb27fa50-d606-4651-aeb3-0f60d5919a73'],
  [15, '359aad09-8101-41b7-ac24-016c2da1f96a'],
  [28, 'b11f867d-76f0-4ef7-ab99-4b9f67527e7a'],
  [132, '15b35d93-ce73-4b79-a633-ffdb2ee10f2c'],
  [230, 'fa963435-94a7-4832-a9cb-4e544ca4288c'],
  [231, '7b1cf8df-64ed-4916-a87e-7754135bc82d'],
  [308, 'fe44524b-5674-4127-a2c9-d8eb7fb20f32'],
  [326, '72e46c72-752d-44cd-a184-3643843cc67a'],
  [330, '4e7f355f-7467-4ea6-a12d-1428fb678b5d'],
  [381, '3d97e4e9-8976-4820-ab2b-88b2edc5f502'],
]);

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const coordinates = (url) => {
  const match = String(url).match(/query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Invalid Google Maps URL: ${url}`);
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
};

const used = new Set();
const payload = [];
for (const item of researched) {
  let destination = manualMatches.has(item.id)
    ? destinations.find((candidate) => candidate.id === manualMatches.get(item.id))
    : undefined;
  const point = coordinates(item.googleMapsUrl);
  if (!destination) {
    const coordinateMatches = destinations.filter((candidate) =>
      !used.has(candidate.id)
      && Math.abs(Number(candidate.latitude) - point.latitude) < 1e-7
      && Math.abs(Number(candidate.longitude) - point.longitude) < 1e-7);
    if (coordinateMatches.length === 1) destination = coordinateMatches[0];
  }
  if (!destination) {
    const nameMatches = destinations.filter((candidate) => !used.has(candidate.id) && normalize(candidate.name) === normalize(item.name));
    if (nameMatches.length === 1) destination = nameMatches[0];
  }
  if (!destination || used.has(destination.id)) throw new Error(`Could not uniquely match JSON item ${item.id}: ${item.name}`);
  used.add(destination.id);
  const sameName = destinations
    .filter((candidate) => candidate.name === destination.name)
    .sort((left, right) => Number(left.latitude) - Number(right.latitude) || Number(left.longitude) - Number(right.longitude) || left.id.localeCompare(right.id));
  payload.push({
    match_name: destination.name,
    match_ordinal: sameName.findIndex((candidate) => candidate.id === destination.id) + 1,
    name: item.name.trim(),
    description_es: item.description_es.trim(),
    description_en: item.description_en.trim(),
    categories: item.categories.map((category) => category.trim()),
    latitude: point.latitude,
    longitude: point.longitude,
  });
}

if (payload.length !== researched.length) throw new Error('Not every researched destination was matched.');
const omitted = destinations.filter((destination) => !used.has(destination.id));
const json = JSON.stringify(payload, null, 2);
const sql = `-- Generated from ultimo.json. Rewrites the 386 matched active destinations while preserving unrelated fields.
begin;

create table if not exists private.destination_content_backups (
  batch_key text not null,
  destination_id uuid not null,
  snapshot jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key (batch_key, destination_id)
);
revoke all on table private.destination_content_backups from public, anon, authenticated;

create temporary table destination_refresh_payload (
  match_name text not null,
  match_ordinal integer not null,
  name text not null,
  description_es text not null,
  description_en text not null,
  categories text[] not null,
  latitude double precision not null,
  longitude double precision not null
) on commit drop;

insert into destination_refresh_payload
select * from jsonb_to_recordset($researched_destinations$${json}$researched_destinations$::jsonb)
  as item(match_name text, match_ordinal integer, name text, description_es text, description_en text, categories text[], latitude double precision, longitude double precision);

create temporary table destination_refresh_matches on commit drop as
with ranked_destinations as (
  select destination.*,
         row_number() over (partition by destination.name order by destination.latitude, destination.longitude, destination.id) as match_ordinal
  from public.destinations destination
)
select destination.id as destination_id, payload.*
from destination_refresh_payload payload
join ranked_destinations destination
  on destination.name = payload.match_name
 and destination.match_ordinal = payload.match_ordinal;

do $$
begin
  if (select count(*) from destination_refresh_payload) <> ${payload.length} then
    raise exception 'Expected ${payload.length} researched destinations';
  end if;
  if (select count(*) from destination_refresh_matches) <> ${payload.length} then
    raise exception 'Researched destinations matched % current rows, expected ${payload.length}',
      (select count(*) from destination_refresh_matches);
  end if;
end $$;

insert into private.destination_content_backups (batch_key, destination_id, snapshot)
select '20260903_researched_content', destination.id, to_jsonb(destination)
from public.destinations destination
join destination_refresh_matches payload on payload.destination_id = destination.id
on conflict (batch_key, destination_id) do nothing;

update public.destinations destination
set name = payload.name,
    description = payload.description_es,
    description_en = payload.description_en,
    category = array_to_string(payload.categories, ' / '),
    location = public.st_setsrid(public.st_makepoint(payload.longitude, payload.latitude), 4326)
from destination_refresh_matches payload
where destination.id = payload.destination_id;

do $$
begin
  if (select count(*) from private.destination_content_backups where batch_key = '20260903_researched_content') <> ${payload.length} then
    raise exception 'Destination backup is incomplete';
  end if;
end $$;

commit;
`;

await writeFile(outputPath, sql, 'utf8');
console.log(JSON.stringify({ updated: payload.length, omitted: omitted.map(({ id, name }) => ({ id, name })) }, null, 2));
