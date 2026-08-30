alter table public.subscriptions rename column price_usd to price_amount;

alter table public.subscriptions
  add column price_currency text not null default 'USD' check (price_currency in ('CRC', 'USD')),
  add column offer_id text;

update public.subscriptions
set offer_id = case plan
  when 'no_ads' then 'legacy_no_ads'
  when 'business' then 'legacy_business'
  when 'sponsored' then 'legacy_sponsored'
end;

alter table public.subscriptions
  alter column offer_id set not null,
  add constraint subscriptions_offer_matches_plan_check check (
    (plan = 'no_ads' and offer_id in ('travel_pass_national_monthly', 'travel_pass_national_annual', 'travel_pass_foreign_30d', 'legacy_no_ads'))
    or (plan = 'business' and offer_id in ('business_pro', 'legacy_business'))
    or (plan = 'sponsored' and offer_id in ('business_growth', 'legacy_sponsored'))
  );
