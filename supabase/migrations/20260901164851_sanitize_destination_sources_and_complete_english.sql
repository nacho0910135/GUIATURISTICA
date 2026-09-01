-- Keep third-party research references out of public destination fields and ensure
-- Foreigner mode always receives English copy. Historical migration records remain
-- untouched so the database change history stays auditable.
update public.destinations
set
  source_url = case
    when source_url ilike '%yoviajo.cr%' or source_url ilike '%quebuenlugar.com%' then null
    else source_url
  end,
  verification_evidence_url = case
    when verification_evidence_url ilike '%yoviajo.cr%' or verification_evidence_url ilike '%quebuenlugar.com%' then null
    else verification_evidence_url
  end,
  image_source_url = case
    when image_source_url ilike '%yoviajo.cr%' or image_source_url ilike '%quebuenlugar.com%' then null
    else image_source_url
  end;

update public.destinations
set description_en = concat(
  'Discover ', name, ' in ', province, ', Costa Rica. ',
  'Check current access, opening hours, weather, and local safety conditions before visiting.'
)
where nullif(btrim(description_en), '') is null
   or lower(description_en) ~ '(^| )(el|la|los|las|una|un|para|con|ubicad[oa]|sendero|catarata|playa|cueva|bosque|visita)( |[,.])';

update public.destinations
set
  description = concat(
    name, ' es un destino ubicado en ', province, ', Costa Rica. ',
    'Antes de visitarlo, confirmá el acceso, los horarios, el clima y las condiciones locales de seguridad.'
  ),
  description_en = concat(
    'Discover ', name, ' in ', province, ', Costa Rica. ',
    'Check current access, opening hours, weather, and local safety conditions before visiting.'
  )
where description ilike '%Qué Buen Lugar%'
   or description ilike '%Que Buen Lugar%'
   or description ilike '%Yo Viajo%'
   or description_en ilike '%Qué Buen Lugar%'
   or description_en ilike '%Que Buen Lugar%'
   or description_en ilike '%Yo Viajo%';
