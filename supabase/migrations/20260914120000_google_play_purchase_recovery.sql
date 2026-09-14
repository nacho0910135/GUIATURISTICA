alter table public.google_play_purchase_intents
  drop constraint if exists google_play_purchase_intents_product_id_check,
  alter column service_id drop not null,
  add column if not exists external_account_id text;

alter table public.google_play_purchase_intents
  add constraint google_play_purchase_intents_product_id_check check (
    product_id in ('universal_monthly', 'universal_annual', 'business_monthly', 'featured_monthly', 'banner_monthly')
  );

update public.google_play_purchase_intents
set external_account_id = encode(extensions.digest(user_id::text, 'sha256'), 'hex')
where external_account_id is null;

alter table public.google_play_purchase_intents alter column external_account_id set not null;
create index google_play_purchase_intents_external_account_idx
  on public.google_play_purchase_intents(external_account_id, product_id)
  where consumed_at is null;

create or replace function public.save_google_play_purchase_intent(
  p_product_id text,
  p_service_id uuid default null,
  p_target_url text default null,
  p_image_url text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare intent_id uuid;
begin
  if auth.uid() is null or p_product_id not in ('universal_monthly', 'universal_annual', 'business_monthly', 'featured_monthly', 'banner_monthly') then
    raise exception 'invalid_purchase_intent' using errcode = '22023';
  end if;
  if p_product_id in ('featured_monthly', 'banner_monthly') and not exists (
    select 1 from public.commercial_services
    where id = p_service_id and owner_id = auth.uid() and moderation_status = 'approved'
  ) then
    raise exception 'business_not_owned' using errcode = '42501';
  end if;
  if p_product_id in ('universal_monthly', 'universal_annual') and p_service_id is not null then
    raise exception 'invalid_business_selection' using errcode = '22023';
  end if;
  insert into public.google_play_purchase_intents(user_id, external_account_id, product_id, service_id, target_url, image_url)
  values (auth.uid(), encode(extensions.digest(auth.uid()::text, 'sha256'), 'hex'), p_product_id, p_service_id, nullif(btrim(p_target_url), ''), nullif(btrim(p_image_url), ''))
  on conflict (user_id, product_id) do update set
    external_account_id = excluded.external_account_id,
    service_id = excluded.service_id,
    target_url = excluded.target_url,
    image_url = excluded.image_url,
    consumed_at = null,
    created_at = now()
  returning id into intent_id;
  return intent_id;
end;
$$;

update public.subscriptions
set status = 'expired', updated_at = now()
where provider = 'google_play'
  and provider_status in ('SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED');

update public.commerce_ad_campaigns
set status = 'expired'
where provider_subscription_id in (
  select provider_subscription_id from public.subscriptions
  where provider = 'google_play'
    and provider_status in ('SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED')
);

create or replace function public.get_my_app_access()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  with account as (
    select created_at from auth.users where id = auth.uid()
  ), access as (
    select
      account.created_at + interval '15 days' as trial_ends_at,
      exists (
        select 1 from public.subscriptions
        where user_id = auth.uid()
          and plan = 'no_ads'
          and status in ('active', 'past_due', 'canceled')
          and (provider <> 'google_play' or provider is null or provider_status is null
            or provider_status not in ('SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'))
          and (current_period_end is null or current_period_end > now())
      ) as has_personal_plan,
      exists (
        select 1 from public.users where id = auth.uid() and role = 'admin'
      ) as is_admin
    from account
  )
  select jsonb_build_object(
    'hasAccess', is_admin or has_personal_plan or trial_ends_at > now(),
    'hasPersonalPlan', has_personal_plan,
    'trialDaysRemaining', greatest(0, ceil(extract(epoch from (trial_ends_at - now())) / 86400)::integer),
    'trialEndsAt', trial_ends_at,
    'showTrialWarning', not has_personal_plan and trial_ends_at > now() and trial_ends_at <= now() + interval '5 days'
  )
  from access;
$$;

notify pgrst, 'reload schema';
