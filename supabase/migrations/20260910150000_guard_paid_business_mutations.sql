create or replace function public.guard_paid_business_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ) then
    return new;
  end if;
  if old.owner_id = auth.uid() and old.subscription_required and not exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and service_id = old.id
      and plan = 'business'
      and status in ('active', 'past_due', 'canceled')
      and (current_period_end is null or current_period_end > now())
  ) then
    raise exception 'active_business_subscription_required' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_paid_business_mutation() from public, anon, authenticated;
drop trigger if exists guard_paid_business_mutation on public.commercial_services;
create trigger guard_paid_business_mutation
before update on public.commercial_services
for each row execute function public.guard_paid_business_mutation();
