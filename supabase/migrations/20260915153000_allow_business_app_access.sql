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
        select 1 from public.subscriptions
        where user_id = auth.uid()
          and plan = 'business'
          and status in ('active', 'past_due', 'canceled')
          and (provider <> 'google_play' or provider is null or provider_status is null
            or provider_status not in ('SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'))
          and (current_period_end is null or current_period_end > now())
      ) as has_business_plan,
      exists (
        select 1 from public.users where id = auth.uid() and role = 'admin'
      ) as is_admin
    from account
  )
  select jsonb_build_object(
    'hasAccess', is_admin or has_personal_plan or has_business_plan or trial_ends_at > now(),
    'hasPersonalPlan', has_personal_plan,
    'hasBusinessPlan', has_business_plan,
    'trialDaysRemaining', greatest(0, ceil(extract(epoch from (trial_ends_at - now())) / 86400)::integer),
    'trialEndsAt', trial_ends_at,
    'showTrialWarning', not has_personal_plan and not has_business_plan and trial_ends_at > now() and trial_ends_at <= now() + interval '5 days'
  )
  from access;
$$;

revoke all on function public.get_my_app_access() from public, anon;
grant execute on function public.get_my_app_access() to authenticated;
notify pgrst, 'reload schema';
