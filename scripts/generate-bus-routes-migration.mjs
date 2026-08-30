import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const migrationPath = process.argv[2];
if (!migrationPath) throw new Error('Uso: node scripts/generate-bus-routes-migration.mjs <migracion.sql>');

const seedPath = resolve('src/data/bus_routes_seed.json');
const divisionsPath = resolve('assets/CR_distritos_geojson-master/geojson');
const routes = JSON.parse(readFileSync(seedPath, 'utf8'));
const divisions = new Map();

const slug = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

for (const filename of readdirSync(divisionsPath)) {
  if (!filename.endsWith('.geojson')) continue;
  const feature = JSON.parse(readFileSync(resolve(divisionsPath, filename), 'utf8'));
  const code = String(feature.properties?.Codigo ?? '');
  const level = code.length === 1 ? 'province' : code.length === 3 ? 'canton' : code.length === 5 ? 'district' : null;
  if (!level) continue;
  const name = level === 'province' ? feature.properties.Provincia : level === 'canton' ? feature.properties.Canton : feature.properties.Distrito;
  const key = slug(name);
  const entries = divisions.get(key) ?? [];
  entries.push({ level, province: slug(feature.properties.Provincia), canton: slug(feature.properties.Canton) });
  divisions.set(key, entries);
}

const priority = { district: 1, cantonal: 2, provincial: 3 };
function classifyRoute(sourceKey) {
  const parts = sourceKey.split('-');
  let best = 'district';
  let matched = false;
  for (let index = 1; index < parts.length; index += 1) {
    const left = parts.slice(0, index).join('-');
    const right = parts.slice(index).join('-');
    const origins = divisions.get(left);
    const destinations = divisions.get(right);
    if (!origins || !destinations) continue;
    matched = true;
    for (const origin of origins) {
      for (const destination of destinations) {
        const scope = origin.province !== destination.province
          ? 'provincial'
          : origin.canton !== destination.canton ? 'cantonal' : 'district';
        if (priority[scope] > priority[best]) best = scope;
      }
    }
  }
  return matched ? best : 'district';
}

const classified = routes.map((route) => ({ ...route, route_scope: classifyRoute(route.source_key) }));
writeFileSync(seedPath, `${JSON.stringify(classified, null, 2)}\n`, 'utf8');

const payload = JSON.stringify(classified);
const sql = `-- Generated from src/data/bus_routes_seed.json (${classified.length} complete records).
alter table public.bus_routes
  add column if not exists route_scope text not null default 'district';

alter table public.bus_routes drop constraint if exists bus_routes_route_scope_check;
alter table public.bus_routes add constraint bus_routes_route_scope_check
  check (route_scope in ('provincial', 'cantonal', 'district'));

create index if not exists bus_routes_scope_name_idx
  on public.bus_routes (route_scope, route_name);

insert into public.bus_routes (
  source_key, source_url, origin_city, destination_city, route_name,
  company_name, schedules, fare_crc, fare_note, terminal_name,
  terminal_latitude, terminal_longitude, last_verified_at, route_scope
)
select
  source_key, source_url, origin_city, destination_city, route_name,
  company_name, schedules, fare_crc, fare_note, terminal_name,
  terminal_latitude, terminal_longitude, last_verified_at, route_scope
from jsonb_to_recordset($bus_routes$${payload}$bus_routes$::jsonb) as route(
  source_key text, source_url text, origin_city text, destination_city text,
  route_name text, company_name text, schedules jsonb, fare_crc numeric,
  fare_note text, terminal_name text, terminal_latitude double precision,
  terminal_longitude double precision, last_verified_at timestamptz,
  route_scope text
)
on conflict (source_key) do update set
  source_url = excluded.source_url,
  origin_city = excluded.origin_city,
  destination_city = excluded.destination_city,
  route_name = excluded.route_name,
  company_name = excluded.company_name,
  schedules = excluded.schedules,
  fare_crc = excluded.fare_crc,
  fare_note = excluded.fare_note,
  terminal_name = excluded.terminal_name,
  terminal_latitude = excluded.terminal_latitude,
  terminal_longitude = excluded.terminal_longitude,
  last_verified_at = excluded.last_verified_at,
  route_scope = excluded.route_scope;
`;

writeFileSync(resolve(migrationPath), sql, 'utf8');
const counts = classified.reduce(
  (totals, route) => ({ ...totals, [route.route_scope]: totals[route.route_scope] + 1 }),
  { provincial: 0, cantonal: 0, district: 0 },
);
console.log(JSON.stringify({ migration: basename(migrationPath), total: classified.length, ...counts }));
