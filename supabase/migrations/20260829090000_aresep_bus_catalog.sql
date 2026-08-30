-- The legacy bus_routes catalog remains untouched.  ARESEP data is isolated
-- here so only official records can be surfaced to travellers.
create table if not exists public.aresep_bus_tariffs (
  source_key text primary key,
  codigo_ruta text,
  nombre_ruta text,
  codigo_ramal text,
  nombre_ramal text,
  codigo_fraccionamiento text,
  nombre_fraccionamiento text,
  ind_medicion_aresep text,
  provincia text,
  promedio_km_viaje numeric,
  tarifa_regular numeric,
  tarifa_adulto_mayor numeric,
  resolucion text,
  fecha_resolucion date,
  gaceta text,
  alcance text,
  fecha_gaceta date,
  fecha_vigencia date,
  expediente text,
  operadores text,
  tipo_servicio text,
  raw_payload jsonb not null,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists aresep_bus_tariffs_nombre_idx on public.aresep_bus_tariffs (nombre_fraccionamiento);
create index if not exists aresep_bus_tariffs_ruta_idx on public.aresep_bus_tariffs (codigo_ruta, codigo_ramal);

create table if not exists public.aresep_bus_route_map_metadata (
  source_key text primary key,
  codigo_ctp text,
  operador text,
  nombre_ruta text,
  codigo_distrito_inicio text,
  codigo_canton_inicio text,
  canton_inicio text,
  codigo_distrito_final text,
  codigo_canton_final text,
  canton_final text,
  distancia_km numeric,
  pendiente text,
  pavimentado text,
  anho_ramal text,
  raw_payload jsonb not null,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists aresep_bus_route_map_metadata_nombre_idx on public.aresep_bus_route_map_metadata (nombre_ruta);

create table if not exists public.aresep_bus_sync_requests (
  id bigint generated always as identity primary key,
  source_name text not null check (source_name in ('tariffs', 'map_metadata')),
  request_id bigint not null unique,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  row_count integer,
  error_message text
);

alter table public.aresep_bus_tariffs enable row level security;
alter table public.aresep_bus_route_map_metadata enable row level security;
alter table public.aresep_bus_sync_requests enable row level security;

drop policy if exists "Official ARESEP tariffs are readable" on public.aresep_bus_tariffs;
create policy "Official ARESEP tariffs are readable" on public.aresep_bus_tariffs for select using (true);
drop policy if exists "Official ARESEP route metadata is readable" on public.aresep_bus_route_map_metadata;
create policy "Official ARESEP route metadata is readable" on public.aresep_bus_route_map_metadata for select using (true);
drop policy if exists "ARESEP sync requests stay private" on public.aresep_bus_sync_requests;
create policy "ARESEP sync requests stay private" on public.aresep_bus_sync_requests for all using (false) with check (false);

-- Queues both public ARESEP datasets. pg_net runs asynchronously after commit;
-- the processing function below is deliberately scheduled a few minutes later.
create or replace function public.queue_aresep_bus_sync()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  tariffs_request_id bigint;
  map_request_id bigint;
begin
  select net.http_get(
    'https://datos.aresep.go.cr/ws.datosabiertos/Services/IT/PliegoTarifario.svc/ObtenerPliegoTarifarioAutobus/0',
    timeout_milliseconds := 60000
  ) into tariffs_request_id;

  insert into public.aresep_bus_sync_requests (source_name, request_id)
  values ('tariffs', tariffs_request_id);

  select net.http_get(
    'https://datos.aresep.go.cr/ws.datosabiertos/Services/IT/Autobus.svc/ObtenerInformacionParadasAutobusMapa',
    timeout_milliseconds := 60000
  ) into map_request_id;

  insert into public.aresep_bus_sync_requests (source_name, request_id)
  values ('map_metadata', map_request_id);
end;
$$;

create or replace function public.process_aresep_bus_sync()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  request_record record;
  response_body jsonb;
  imported_count integer;
begin
  for request_record in
    select r.id, r.source_name, r.request_id, h.status_code, h.error_msg, h.content
    from public.aresep_bus_sync_requests r
    left join net._http_response h on h.id = r.request_id
    where r.processed_at is null
    order by r.id
  loop
    if request_record.status_code is null then
      continue;
    end if;

    if request_record.status_code <> 200 or request_record.error_msg is not null then
      update public.aresep_bus_sync_requests
      set processed_at = now(), status = 'failed', error_message = coalesce(request_record.error_msg, 'ARESEP respondió HTTP ' || request_record.status_code)
      where id = request_record.id;
      continue;
    end if;

    begin
      response_body := request_record.content::jsonb;
      if response_body->'metadata'->>'success' <> 'true' or jsonb_typeof(response_body->'value') <> 'array' then
        raise exception 'La respuesta de ARESEP no tiene el formato esperado';
      end if;

      if request_record.source_name = 'tariffs' then
        insert into public.aresep_bus_tariffs (
          source_key, codigo_ruta, nombre_ruta, codigo_ramal, nombre_ramal,
          codigo_fraccionamiento, nombre_fraccionamiento, ind_medicion_aresep,
          provincia, promedio_km_viaje, tarifa_regular, tarifa_adulto_mayor,
          resolucion, fecha_resolucion, gaceta, alcance, fecha_gaceta,
          fecha_vigencia, expediente, operadores, tipo_servicio, raw_payload,
          source_updated_at
        )
        select distinct on (md5(concat_ws('|', coalesce(nullif(trim(x."codigoRuta"), ''), '-'), coalesce(nullif(trim(x."codigoRamal"), ''), '-'), coalesce(nullif(trim(x."codigoFraccionamiento"), ''), '-'))))
          md5(concat_ws('|', coalesce(nullif(trim(x."codigoRuta"), ''), '-'), coalesce(nullif(trim(x."codigoRamal"), ''), '-'), coalesce(nullif(trim(x."codigoFraccionamiento"), ''), '-'))),
          nullif(trim(x."codigoRuta"), ''), nullif(trim(x."nombreRuta"), ''),
          nullif(trim(x."codigoRamal"), ''), nullif(trim(x."nombreRamal"), ''),
          nullif(trim(x."codigoFraccionamiento"), ''), nullif(trim(x."nombreFraccionamiento"), ''), nullif(trim(x."indMedicionARESEP"), ''),
          nullif(trim(x.provincia), ''), nullif(trim(x."promedioKmViaje"), '')::numeric,
          nullif(trim(x."tarifaRegular"), '')::numeric, nullif(trim(x."tarifaAdultoMayor"), '')::numeric,
          nullif(trim(x.resolucion), ''), nullif(trim(x."fechaResolucion"), '')::date,
          nullif(trim(x.gaceta), ''), nullif(trim(x.alcance), ''), nullif(trim(x."fechaGaceta"), '')::date,
          nullif(trim(x."fechaVigencia"), '')::date, nullif(trim(x.expediente), ''),
          nullif(trim(x.operadores), ''), nullif(trim(x."tipoServicio"), ''), p.payload, now()
        from jsonb_array_elements(response_body->'value') as p(payload)
        cross join lateral jsonb_to_record(p.payload) as x(
          "codigoRuta" text, "nombreRuta" text, "codigoRamal" text, "nombreRamal" text,
          "codigoFraccionamiento" text, "nombreFraccionamiento" text, "indMedicionARESEP" text,
          provincia text, "promedioKmViaje" text, "tarifaRegular" text, "tarifaAdultoMayor" text,
          resolucion text, "fechaResolucion" text, gaceta text, alcance text, "fechaGaceta" text,
          "fechaVigencia" text, expediente text, operadores text, "tipoServicio" text
        )
        order by md5(concat_ws('|', coalesce(nullif(trim(x."codigoRuta"), ''), '-'), coalesce(nullif(trim(x."codigoRamal"), ''), '-'), coalesce(nullif(trim(x."codigoFraccionamiento"), ''), '-')))
        on conflict (source_key) do update set
          codigo_ruta = excluded.codigo_ruta, nombre_ruta = excluded.nombre_ruta,
          codigo_ramal = excluded.codigo_ramal, nombre_ramal = excluded.nombre_ramal,
          codigo_fraccionamiento = excluded.codigo_fraccionamiento, nombre_fraccionamiento = excluded.nombre_fraccionamiento,
          ind_medicion_aresep = excluded.ind_medicion_aresep, provincia = excluded.provincia,
          promedio_km_viaje = excluded.promedio_km_viaje, tarifa_regular = excluded.tarifa_regular,
          tarifa_adulto_mayor = excluded.tarifa_adulto_mayor, resolucion = excluded.resolucion,
          fecha_resolucion = excluded.fecha_resolucion, gaceta = excluded.gaceta, alcance = excluded.alcance,
          fecha_gaceta = excluded.fecha_gaceta, fecha_vigencia = excluded.fecha_vigencia,
          expediente = excluded.expediente, operadores = excluded.operadores, tipo_servicio = excluded.tipo_servicio,
          raw_payload = excluded.raw_payload, source_updated_at = excluded.source_updated_at;
      else
        insert into public.aresep_bus_route_map_metadata (
          source_key, codigo_ctp, operador, nombre_ruta, codigo_distrito_inicio,
          codigo_canton_inicio, canton_inicio, codigo_distrito_final, codigo_canton_final,
          canton_final, distancia_km, pendiente, pavimentado, anho_ramal, raw_payload, source_updated_at
        )
        select distinct on (md5(concat_ws('|', coalesce(nullif(trim(x."codigoCTP"), ''), '-'), coalesce(nullif(trim(x."nombreRuta"), ''), '-'), coalesce(nullif(trim(x."codigoDistritoInicio"), ''), '-'), coalesce(nullif(trim(x."codigoDistritoFinal"), ''), '-'))))
          md5(concat_ws('|', coalesce(nullif(trim(x."codigoCTP"), ''), '-'), coalesce(nullif(trim(x."nombreRuta"), ''), '-'), coalesce(nullif(trim(x."codigoDistritoInicio"), ''), '-'), coalesce(nullif(trim(x."codigoDistritoFinal"), ''), '-'))),
          nullif(trim(x."codigoCTP"), ''), nullif(trim(x.operador), ''), nullif(trim(x."nombreRuta"), ''),
          nullif(trim(x."codigoDistritoInicio"), ''), nullif(trim(x."codigoCantonInicio"), ''), nullif(trim(x."cantonInicio"), ''),
          nullif(trim(x."codigoDistritoFinal"), ''), nullif(trim(x."codigoCantonFinal"), ''), nullif(trim(x."cantonFinal"), ''),
          nullif(trim(x.distancia), '')::numeric, nullif(trim(x.pendiente), ''), nullif(trim(x.pavimentado), ''),
          nullif(trim(x."anhoRamal"), ''), p.payload, now()
        from jsonb_array_elements(response_body->'value') as p(payload)
        cross join lateral jsonb_to_record(p.payload) as x(
          "codigoCTP" text, operador text, "nombreRuta" text, "codigoDistritoInicio" text,
          "codigoCantonInicio" text, "cantonInicio" text, "codigoDistritoFinal" text,
          "codigoCantonFinal" text, "cantonFinal" text, distancia text, pendiente text,
          pavimentado text, "anhoRamal" text
        )
        order by md5(concat_ws('|', coalesce(nullif(trim(x."codigoCTP"), ''), '-'), coalesce(nullif(trim(x."nombreRuta"), ''), '-'), coalesce(nullif(trim(x."codigoDistritoInicio"), ''), '-'), coalesce(nullif(trim(x."codigoDistritoFinal"), ''), '-')))
        on conflict (source_key) do update set
          codigo_ctp = excluded.codigo_ctp, operador = excluded.operador, nombre_ruta = excluded.nombre_ruta,
          codigo_distrito_inicio = excluded.codigo_distrito_inicio, codigo_canton_inicio = excluded.codigo_canton_inicio,
          canton_inicio = excluded.canton_inicio, codigo_distrito_final = excluded.codigo_distrito_final,
          codigo_canton_final = excluded.codigo_canton_final, canton_final = excluded.canton_final,
          distancia_km = excluded.distancia_km, pendiente = excluded.pendiente, pavimentado = excluded.pavimentado,
          anho_ramal = excluded.anho_ramal, raw_payload = excluded.raw_payload, source_updated_at = excluded.source_updated_at;
      end if;

      get diagnostics imported_count = row_count;
      update public.aresep_bus_sync_requests
      set processed_at = now(), status = 'completed', row_count = imported_count
      where id = request_record.id;
    exception when others then
      update public.aresep_bus_sync_requests
      set processed_at = now(), status = 'failed', error_message = sqlerrm
      where id = request_record.id;
    end;
  end loop;
end;
$$;

revoke all on function public.queue_aresep_bus_sync() from public, anon, authenticated;
revoke all on function public.process_aresep_bus_sync() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname in ('aresep-bus-sync-request', 'aresep-bus-sync-process');
select cron.schedule('aresep-bus-sync-request', '10 9 * * *', 'select public.queue_aresep_bus_sync();');
select cron.schedule('aresep-bus-sync-process', '20 9 * * *', 'select public.process_aresep_bus_sync();');
