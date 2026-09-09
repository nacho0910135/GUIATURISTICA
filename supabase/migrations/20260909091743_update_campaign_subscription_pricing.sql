alter table public.commerce_ad_campaigns
  drop constraint if exists commerce_ad_campaign_price_check;

alter table public.commerce_ad_campaigns
  add constraint commerce_ad_campaign_price_check check (
    (campaign_type = 'featured' and amount_usd = 5 and target_url is null)
    or (campaign_type = 'banner' and amount_usd in (15, 50) and length(target_url) <= 500 and target_url ~ '^https?://')
  );

comment on constraint commerce_ad_campaign_price_check on public.commerce_ad_campaigns is
  'Las campañas nuevas de banner cuestan US$50; US$15 permanece permitido únicamente para respetar campañas antiguas vigentes.';
