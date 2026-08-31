-- The prior OpenStreetMap beach way is nearby but does not identify the Peñón.
-- This source identifies the named rock formation as a viewpoint.
update public.destinations
set
  category = 'Mirador',
  description = 'El Peñón de Guacalillo es una formación rocosa usada como mirador en el sector de Playa Guacalillo, Tárcoles, Puntarenas. La ubicación y el carácter de mirador se contrastaron con una referencia cartográfica específica; consultá condiciones de acceso y seguridad antes de la visita.',
  description_en = 'Peñón de Guacalillo is a rock formation used as a scenic viewpoint in the Playa Guacalillo area of Tárcoles, Puntarenas. Its location and viewpoint designation were checked against a specific map reference; confirm access and safety conditions before visiting.',
  source_url = 'https://mapcarta.com/es/N9743990110',
  source_checked_at = now()
where id = 'eb571fca-80b2-45c7-b921-1337e443d54e';

do $$
begin
  if not exists (
    select 1
    from public.destinations
    where id = 'eb571fca-80b2-45c7-b921-1337e443d54e'
      and category = 'Mirador'
      and source_url = 'https://mapcarta.com/es/N9743990110'
  ) then
    raise exception 'La fuente auditada del Peñón de Guacalillo no se aplicó.';
  end if;
end
$$;
