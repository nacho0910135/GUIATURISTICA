-- Classify only destinations whose protected-area designation is explicit.
update public.destinations
set category = concat_ws(' / ', 'Reservas naturales y forestales', nullif(category, ''))
where id in (
  '8104fe85-a950-405b-b901-3706932f25cb', -- Reserva Biológica Isla del Caño
  'f1f8bc1a-b426-41b5-81ad-c8f3475e1eb4', -- Reserva Biológica Monteverde
  '8ceceb72-6890-4fac-9f02-d5fe7aad5211', -- Reserva Natural Absoluta Cabo Blanco
  'c4449fdb-0f4c-49b4-9389-504edecacafc'  -- Reserva Santa Elena
)
and category not ilike '%Reservas naturales y forestales%';

update public.destinations
set category = concat_ws(' / ', 'Refugios de vida silvestre', nullif(category, ''))
where id in (
  '5c3003af-a0be-409d-aeb4-8d3a700cc352', -- Refugio Bosque Alegre
  '62300b89-072f-429e-bbe9-401f147933cf', -- Barra del Colorado
  'da01f59f-0045-4aa2-b4ea-79ef67f4b8fd', -- Gandoca-Manzanillo
  'd599ee5d-2dbe-4886-9cd9-f3dbb48271c4', -- Curú
  '7cc91f6c-81a4-475b-8f76-640d84bbe216', -- Ostional
  '4d287a05-ab6a-4172-930f-1ae7280a3a6d'  -- Caño Negro
)
and category not ilike '%Refugios de vida silvestre%';

update public.destinations
set name = 'Refugio Nacional de Vida Silvestre Mixto Caño Negro'
where id = '4d287a05-ab6a-4172-930f-1ae7280a3a6d';
