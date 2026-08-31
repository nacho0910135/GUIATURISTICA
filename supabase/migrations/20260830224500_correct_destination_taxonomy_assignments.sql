-- Correct two explicit destination assignments without touching unrelated records.
do $$
begin
  if not exists (
    select 1 from public.destinations
    where id = '759f7f76-606d-4629-9867-81e66bbac63e'
      and name = 'Puente de los Cocodrilos (Río Tárcoles)'
      and status = 'Activo'
      and category = 'Mirador / Fauna'
  ) then
    raise exception 'Expected active destination Puente de los Cocodrilos (Río Tárcoles) was not found';
  end if;

  if not exists (
    select 1 from public.destinations
    where id = '706178a4-1fa7-46d6-89eb-2cf6adfca3fb'
      and name = 'Playa Negra'
      and status = 'Activo'
      and category = 'Playa / Surf'
  ) then
    raise exception 'Expected active destination Playa Negra was not found';
  end if;
end
$$;

update public.destinations
set category = 'Reservas naturales y forestales / Mirador / Fauna'
where id = '759f7f76-606d-4629-9867-81e66bbac63e';

update public.destinations
set category = 'Playa / Surf / Arena negra'
where id = '706178a4-1fa7-46d6-89eb-2cf6adfca3fb';
