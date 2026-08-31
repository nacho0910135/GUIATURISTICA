-- Correct a misclassification introduced by the category-template import.
-- Evidence: the individual Qué Buen Lugar record identifies a 16 km, moderate
-- hiking route to the former mines at El Rodeo, Ciudad Colón; it is not a beach.
update public.destinations
set
  category = 'Senderismo',
  description = 'Las Minas de Hacienda el Rodeo son una caminata desde Ciudad Colón, San José, hacia antiguas minas en la zona de El Rodeo. La ficha de Qué Buen Lugar reporta un recorrido de 16 km, de dificultad moderada, con tramos de bosque, miradores y río. Confirmá el estado del sendero y las condiciones de la visita con la fuente antes de salir.',
  description_en = 'Minas de Hacienda el Rodeo is a hiking route from Ciudad Colón, San José, to former mines in the El Rodeo area. The Qué Buen Lugar listing reports a 16 km route of moderate difficulty, with forest sections, viewpoints, and a river. Confirm trail status and visit conditions with the source before setting out.',
  source_url = 'https://quebuenlugar.com/es/lugares/minas-de-hacienda-el-rodeo-san-jose',
  source_checked_at = now()
where id = '269bca15-b10f-4ea3-a0bd-11cfb2e058c2';

do $$
begin
  if not exists (
    select 1
    from public.destinations
    where id = '269bca15-b10f-4ea3-a0bd-11cfb2e058c2'
      and category = 'Senderismo'
      and description not ilike '%playa%'
  ) then
    raise exception 'La corrección auditada de Minas de Hacienda el Rodeo no se aplicó.';
  end if;
end
$$;
