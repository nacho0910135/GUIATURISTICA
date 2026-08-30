-- RLS decides which authenticated user may update; grants limit which columns.
revoke all on public.bus_routes from anon, authenticated;
grant select on public.bus_routes to anon, authenticated;
grant update (fare_crc, schedules, last_verified_at) on public.bus_routes to authenticated;
