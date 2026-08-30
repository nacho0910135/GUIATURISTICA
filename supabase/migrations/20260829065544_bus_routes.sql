create table if not exists public.bus_routes (
  id uuid primary key default gen_random_uuid(),
  origin_city text not null,
  destination_city text not null,
  source_key text not null unique,
  source_url text not null,
  route_name text not null,
  company_name text not null,
  schedules jsonb not null default '[]'::jsonb,
  fare_crc numeric,
  fare_note text,
  terminal_name text not null,
  terminal_latitude double precision,
  terminal_longitude double precision,
  last_verified_at timestamptz not null default now()
);

create index if not exists bus_routes_origin_destination_idx on public.bus_routes (origin_city, destination_city);

alter table public.bus_routes enable row level security;

create policy "Rutas de buses son públicas"
on public.bus_routes for select to anon, authenticated
using (true);

grant select on public.bus_routes to anon, authenticated;
