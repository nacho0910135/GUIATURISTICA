alter table public.google_play_purchase_intents
  drop constraint if exists google_play_purchase_intents_product_id_check;
alter table public.google_play_purchase_intents
  add constraint google_play_purchase_intents_product_id_check check (
    product_id in ('universal_monthly', 'universal_annual', 'visitor_pass_30d', 'business_monthly', 'featured_monthly', 'banner_monthly')
  );

create or replace function public.save_google_play_purchase_intent(
  p_product_id text,
  p_service_id uuid default null,
  p_target_url text default null,
  p_image_url text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare intent public.google_play_purchase_intents%rowtype;
begin
  if auth.uid() is null or p_product_id not in ('universal_monthly', 'universal_annual', 'visitor_pass_30d', 'business_monthly', 'featured_monthly', 'banner_monthly') then
    raise exception 'invalid_purchase_intent' using errcode = '22023';
  end if;
  if p_product_id in ('featured_monthly', 'banner_monthly') and not exists (
    select 1 from public.commercial_services where id = p_service_id and owner_id = auth.uid() and moderation_status = 'approved'
  ) then raise exception 'business_not_owned' using errcode = '42501'; end if;
  if p_product_id in ('universal_monthly', 'universal_annual', 'visitor_pass_30d') and p_service_id is not null then
    raise exception 'invalid_business_selection' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_product_id, 0));
  select * into intent from public.google_play_purchase_intents
  where user_id = auth.uid() and product_id = p_product_id for update;
  if intent.id is not null and intent.consumed_at is null then
    if intent.service_id is not distinct from p_service_id
      and intent.target_url is not distinct from nullif(btrim(p_target_url), '')
      and intent.image_url is not distinct from nullif(btrim(p_image_url), '') then return intent.id; end if;
    raise exception 'purchase_intent_already_pending' using errcode = '55000';
  end if;

  insert into public.google_play_purchase_intents(user_id, external_account_id, product_id, service_id, target_url, image_url, consumed_at, created_at)
  values (auth.uid(), encode(extensions.digest(auth.uid()::text, 'sha256'), 'hex'), p_product_id, p_service_id, nullif(btrim(p_target_url), ''), nullif(btrim(p_image_url), ''), null, now())
  on conflict (user_id, product_id) do update set external_account_id = excluded.external_account_id, service_id = excluded.service_id,
    target_url = excluded.target_url, image_url = excluded.image_url, consumed_at = null, created_at = now()
  returning id into intent.id;
  return intent.id;
end; $$;

create or replace function public.prevent_google_play_campaign_reassignment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.provider_subscription_id like 'google_play:%'
    and (new.service_id is distinct from old.service_id or new.user_id is distinct from old.user_id) then
    raise exception 'google_play_campaign_reassignment_forbidden' using errcode = '23514';
  end if;
  return new;
end; $$;
drop trigger if exists prevent_google_play_campaign_reassignment on public.commerce_ad_campaigns;
create trigger prevent_google_play_campaign_reassignment before update on public.commerce_ad_campaigns
for each row execute function public.prevent_google_play_campaign_reassignment();

alter table public.commerce_ad_campaigns
  add column if not exists price_amount numeric(12,6),
  add column if not exists price_currency text;
update public.commerce_ad_campaigns set price_amount = amount_usd, price_currency = 'USD', amount_usd = null
where provider_subscription_id like 'google_play:%';
alter table public.commerce_ad_campaigns drop constraint if exists commerce_ad_campaign_price_check;
alter table public.commerce_ad_campaigns add constraint commerce_ad_campaign_price_check check (
  (provider_subscription_id like 'google_play:%' and amount_usd is null and price_amount >= 0 and price_currency ~ '^[A-Z]{3}$')
  or (provider_subscription_id is null or provider_subscription_id not like 'google_play:%') and (
    (campaign_type = 'featured' and amount_usd = 5 and target_url is null)
    or (campaign_type = 'banner' and amount_usd in (15, 50) and length(target_url) <= 500 and target_url ~ '^https?://')
  )
);

drop function if exists public.upsert_google_play_banner_campaign(uuid, uuid, text, text, numeric, text, timestamptz);
create function public.upsert_google_play_banner_campaign(p_service_id uuid, p_user_id uuid, p_target_url text, p_image_url text, p_price_amount numeric, p_price_currency text, p_provider_subscription_id text, p_ends_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('commerce-banner-capacity', 0));
  if not exists (select 1 from public.commerce_ad_campaigns where campaign_type = 'banner' and status = 'active' and starts_at <= now() and ends_at > now() and service_id = p_service_id)
    and (select count(distinct service_id) from public.commerce_ad_campaigns where campaign_type = 'banner' and status = 'active' and starts_at <= now() and ends_at > now()) >= 3 then raise exception 'banner_capacity_reached' using errcode = 'P0001'; end if;
  insert into public.commerce_ad_campaigns(service_id,user_id,campaign_type,target_url,image_url,status,amount_usd,price_amount,price_currency,provider_session_id,provider_subscription_id,ends_at)
  values (p_service_id,p_user_id,'banner',p_target_url,p_image_url,'active',null,p_price_amount,p_price_currency,null,p_provider_subscription_id,p_ends_at)
  on conflict (provider_subscription_id) do update set target_url=excluded.target_url,image_url=excluded.image_url,status=excluded.status,
    amount_usd=null,price_amount=excluded.price_amount,price_currency=excluded.price_currency,provider_session_id=null,ends_at=excluded.ends_at;
end; $$;
revoke all on function public.upsert_google_play_banner_campaign(uuid, uuid, text, text, numeric, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_google_play_banner_campaign(uuid, uuid, text, text, numeric, text, text, timestamptz) to service_role;

notify pgrst, 'reload schema';
