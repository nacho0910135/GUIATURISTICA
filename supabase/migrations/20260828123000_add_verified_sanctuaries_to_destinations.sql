insert into public.destinations (
  id, name, province, region, category, description, location, difficulty,
  fee_type, status, source_url, source_checked_at
)
values
  (
    'af1a4249-acd9-4e0f-9772-f08eda57a711', 'Rescate Wildlife Rescue Center',
    'Alajuela', 'Valle Central', 'Santuarios de animales',
    'Centro de rescate y conservación de fauna silvestre en La Garita.',
    st_setsrid(st_makepoint(-84.27396, 10.01317), 4326), 'Fácil',
    'Consultar', 'Activo', 'https://rescatewildlife.org/directions/', now()
  ),
  (
    '6d5cf5b0-e476-48a9-a7cf-3eef14da8ea4', 'Jaguar Rescue Center',
    'Limón', 'Caribe', 'Santuarios de animales',
    'Centro de rescate y rehabilitación de fauna del Caribe en Playa Chiquita.',
    st_setsrid(st_makepoint(-82.723528, 9.642069), 4326), 'Fácil',
    'Consultar', 'Activo', 'https://www.jaguarrescue.foundation/en-us/HowtoGetHere', now()
  ),
  (
    '77a523cc-8d91-402a-99d3-0c3222792363', 'Toucan Rescue Ranch',
    'Heredia', 'Valle Central', 'Santuarios de animales',
    'Santuario dedicado al rescate, rehabilitación y liberación de fauna. Se requiere reservación.',
    st_setsrid(st_makepoint(-84.035139, 10.025806), 4326), 'Fácil',
    'De Pago', 'Activo', 'https://toucanrescueranch.org/es/faq/', now()
  ),
  (
    '27d97872-625e-43d8-9215-572b59da47be', 'Ponderosa Adventure Park',
    'Guanacaste', 'Guanacaste', 'Santuarios de animales',
    'Centro de vida silvestre y educación ambiental en Liberia.',
    st_setsrid(st_makepoint(-85.4, 10.54978), 4326), 'Fácil',
    'De Pago', 'Activo', 'https://ponderosaadventurepark.com/', now()
  )
on conflict (id) do update set
  name = excluded.name,
  province = excluded.province,
  region = excluded.region,
  category = excluded.category,
  description = excluded.description,
  location = excluded.location,
  difficulty = excluded.difficulty,
  fee_type = excluded.fee_type,
  status = excluded.status,
  source_url = excluded.source_url,
  source_checked_at = excluded.source_checked_at;
