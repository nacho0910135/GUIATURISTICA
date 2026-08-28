update public.commercial_services
set main_category = 'cruz_roja', subcategory = 'cruz_roja'
where title ilike any (array['%cruz roja%', '%red cross%']);

update public.commercial_services
set main_category = 'guardacostas', subcategory = 'guardacostas'
where title ilike any (array['%guardacosta%', '%coast guard%']);

update public.commercial_services
set main_category = 'policia_transito', subcategory = 'policia_transito'
where title ilike any (array['%tránsito%', '%transito%', '%policía de tráfico%', '%policia de trafico%']);

delete from public.reviews r
using public.commercial_services s
where r.target_type = 'service'
  and r.target_id = s.id
  and s.main_category not in (
  'hospital', 'policia', 'clinica', 'bomberos', 'fire_station', 'cruz_roja', 'red_cross',
  'embajada', 'consulado', 'embassy', 'consulate', 'migracion_extranjeria', 'migracion',
  'extranjeria', 'immigration', 'guardacostas', 'coast_guard', 'policia_transito', 'transito',
  'traffic_police', 'urgencias_privadas', 'clinica_24_7', 'informacion_turistica', 'tourist_information'
);

delete from public.likes l
using public.commercial_services s
where l.target_type = 'service'
  and l.target_id = s.id
  and s.main_category not in (
  'hospital', 'policia', 'clinica', 'bomberos', 'fire_station', 'cruz_roja', 'red_cross',
  'embajada', 'consulado', 'embassy', 'consulate', 'migracion_extranjeria', 'migracion',
  'extranjeria', 'immigration', 'guardacostas', 'coast_guard', 'policia_transito', 'transito',
  'traffic_police', 'urgencias_privadas', 'clinica_24_7', 'informacion_turistica', 'tourist_information'
);

delete from public.commercial_services
where main_category not in (
  'hospital',
  'policia',
  'clinica',
  'bomberos',
  'fire_station',
  'cruz_roja',
  'red_cross',
  'embajada',
  'consulado',
  'embassy',
  'consulate',
  'migracion_extranjeria',
  'migracion',
  'extranjeria',
  'immigration',
  'guardacostas',
  'coast_guard',
  'policia_transito',
  'transito',
  'traffic_police',
  'urgencias_privadas',
  'clinica_24_7',
  'informacion_turistica',
  'tourist_information'
);
