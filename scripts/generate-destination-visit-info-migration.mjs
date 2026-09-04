import { readFile, writeFile } from 'node:fs/promises';

const [destinationPath, visitInfoPath, outputPath] = process.argv.slice(2);
if (!destinationPath || !visitInfoPath || !outputPath) {
  throw new Error('Usage: node generate-destination-visit-info-migration.mjs <destinations.json> <visit-info.json> <migration.sql>');
}

const destinations = JSON.parse(await readFile(destinationPath, 'utf8'));
const visitInfo = JSON.parse(await readFile(visitInfoPath, 'utf8'));
if (destinations.length !== visitInfo.length || !destinations.every((item, index) => item.id === visitInfo[index].id && item.name === visitInfo[index].name)) {
  throw new Error('Destination and visit-info files do not have the same ordered records.');
}

const coordinates = (url) => {
  const match = String(url).match(/query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Invalid Google Maps URL: ${url}`);
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
};
const optionalText = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return !text || /^no (?:especificado|definido)$/i.test(text) ? null : text;
};

const payload = destinations.map((destination, index) => {
  const info = visitInfo[index];
  const point = coordinates(destination.googleMapsUrl);
  return {
    name: destination.name.trim(),
    latitude: point.latitude,
    longitude: point.longitude,
    tipo_acceso: optionalText(info.tipo_acceso),
    estado_camino: optionalText(info.estado_camino),
    duracion_estimada: optionalText(info.duracion_estimada),
    mejor_temporada: optionalText(info.mejor_temporada),
    recomendaciones_seguridad: optionalText(info.recomendaciones_seguridad),
    enlace_web: optionalText(info.enlace_web),
    reserva_requerida: typeof info.reserva_requerida === 'boolean' ? info.reserva_requerida : null,
    horario_atencion: optionalText(info.horario_atencion),
    estacionamiento: optionalText(info.estacionamiento),
    servicios_sanitarios: typeof info.servicios_sanitarios === 'boolean' ? info.servicios_sanitarios : null,
    restaurante_o_soda: typeof info.restaurante_o_soda === 'boolean' ? info.restaurante_o_soda : null,
    acceso_para_discapacitados: optionalText(info.acceso_para_discapacitados),
    se_permite_mascotas: optionalText(info.se_permite_mascotas),
    camping_permitido: optionalText(info.camping_permitido),
    codigo_local: optionalText(info.codigo_local),
    relevancia_cultural: optionalText(info.relevancia_cultural),
  };
});

const sql = `create table public.destination_visit_info (
  destination_id uuid primary key references public.destinations(id) on delete cascade,
  tipo_acceso text,
  estado_camino text,
  duracion_estimada text,
  mejor_temporada text,
  recomendaciones_seguridad text,
  enlace_web text check (enlace_web is null or enlace_web ~ '^https?://'),
  reserva_requerida boolean,
  horario_atencion text,
  estacionamiento text,
  servicios_sanitarios boolean,
  restaurante_o_soda boolean,
  acceso_para_discapacitados text,
  se_permite_mascotas text,
  camping_permitido text,
  codigo_local text,
  relevancia_cultural text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.destination_visit_info is
  'Practical visit information with one optional row per destination.';

alter table public.destination_visit_info enable row level security;
revoke all on table public.destination_visit_info from anon, authenticated;
grant select on table public.destination_visit_info to anon, authenticated;

create policy "Public can read destination visit information"
on public.destination_visit_info
for select
to anon, authenticated
using (true);

create temporary table destination_visit_info_payload (
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  tipo_acceso text,
  estado_camino text,
  duracion_estimada text,
  mejor_temporada text,
  recomendaciones_seguridad text,
  enlace_web text,
  reserva_requerida boolean,
  horario_atencion text,
  estacionamiento text,
  servicios_sanitarios boolean,
  restaurante_o_soda boolean,
  acceso_para_discapacitados text,
  se_permite_mascotas text,
  camping_permitido text,
  codigo_local text,
  relevancia_cultural text
) on commit drop;

insert into destination_visit_info_payload
select *
from jsonb_to_recordset($visit_info$${JSON.stringify(payload, null, 2)}$visit_info$::jsonb)
as item(
  name text,
  latitude double precision,
  longitude double precision,
  tipo_acceso text,
  estado_camino text,
  duracion_estimada text,
  mejor_temporada text,
  recomendaciones_seguridad text,
  enlace_web text,
  reserva_requerida boolean,
  horario_atencion text,
  estacionamiento text,
  servicios_sanitarios boolean,
  restaurante_o_soda boolean,
  acceso_para_discapacitados text,
  se_permite_mascotas text,
  camping_permitido text,
  codigo_local text,
  relevancia_cultural text
);

create temporary table destination_visit_info_matches on commit drop as
select destination.id as destination_id, payload.*
from destination_visit_info_payload payload
join public.destinations destination
  on destination.status = 'Activo'
 and destination.name = payload.name
 and abs(destination.latitude - payload.latitude) < 0.0000001
 and abs(destination.longitude - payload.longitude) < 0.0000001;

do $$
begin
  if (select count(*) from destination_visit_info_payload) <> ${payload.length} then
    raise exception 'Expected ${payload.length} visit-information records';
  end if;
  if (select count(*) from destination_visit_info_matches) <> ${payload.length} then
    raise exception 'Visit information matched % destinations; expected ${payload.length}',
      (select count(*) from destination_visit_info_matches);
  end if;
  if (select count(distinct destination_id) from destination_visit_info_matches) <> ${payload.length} then
    raise exception 'Visit information did not match destinations one-to-one';
  end if;
end
$$;

insert into public.destination_visit_info (
  destination_id,
  tipo_acceso,
  estado_camino,
  duracion_estimada,
  mejor_temporada,
  recomendaciones_seguridad,
  enlace_web,
  reserva_requerida,
  horario_atencion,
  estacionamiento,
  servicios_sanitarios,
  restaurante_o_soda,
  acceso_para_discapacitados,
  se_permite_mascotas,
  camping_permitido,
  codigo_local,
  relevancia_cultural
)
select
  destination_id,
  tipo_acceso,
  estado_camino,
  duracion_estimada,
  mejor_temporada,
  recomendaciones_seguridad,
  enlace_web,
  reserva_requerida,
  horario_atencion,
  estacionamiento,
  servicios_sanitarios,
  restaurante_o_soda,
  acceso_para_discapacitados,
  se_permite_mascotas,
  camping_permitido,
  codigo_local,
  relevancia_cultural
from destination_visit_info_matches;
`;

await writeFile(outputPath, sql, 'utf8');
console.log(JSON.stringify({ generated: payload.length, outputPath }, null, 2));
