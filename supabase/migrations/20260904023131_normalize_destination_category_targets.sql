-- Keep root taxonomy targets compatible with the canonical Spanish labels,
-- their English equivalents, and their singular/plural forms.
with expected(id, allowed_targets) as (
  values
    ('beaches', array['playa','playas','beach','beaches']::text[]),
    ('waterfalls', array['catarata','cataratas','waterfall','waterfalls']::text[]),
    ('volcanoes', array['volcan','volcanes','volcano','volcanoes']::text[]),
    ('rivers-pools', array['rios y pozas','rio','rios','poza','pozas','lago','lagos','laguna','lagunas','rivers pools','river','rivers','pool','pools','lake','lakes']::text[]),
    ('viewpoints', array['mirador','miradores','viewpoint','viewpoints']::text[]),
    ('hiking', array['sender','senderismo','caminata','hiking','trail']::text[]),
    ('national-parks', array['parque nacional','parques nacionales','national park','national parks']::text[]),
    ('wildlife-reserves', array['reserva','reservas','reservas silvestres','wildlife reserve','wildlife reserves','refugio de vida silvestre','refugios de vida silvestre','wildlife refuge','wildlife refuges','nature reserve','nature reserves']::text[]),
    ('animal-sanctuaries', array['santuario','santuarios','santuarios de animales','animal sanctuary','animal sanctuaries']::text[]),
    ('hot-springs', array['termal','termales','hot spring','hot springs']::text[]),
    ('gastronomy', array['gastronom','experiencia gastronomica','comida','restaurante','cafe','cacao','food','gastronomic experience']::text[]),
    ('nightlife', array['bar','bares','discoteca','discotecas','vida nocturna','nightlife','club','clubs']::text[]),
    ('agrotourism', array['agroturismo','agritourism','finca','agricultura','farm']::text[]),
    ('adventure-sports', array['aventura y deportes','aventura','deporte','adventure and sports','adventure','sport','kayak','rafting','canopy','buceo','surf']::text[]),
    ('culture-history', array['cultura e historia','cultura','historia','culture and history','culture','history','arqueolog','museo']::text[]),
    ('nature-lodging', array['hospedaje en la naturaleza','hospedaje','nature lodging','lodging','lodge','glamping','cabana']::text[]),
    ('islands-mangroves', array['islas y manglares','isla','islas','manglar','manglares','islands and mangroves','island','islands','mangrove','mangroves']::text[]),
    ('mountains-hills', array['montanas y cerros','montana','montanas','cerro','cerros','mountains and hills','mountain','mountains','hill','hills','cumbre']::text[]),
    ('community-tourism', array['turismo comunitario','comunitario','community tourism','indigena']::text[])
), updated as (
  update public.app_options option
  set allowed_targets = expected.allowed_targets
  from expected
  where option.kind = 'destination_category'
    and option.parent_id is null
    and option.id = expected.id
  returning option.id
)
select case
  when (select count(*) from updated) = 19
   and (select count(*) from public.app_options where kind = 'destination_category' and parent_id is null and active) = 19
  then 1
  else (select 1 / (count(*) - count(*)) from updated)
end;
