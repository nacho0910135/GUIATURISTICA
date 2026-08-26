create index if not exists business_events_user_id_idx
  on public.business_events (user_id);

create index if not exists subscriptions_service_id_idx
  on public.subscriptions (service_id);
