create table public.group_rides (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  topic text not null check (topic in ('moteros', 'enduro', 'convoy_4x4')),
  title text not null check (char_length(title) between 3 and 100),
  place_name text not null check (char_length(place_name) between 3 and 160),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index group_rides_topic_starts_at_idx on public.group_rides (topic, starts_at);

create table public.group_ride_attendees (
  ride_id uuid not null references public.group_rides(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);

create index group_ride_attendees_user_id_idx on public.group_ride_attendees (user_id);

alter table public.group_rides enable row level security;
alter table public.group_ride_attendees enable row level security;

create policy "Rodadas visibles para todos"
on public.group_rides for select
to anon, authenticated
using (true);

create policy "Usuarios crean sus rodadas"
on public.group_rides for insert
to authenticated
with check ((select auth.uid()) = organizer_id);

create policy "Organizadores actualizan sus rodadas"
on public.group_rides for update
to authenticated
using ((select auth.uid()) = organizer_id)
with check ((select auth.uid()) = organizer_id);

create policy "Organizadores eliminan sus rodadas"
on public.group_rides for delete
to authenticated
using ((select auth.uid()) = organizer_id);

create policy "Asistencias visibles para todos"
on public.group_ride_attendees for select
to anon, authenticated
using (true);

create policy "Usuarios confirman su asistencia"
on public.group_ride_attendees for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Usuarios cancelan su asistencia"
on public.group_ride_attendees for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.group_rides, public.group_ride_attendees to anon;
grant select, insert, update, delete on public.group_rides to authenticated;
grant select, insert, delete on public.group_ride_attendees to authenticated;
