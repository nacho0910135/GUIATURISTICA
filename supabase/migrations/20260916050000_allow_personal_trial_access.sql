-- Personal features are included during the first 15 days; commerce still requires its own plan.
create or replace function private.has_paid_personal_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    or exists (select 1 from auth.users where id = auth.uid() and created_at + interval '15 days' > now())
    or exists (
      select 1 from public.subscriptions
      where user_id = auth.uid()
        and plan = 'no_ads'
        and status in ('active', 'past_due', 'canceled')
        and (current_period_end is null or current_period_end > now())
        and not (provider = 'google_play' and provider_status in ('SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'))
    )
  );
$$;

revoke all on function private.has_paid_personal_access() from public, anon;
grant execute on function private.has_paid_personal_access() to authenticated;

notify pgrst, 'reload schema';
