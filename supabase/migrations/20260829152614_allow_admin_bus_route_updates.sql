-- Public route information remains readable; only established administrators can edit it.
revoke update on public.bus_routes from authenticated;
grant update (fare_crc, schedules, last_verified_at) on public.bus_routes to authenticated;

create policy "Administradores actualizan rutas de buses"
on public.bus_routes for update to authenticated
using (exists (
  select 1 from public.users
  where id = (select auth.uid()) and role = 'admin'
))
with check (exists (
  select 1 from public.users
  where id = (select auth.uid()) and role = 'admin'
));
