create table if not exists public.cantonal_bus_routes (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_url text not null,
  route_name text not null,
  origin_city text not null,
  destination_city text not null,
  company_name text,
  schedules jsonb not null,
  fare_crc numeric(12, 2),
  fare_kind text not null default 'official' check (fare_kind in ('estimated', 'official')),
  terminal_name text,
  terminal_waze_url text,
  terminal_source_url text,
  last_verified_at timestamptz not null default now(),
  is_published boolean not null default false,
  quality_issues jsonb not null default '[]'::jsonb,
  route_scope text not null default 'cantonal' check (route_scope = 'cantonal'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cantonal_bus_routes_schedule_days check (jsonb_typeof(schedules) = 'object' and schedules ? 'weekday' and schedules ? 'saturday' and schedules ? 'sunday')
);
alter table public.cantonal_bus_routes enable row level security;
drop policy if exists "Published cantonal bus routes are public" on public.cantonal_bus_routes;
create policy "Published cantonal bus routes are public" on public.cantonal_bus_routes for select to anon, authenticated using (is_published);
revoke insert, update, delete on public.cantonal_bus_routes from anon, authenticated;
