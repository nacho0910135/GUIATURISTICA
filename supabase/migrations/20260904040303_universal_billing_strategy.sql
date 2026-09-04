alter table public.subscriptions
  drop constraint if exists subscriptions_offer_matches_plan_check;

alter table public.subscriptions
  add constraint subscriptions_offer_matches_plan_check check (
    (plan = 'no_ads' and offer_id in (
      'universal_monthly', 'universal_annual', 'visitor_pass_30d',
      'travel_pass_national_monthly', 'travel_pass_national_annual',
      'travel_pass_foreign_30d', 'legacy_no_ads'
    ))
    or (plan = 'business' and offer_id in ('business_monthly', 'business_pro', 'legacy_business'))
    or (plan = 'sponsored' and offer_id in ('business_growth', 'legacy_sponsored'))
  );

notify pgrst, 'reload schema';
