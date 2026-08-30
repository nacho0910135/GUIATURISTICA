-- Restore guest reads for the public catalogues after the Zero Trust baseline.
-- Mutations remain unavailable to anon and continue to be controlled by RLS.

grant select on table public.fauna_species_public to anon, authenticated;
grant select on table public.fauna_sanctuaries to anon, authenticated;

-- Deliberate redaction boundary: the base table remains unavailable to anon,
-- preventing clients from bypassing protected/approximate fauna coordinates.
alter view public.fauna_species_public set (security_invoker = false);

grant select on table public.commercial_services to anon, authenticated;
grant select on table public.commerce_regions to anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant select on table public.vw_target_ratings to anon, authenticated;
grant select on table public.vw_ranked_commercial_services to anon, authenticated;

drop policy if exists "Invitados leen directorio comercial" on public.commercial_services;
create policy "Invitados leen directorio comercial"
on public.commercial_services for select to anon
using (true);

drop policy if exists "Invitados leen regiones comerciales activas" on public.commerce_regions;
create policy "Invitados leen regiones comerciales activas"
on public.commerce_regions for select to anon
using (active);

drop policy if exists "Invitados leen reseñas públicas" on public.reviews;
create policy "Invitados leen reseñas públicas"
on public.reviews for select to anon
using (true);

grant select on table public.tourist_bus_routes to anon, authenticated;
grant select on table public.cantonal_bus_routes to anon, authenticated;
grant select on table public.bus_routes to anon, authenticated;

drop policy if exists "Invitados leen rutas turísticas publicadas" on public.tourist_bus_routes;
create policy "Invitados leen rutas turísticas publicadas"
on public.tourist_bus_routes for select to anon
using (is_published);

drop policy if exists "Invitados leen rutas cantonales publicadas" on public.cantonal_bus_routes;
create policy "Invitados leen rutas cantonales publicadas"
on public.cantonal_bus_routes for select to anon
using (is_published);

drop policy if exists "Invitados leen rutas generales" on public.bus_routes;
create policy "Invitados leen rutas generales"
on public.bus_routes for select to anon
using (true);

grant execute on function public.get_destinations_nearby(double precision, double precision, double precision)
to anon, authenticated;

notify pgrst, 'reload schema';
