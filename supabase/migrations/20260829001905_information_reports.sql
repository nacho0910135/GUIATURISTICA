create table if not exists public.information_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('destination', 'commercial_service', 'road')),
  target_id uuid,
  target_key text,
  target_label text not null check (char_length(trim(target_label)) between 1 and 200),
  report_type text not null check (report_type in (
    'incorrect_information', 'destination_closed', 'price_changed',
    'hours_outdated', 'road_affected', 'business_closed'
  )),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists information_reports_target_idx
  on public.information_reports (target_type, target_id, created_at desc);
create index if not exists information_reports_status_idx
  on public.information_reports (status, created_at desc);

alter table public.information_reports enable row level security;

drop policy if exists "Usuarios envían reportes de información" on public.information_reports;
create policy "Usuarios envían reportes de información"
on public.information_reports for insert to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists "Usuarios leen sus reportes de información" on public.information_reports;
create policy "Usuarios leen sus reportes de información"
on public.information_reports for select to authenticated
using (
  reporter_id = (select auth.uid())
  or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin')
);

drop policy if exists "Administradores gestionan reportes de información" on public.information_reports;
create policy "Administradores gestionan reportes de información"
on public.information_reports for update to authenticated
using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin'));

grant select, insert on public.information_reports to authenticated;
