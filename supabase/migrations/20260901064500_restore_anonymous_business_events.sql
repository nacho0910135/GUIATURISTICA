-- Anonymous impressions and outbound actions are part of the marketplace
-- funnel. Visitors may append validated events, but never read analytics.
grant insert on table public.business_events to anon;

drop policy if exists "Invitados registran métricas anónimas" on public.business_events;
create policy "Invitados registran métricas anónimas"
on public.business_events for insert to anon
with check (
  user_id is null
  and exists (
    select 1 from public.commercial_services service
    where service.id = business_events.service_id
  )
);

notify pgrst, 'reload schema';
