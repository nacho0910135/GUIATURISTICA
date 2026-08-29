-- Regions are data, not UI constants. Coordinates provide a small geofence
-- while region_id keeps future imports and owner registrations normalized.
create table if not exists public.commerce_regions (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name_es text not null,
  name_en text not null,
  province text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_km double precision not null default 30 check (radius_km > 0 and radius_km <= 200),
  active boolean not null default true,
  source text not null default 'community' check (source in ('ICT', 'SINAC', 'community', 'owner_registered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.commerce_regions (id, name_es, name_en, province, latitude, longitude, radius_km, source)
values
  ('la_fortuna_arenal', 'La Fortuna–Arenal', 'La Fortuna–Arenal', 'Alajuela', 10.4719, -84.6453, 30, 'ICT'),
  ('monteverde', 'Monteverde', 'Monteverde', 'Puntarenas', 10.3150, -84.8250, 25, 'ICT'),
  ('manuel_antonio', 'Manuel Antonio', 'Manuel Antonio', 'Puntarenas', 9.3920, -84.1460, 30, 'ICT'),
  ('tamarindo', 'Tamarindo', 'Tamarindo', 'Guanacaste', 10.2990, -85.8400, 30, 'ICT'),
  ('puerto_viejo', 'Puerto Viejo', 'Puerto Viejo', 'Limón', 9.6560, -82.7540, 30, 'ICT'),
  ('san_jose', 'San José', 'San José', 'San José', 9.9320, -84.0800, 25, 'ICT')
on conflict (id) do update set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  province = excluded.province,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  radius_km = excluded.radius_km,
  active = true,
  updated_at = now();

alter table public.commercial_services
  add column if not exists region_id text references public.commerce_regions(id),
  add column if not exists is_claimed boolean not null default false,
  add column if not exists source text not null default 'community';

alter table public.commercial_services
  drop constraint if exists commercial_services_source_check,
  add constraint commercial_services_source_check
    check (source in ('ICT', 'SINAC', 'community', 'owner_registered'));

-- Existing public-service imports have no owner and remain unclaimed.
update public.commercial_services
set
  source = case
    when upper(coalesce(data_source, '')) like '%SINAC%' then 'SINAC'
    when upper(coalesce(data_source, '')) like '%ICT%' then 'ICT'
    when owner_id is not null then 'owner_registered'
    else 'community'
  end,
  is_claimed = owner_id is not null
where source is null or source = 'community' or is_claimed is distinct from (owner_id is not null);

-- Keep preloaded and owner-created rows attached to the nearest available zone.
with nearest_regions as (
  select service.id,
    (select r.id
     from public.commerce_regions r
     where r.active
     order by service.location <-> st_setsrid(st_makepoint(r.longitude, r.latitude), 4326)
     limit 1) as region_id
  from public.commercial_services service
  where service.region_id is null
)
update public.commercial_services service
set region_id = nearest_regions.region_id
from nearest_regions
where service.id = nearest_regions.id;

create index if not exists commercial_services_region_id_idx
  on public.commercial_services (region_id);

alter table public.commercial_services
  drop constraint if exists commercial_services_owner_auth_users_fkey,
  add constraint commercial_services_owner_auth_users_fkey
    foreign key (owner_id) references auth.users(id) not valid;

create or replace function public.sync_commercial_service_region_and_claim()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if new.owner_id is null then
    new.is_claimed := false;
  else
    new.is_claimed := true;
    if new.source = 'community' then new.source := 'owner_registered'; end if;
  end if;

  if new.location is not null then
    select r.id into new.region_id
    from public.commerce_regions r
    where r.active
    order by new.location <-> st_setsrid(st_makepoint(r.longitude, r.latitude), 4326)
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_commercial_service_region_and_claim on public.commercial_services;
create trigger sync_commercial_service_region_and_claim
before insert or update of owner_id, location, source, is_claimed on public.commercial_services
for each row execute function public.sync_commercial_service_region_and_claim();

alter table public.commerce_regions enable row level security;
drop policy if exists "Regiones comerciales públicas" on public.commerce_regions;
create policy "Regiones comerciales públicas"
on public.commerce_regions for select to anon, authenticated
using (active = true);

grant select on public.commerce_regions to anon, authenticated;
