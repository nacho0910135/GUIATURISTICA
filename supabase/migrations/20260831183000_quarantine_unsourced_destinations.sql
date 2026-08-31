-- Do not show catalogue records that have neither a recorded source nor an
-- individually verified description.  This is reversible: the destination
-- records and their coordinates are retained for source-by-source research.
update public.destinations
set
  status = 'En revisión editorial',
  description = null,
  description_en = null,
  source_checked_at = null
where status = 'Activo'
  and source_url is null;

do $$
begin
  if exists (
    select 1
    from public.destinations
    where status = 'Activo'
      and source_url is null
  ) then
    raise exception 'No pueden permanecer destinos activos sin fuente registrada.';
  end if;
end
$$;
