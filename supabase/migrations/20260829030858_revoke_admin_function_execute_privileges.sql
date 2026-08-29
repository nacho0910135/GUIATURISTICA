revoke execute on function public.notify_admins_of_approval() from public, anon, authenticated, service_role;
revoke execute on function public.review_commercial_service_claim(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.review_commercial_service_claim(uuid, text) to authenticated;
