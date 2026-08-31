-- Cinema data remains informational: all schedules and purchases stay on operator websites.
insert into public.app_options (kind, id, label_es, label_en, icon, parent_id, allowed_targets, sort_order, active)
values
  ('commerce_category', 'cinemas', 'Cines', 'Cinemas', 'movie-open-outline', null, null, 105, true),
  ('commerce_subcategory', 'multiplex', 'Cines comerciales', 'Multiplex cinemas', null, 'cinemas', null, 10, true),
  ('commerce_subcategory', 'independent_cinema', 'Cine independiente', 'Independent cinema', null, 'cinemas', null, 20, true)
on conflict (kind, id) do update set
  label_es = excluded.label_es,
  label_en = excluded.label_en,
  icon = excluded.icon,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  active = true;

create table if not exists public.cinema_movies (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  title_es text not null,
  title_en text,
  poster_url text not null check (poster_url ~* '^https://'),
  official_url text not null check (official_url ~* '^https://'),
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.cinema_movies enable row level security;
grant select on public.cinema_movies to anon, authenticated;
drop policy if exists "Cartelera de cine pública" on public.cinema_movies;
create policy "Cartelera de cine pública" on public.cinema_movies
  for select to anon, authenticated using (active);

insert into public.cinema_movies (id, title_es, title_en, poster_url, official_url, sort_order, active, updated_at)
values
  ('coyote_vs_acme', 'Coyote VS. ACME', 'Coyote VS. ACME', 'https://web-ticketing.novacinemas.cr/CDN/Image/Entity//FilmAdvertising/HO00001982?v=1', 'https://www.novacinemas.cr/movies/coyote-vs-acme/', 10, true, now()),
  ('la_odisea', 'La Odisea', 'The Odyssey', 'https://assets.biggerpicture.ai/assets/HO-1620/eventmaster/2214_4.png', 'https://cinepolis.co.cr/movie/la-odisea/', 20, true, now()),
  ('spider_man_un_nuevo_dia', 'Spider-Man: Un nuevo día', 'Spider-Man: Brand New Day', 'https://assets.biggerpicture.ai/assets/HO-1620/eventmaster/2232_4.png', 'https://cinepolis.co.cr/movie/spider-man-un-nuevo-dia/', 30, true, now()),
  ('paw_patrol_la_dino_pelicula', 'Paw Patrol: La Dino película', 'Paw Patrol: The Dino Movie', 'https://assets.biggerpicture.ai/assets/HO-1620/eventmaster/2256_4.png', 'https://cinepolis.co.cr/movie/paw-patrol-la-dino-pelicula/', 40, true, now())
on conflict (id) do update set
  title_es = excluded.title_es,
  title_en = excluded.title_en,
  poster_url = excluded.poster_url,
  official_url = excluded.official_url,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

with cinema_seed (source_record_id, subcategory, title, description, booking_url, longitude, latitude) as (
  values
    ('cinema_cinepolis_multicentro', 'multiplex', 'Cinépolis Multicentro', 'Cartelera y compra de boletos en el sitio oficial de Cinépolis.', 'https://cinepolis.co.cr/cinema/cinepolis-multicentro/', -84.064606, 9.897199),
    ('cinema_cinepolis_lincoln', 'multiplex', 'Cinépolis Lincoln', 'Cartelera y compra de boletos en el sitio oficial de Cinépolis.', 'https://cinepolis.co.cr/cinema/cinepolis-lincoln/', -84.047806, 9.962051),
    ('cinema_cinepolis_terramall', 'multiplex', 'Cinépolis TerraMall', 'Cartelera y compra de boletos en el sitio oficial de Cinépolis.', 'https://cinepolis.co.cr/cinema/cinepolis-terramall/', -83.985886, 9.908228),
    ('cinema_cinepolis_paseo_flores', 'multiplex', 'Cinépolis Paseo de las Flores', 'Cartelera y compra de boletos en el sitio oficial de Cinépolis.', 'https://cinepolis.co.cr/cinema/cinepolis-paseo-de-las-flores/', -84.112093, 9.986412),
    ('cinema_nova_avenida_escazu', 'multiplex', 'Nova Cinemas Avenida Escazú', 'Cartelera y compra de boletos en el sitio oficial de Nova Cinemas.', 'https://www.novacinemas.cr/cartelera/avenida-escazu/', -84.142819, 9.938373),
    ('cinema_nova_ciudad_este', 'multiplex', 'Nova Cinemas Ciudad del Este', 'Cartelera y compra de boletos en el sitio oficial de Nova Cinemas.', 'https://www.novacinemas.cr/cartelera/ciudad-del-este-curridabat/', -84.039970, 9.925727),
    ('cinema_nova_plaza_real', 'multiplex', 'Nova Cinemas Plaza Real Alajuela', 'Cartelera y compra de boletos en el sitio oficial de Nova Cinemas.', 'https://www.novacinemas.cr/cartelera/plaza-real-alajuela/', -84.311491, 9.995670),
    ('cinema_nova_plaza_moin', 'multiplex', 'Nova Cinemas Plaza Moín', 'Cartelera y compra de boletos en el sitio oficial de Nova Cinemas.', 'https://www.novacinemas.cr/cartelera/plaza-moin-limon/', -83.030430, 9.993571),
    ('cinema_nova_tamarindo', 'multiplex', 'Nova Cinemas Tamarindo', 'Cartelera y compra de boletos en el sitio oficial de Nova Cinemas.', 'https://www.novacinemas.cr/cartelera/nova-tamarindo-plaza-garden/', -85.830826, 10.308514),
    ('cinema_ccm_san_carlos', 'multiplex', 'CCM Cinemas San Carlos', 'Cartelera y compra de boletos en el sitio oficial de CCM Cinemas.', 'https://www.ccmcinemas.com/', -84.432321, 10.349567),
    ('cinema_ccm_san_ramon', 'multiplex', 'CCM Cinemas San Ramón', 'Cartelera y compra de boletos en el sitio oficial de CCM Cinemas.', 'https://www.ccmcinemas.com/', -84.469490, 10.089356)
), updated as (
  update public.commercial_services service
  set
    category = 'cinemas',
    subcategories = array[seed.subcategory],
    main_category = 'cinemas',
    subcategory = seed.subcategory,
    title = seed.title,
    description = seed.description,
    booking_url = seed.booking_url,
    location = public.st_setsrid(public.st_makepoint(seed.longitude, seed.latitude), 4326),
    business_verified_at = now(),
    business_verification_evidence_url = seed.booking_url,
    business_updated_at = now(),
    is_sponsored = false
  from cinema_seed seed
  where service.source_record_id = seed.source_record_id
    and service.data_source = 'Sitio oficial de cine'
  returning service.id
)
insert into public.commercial_services (
  source_record_id, category, subcategories, main_category, subcategory, title, description,
  booking_url, location, source, data_source, source_license, source_updated_at, imported_at,
  business_verified_at, business_verification_evidence_url, business_updated_at, is_sponsored
)
select
  seed.source_record_id, 'cinemas', array[seed.subcategory], 'cinemas', seed.subcategory, seed.title, seed.description,
  seed.booking_url, public.st_setsrid(public.st_makepoint(seed.longitude, seed.latitude), 4326),
  'community', 'Sitio oficial de cine', 'Operador oficial', now(), now(),
  now(), seed.booking_url, now(), false
from cinema_seed seed
where not exists (
  select 1
  from public.commercial_services service
  where service.source_record_id = seed.source_record_id
    and service.data_source = 'Sitio oficial de cine'
);
