-- OpenStreetMap confirms a cartographic location. Do not infer tourism
-- attributes, facilities, access conditions, or visitor recommendations from
-- map tags alone.
update public.destinations
set
  description = 'Ubicación cartográfica verificada en OpenStreetMap. Confirmá el acceso, los servicios y las condiciones de visita antes de salir.',
  description_en = 'Location verified in OpenStreetMap. Confirm access, services, and visit conditions before you go.',
  source_checked_at = now()
where status = 'Activo'
  and source_url like 'https://www.openstreetmap.org/%';

do $$
begin
  if exists (
    select 1
    from public.destinations
    where status = 'Activo'
      and source_url like 'https://www.openstreetmap.org/%'
      and (
        description <> 'Ubicación cartográfica verificada en OpenStreetMap. Confirmá el acceso, los servicios y las condiciones de visita antes de salir.'
        or description_en <> 'Location verified in OpenStreetMap. Confirm access, services, and visit conditions before you go.'
      )
  ) then
    raise exception 'Las fichas con fuente OpenStreetMap deben usar descripciones cartográficas neutras.';
  end if;
end
$$;
