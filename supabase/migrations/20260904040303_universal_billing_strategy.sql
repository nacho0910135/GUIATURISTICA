alter table public.subscriptions
  drop constraint if exists subscriptions_offer_matches_plan_check,
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('no_ads', 'business'));

alter table public.subscriptions
  add constraint subscriptions_offer_matches_plan_check check (
    (plan = 'no_ads' and offer_id in ('universal_monthly', 'universal_annual', 'visitor_pass_30d'))
    or (plan = 'business' and offer_id = 'business_monthly')
  );

notify pgrst, 'reload schema';
