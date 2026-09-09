alter table public.subscriptions
  drop constraint if exists subscriptions_price_currency_check;

alter table public.subscriptions
  add constraint subscriptions_price_currency_check
  check (price_currency ~ '^[A-Z]{3}$');

create unique index if not exists subscriptions_google_play_user_offer_service_idx
on public.subscriptions (user_id, offer_id, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid))
where provider = 'google_play';

notify pgrst, 'reload schema';
