do $$
declare
  duplicate_count integer;
begin
  select count(*)
  into duplicate_count
  from public.destinations
  where status = 'Inactivo'
    and name in (
      'Drake Bay (Bahía Drake)',
      'BAHÍA DRAKE - PUNTARENAS',
      'Catarata Nauyaca',
      'Catarata El Rey - Puriscal'
    );

  if duplicate_count <> 4 then
    raise exception 'Expected exactly 4 inactive duplicate destinations, found %', duplicate_count;
  end if;
end
$$;

delete from public.destinations
where status = 'Inactivo'
  and name in (
    'Drake Bay (Bahía Drake)',
    'BAHÍA DRAKE - PUNTARENAS',
    'Catarata Nauyaca',
    'Catarata El Rey - Puriscal'
  );

insert into public.app_options
  (kind, id, label_es, label_en, icon, parent_id, allowed_targets, sort_order, active)
values
  ('destination_category','agrotourism','Agroturismo','Agritourism','sprout',null,array['agroturismo','agritourism','finca','agricultura','farm'],130,true),
  ('destination_category','adventure-sports','Aventura y Deportes','Adventure & Sports','run-fast',null,array['aventura y deportes','aventura','deporte','adventure','sport','kayak','rafting','canopy','buceo','surf'],140,true),
  ('destination_category','culture-history','Cultura e Historia','Culture & History','bank-outline',null,array['cultura e historia','cultura','historia','culture','history','arqueolog','museo'],150,true),
  ('destination_category','nature-lodging','Hospedaje en la Naturaleza','Nature Lodging','home-outline',null,array['hospedaje en la naturaleza','hospedaje','lodging','lodge','glamping','cabana'],160,true),
  ('destination_category','islands-mangroves','Islas y Manglares','Islands & Mangroves','island',null,array['islas y manglares','isla','manglar','island','mangrove'],170,true),
  ('destination_category','mountains-hills','Montañas y Cerros','Mountains & Hills','terrain',null,array['montanas y cerros','montana','cerro','mountain','hill','cumbre'],180,true),
  ('destination_category','community-tourism','Turismo Comunitario','Community Tourism','account-group',null,array['turismo comunitario','comunitario','community tourism','indigena'],190,true)
on conflict (kind, id) do update
set label_es = excluded.label_es,
    label_en = excluded.label_en,
    icon = excluded.icon,
    parent_id = excluded.parent_id,
    allowed_targets = excluded.allowed_targets,
    sort_order = excluded.sort_order,
    active = excluded.active;

do $$
begin
  if (select count(*) from public.app_options where kind = 'destination_category' and parent_id is null and active) <> 19 then
    raise exception 'Destination taxonomy must contain exactly 19 active root categories';
  end if;
end
$$;
