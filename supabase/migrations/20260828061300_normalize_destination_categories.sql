-- Keep the existing text column: slash-separated categories already work with
-- the app's ILIKE filters and avoid a second category system.
update public.destinations as destination
set category = correction.category
from (values
  ('04864685-223f-49bf-b236-ddf5aef7b194'::uuid, 'Senderismo'),
  ('1fc1f83f-03fe-4c96-b3cb-a9a0595110f3'::uuid, 'Catarata / Senderismo'),
  ('afe982d6-2bcc-4fce-8fa2-3d17a5ce29ee'::uuid, 'Senderismo'),
  ('ef6f47bf-79a6-4a63-a51a-d36ee1c2272d'::uuid, 'Senderismo / Mirador'),
  ('aaeb7eb9-513a-4eff-b8b0-8ba75e915463'::uuid, 'Playa'),
  ('004af9c6-97f7-4e9b-9700-28eac2dcd40a'::uuid, 'Senderismo'),
  ('ed8912bc-b01c-41fe-b08e-3d6ee4831c6e'::uuid, 'Cultura / Playa'),
  ('a74744da-5d45-4cac-bdfc-0a04c23e6b29'::uuid, 'Parque Nacional / Cultura'),
  ('dc2af359-fa23-475b-aa5a-72f0e8334231'::uuid, 'Senderismo'),
  ('6f546a5a-0c36-4baf-8c24-d3f41cb5f145'::uuid, 'Volcán / Termales'),
  ('c4034cbc-82dc-4861-b44c-a5a647def3c7'::uuid, 'Playa'),
  ('a3a2dab4-d909-4c86-a041-836b5c4637f8'::uuid, 'Senderismo / Mirador'),
  ('f6fa4a81-7b04-47be-b8e4-508967111f21'::uuid, 'Cultura / Senderismo'),
  ('e4c9f859-f7f4-4b51-aea7-1b2af451182a'::uuid, 'Cultura / Playa'),
  ('62300b89-072f-429e-bbe9-401f147933cf'::uuid, 'Senderismo / Río'),
  ('da01f59f-0045-4aa2-b4ea-79ef67f4b8fd'::uuid, 'Senderismo / Playa / Mirador'),
  ('d599ee5d-2dbe-4886-9cd9-f3dbb48271c4'::uuid, 'Senderismo / Playa'),
  ('7cc91f6c-81a4-475b-8f76-640d84bbe216'::uuid, 'Senderismo / Playa'),
  ('4d287a05-ab6a-4172-930f-1ae7280a3a6d'::uuid, 'Senderismo / Pozas / Lagos'),
  ('8104fe85-a950-405b-b901-3706932f25cb'::uuid, 'Playa'),
  ('f1f8bc1a-b426-41b5-81ad-c8f3475e1eb4'::uuid, 'Senderismo'),
  ('8ceceb72-6890-4fac-9f02-d5fe7aad5211'::uuid, 'Senderismo / Playa'),
  ('c4449fdb-0f4c-49b4-9389-504edecacafc'::uuid, 'Senderismo'),
  ('21978a3e-3177-4d59-9fa1-de2d059fc126'::uuid, 'Río'),
  ('73c70ca5-4437-4e5c-964a-3edea8c86142'::uuid, 'Senderismo'),
  ('f5504c6b-1d94-49a1-bee0-c6e2e6aa20b4'::uuid, 'Catarata / Senderismo'),
  ('dfa9f30c-0ac8-485d-b2c8-b9855782497e'::uuid, 'Catarata / Parque Nacional / Volcán'),
  ('5348f4c1-8357-43d8-9bb6-2e1f2153d772'::uuid, 'Parque Nacional / Volcán'),
  ('90168df9-d141-4ff5-9683-49b6e1ff3517'::uuid, 'Parque Nacional / Volcán / Senderismo'),
  ('a22f413f-9398-4154-a27f-7b1b2060a3a6'::uuid, 'Parque Nacional / Volcán'),
  ('a7bc2b3b-8fd3-44c8-a263-477f937b3021'::uuid, 'Parque Nacional / Volcán / Senderismo'),
  ('265b68c2-77d1-412e-aa44-1517119f90d7'::uuid, 'Parque Nacional / Volcán / Senderismo'),
  ('15e54bc6-d0ab-4011-a184-4ed850b47cdd'::uuid, 'Parque Nacional / Volcán / Senderismo'),
  ('4b7fb57a-7d3a-4682-9e89-0f64ffc14835'::uuid, 'Santuarios de animales'),
  ('4e66c108-7ed0-4265-b12c-41ca17547271'::uuid, 'Santuarios de animales')
) as correction(id, category)
where destination.id = correction.id
  and destination.status = 'Activo';
