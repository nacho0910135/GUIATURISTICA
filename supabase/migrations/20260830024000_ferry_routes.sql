create table if not exists public.ferry_routes (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  route_name text not null,
  origin_name text not null,
  destination_name text not null,
  operator text not null,
  schedules jsonb not null,
  schedule_note text,
  fare_adult_crc numeric(12,2),
  fare_child_crc numeric(12,2),
  fare_vehicle_crc numeric(12,2),
  fare_details jsonb not null default '{}'::jsonb,
  origin_terminal_name text,
  origin_waze_url text,
  destination_terminal_name text,
  destination_waze_url text,
  schedule_source_url text not null,
  fare_source_url text,
  valid_until date,
  last_verified_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ferry_routes_schedule_days check (jsonb_typeof(schedules) = 'object' and schedules ? 'weekday' and schedules ? 'saturday' and schedules ? 'sunday')
);

alter table public.ferry_routes enable row level security;
drop policy if exists "Published ferry routes are public" on public.ferry_routes;
create policy "Published ferry routes are public" on public.ferry_routes for select to anon, authenticated using (is_published);
grant select on public.ferry_routes to anon, authenticated;
revoke insert, update, delete on public.ferry_routes from anon, authenticated;
