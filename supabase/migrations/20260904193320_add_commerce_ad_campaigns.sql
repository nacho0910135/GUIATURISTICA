create table public.commerce_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.commercial_services(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_type text not null check (campaign_type in ('featured', 'banner')),
  target_url text,
  status text not null default 'active' check (status in ('active', 'expired', 'refunded')),
  amount_usd numeric(6,2) not null,
  provider_session_id text unique,
  provider_subscription_id text unique,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint commerce_ad_campaign_price_check check (
    (campaign_type = 'featured' and amount_usd = 5 and target_url is null)
    or (campaign_type = 'banner' and amount_usd = 15 and length(target_url) <= 500 and target_url ~ '^https?://')
  ),
  constraint commerce_ad_campaign_period_check check (ends_at > starts_at),
  constraint commerce_ad_campaign_provider_check check (num_nonnulls(provider_session_id, provider_subscription_id) = 1)
);

create index commerce_ad_campaigns_active_idx
  on public.commerce_ad_campaigns (campaign_type, ends_at)
  where status = 'active';
create index commerce_ad_campaigns_service_idx on public.commerce_ad_campaigns (service_id, ends_at desc);

alter table public.commerce_ad_campaigns enable row level security;

create policy "Campañas activas son públicas y propietarios leen las propias"
on public.commerce_ad_campaigns for select
to anon, authenticated
using (
  (status = 'active' and starts_at <= now() and ends_at > now() and exists (
    select 1 from public.commercial_services service
    where service.id = commerce_ad_campaigns.service_id and service.moderation_status = 'approved'
  ))
  or (select auth.uid()) = user_id
);

revoke all on table public.commerce_ad_campaigns from public, anon, authenticated;
grant select (id, service_id, campaign_type, target_url, status, starts_at, ends_at, created_at)
  on public.commerce_ad_campaigns to anon, authenticated;

notify pgrst, 'reload schema';
