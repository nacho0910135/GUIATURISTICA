create table if not exists public.tourist_bus_routes (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_url text not null,
  route_name text not null,
  origin_city text not null,
  destination_city text not null,
  company_name text,
  schedules jsonb not null,
  fare_crc numeric(12, 2) not null,
  fare_kind text not null default 'estimated' check (fare_kind in ('estimated', 'official')),
  terminal_name text,
  terminal_waze_url text,
  terminal_source_url text,
  last_verified_at timestamptz not null default now(),
  is_published boolean not null default false,
  quality_issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tourist_bus_routes_schedule_days check (
    jsonb_typeof(schedules) = 'object'
    and schedules ? 'weekday'
    and schedules ? 'saturday'
    and schedules ? 'sunday'
  )
);

create index if not exists tourist_bus_routes_published_name_idx
  on public.tourist_bus_routes (route_name)
  where is_published;

alter table public.tourist_bus_routes enable row level security;

drop policy if exists "Published tourist bus routes are public" on public.tourist_bus_routes;
create policy "Published tourist bus routes are public"
  on public.tourist_bus_routes
  for select
  to anon, authenticated
  using (is_published);

revoke insert, update, delete on public.tourist_bus_routes from anon, authenticated;
