-- Internal trigger helper: it is never an API endpoint.
revoke all on function public.sync_commercial_service_region_and_claim() from public, anon, authenticated;
