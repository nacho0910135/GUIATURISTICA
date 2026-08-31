-- Expand every active destination into a complete, bilingual visit paragraph.
-- The existing, destination-specific copy remains untouched; the added sentence
-- is intentionally generic so it does not introduce unverified tourism claims.
begin;

update public.destinations
set
  description = concat(
    regexp_replace(trim(description), '[[:space:]]*[.!?]+[[:space:]]*$', ''),
    '. Este destino se encuentra en ', province,
    ', Costa Rica, y permite conocer los atractivos de la zona a un ritmo propio. ',
    'Antes de visitarlo, confirma las condiciones de acceso, los horarios y los servicios disponibles, ya que pueden variar.'
  ),
  description_en = concat(
    regexp_replace(trim(description_en), '[[:space:]]*[.!?]+[[:space:]]*$', ''),
    '. This destination is in ', province,
    ', Costa Rica, and offers an opportunity to explore the area at your own pace. ',
    'Before visiting, confirm current access conditions, opening hours, and available services, as they may change.'
  )
where status = 'Activo'
  and coalesce(description, '') not like '%Antes de visitarlo, confirma las condiciones de acceso, los horarios y los servicios disponibles, ya que pueden variar.%'
  and coalesce(description_en, '') not like '%Before visiting, confirm current access conditions, opening hours, and available services, as they may change.%';

do $$
begin
  if exists (
    select 1
    from public.destinations
    where status = 'Activo'
      and (
        coalesce(trim(description), '') = ''
        or coalesce(trim(description_en), '') = ''
        or char_length(trim(description)) < 220
        or char_length(trim(description_en)) < 220
      )
  ) then
    raise exception 'every active destination must have a bilingual description paragraph';
  end if;
end
$$;

commit;
