-- Public exploration is guest-first. Restore read access only for public
-- tourism records and the non-sensitive profile columns used for attribution.
grant select on table public.destinations to anon;
grant select on table public.destination_photos to anon;
grant select on table public.destination_suggestions to anon;
grant select on table public.fauna_sanctuaries to anon;

revoke select on table public.users from anon;
grant select (id, username, full_name, avatar_url, role) on table public.users to anon;

drop policy if exists "Invitados leen destinos activos" on public.destinations;
create policy "Invitados leen destinos activos"
on public.destinations for select to anon
using (status = 'Activo');

drop policy if exists "Invitados leen fotos de destinos" on public.destination_photos;
create policy "Invitados leen fotos de destinos"
on public.destination_photos for select to anon
using (true);

drop policy if exists "Invitados leen sugerencias publicadas" on public.destination_suggestions;
create policy "Invitados leen sugerencias publicadas"
on public.destination_suggestions for select to anon
using (status = 'published');

drop policy if exists "Invitados leen santuarios verificados" on public.fauna_sanctuaries;
create policy "Invitados leen santuarios verificados"
on public.fauna_sanctuaries for select to anon
using (verified);

drop policy if exists "Invitados leen perfiles públicos mínimos" on public.users;
create policy "Invitados leen perfiles públicos mínimos"
on public.users for select to anon
using (true);

notify pgrst, 'reload schema';
