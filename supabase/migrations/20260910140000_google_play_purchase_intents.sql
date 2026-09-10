create table public.google_play_purchase_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (product_id in ('featured_monthly', 'banner_monthly')),
  service_id uuid not null references public.commercial_services(id) on delete cascade,
  target_url text,
  image_url text,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.google_play_purchase_intents enable row level security;

create or replace function public.save_google_play_purchase_intent(
  p_product_id text,
  p_service_id uuid,
  p_target_url text default null,
  p_image_url text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare intent_id uuid;
begin
  if auth.uid() is null or p_product_id not in ('featured_monthly', 'banner_monthly') then
    raise exception 'invalid_purchase_intent' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.commercial_services
    where id = p_service_id and owner_id = auth.uid() and moderation_status = 'approved'
  ) then
    raise exception 'business_not_owned' using errcode = '42501';
  end if;
  insert into public.google_play_purchase_intents(user_id, product_id, service_id, target_url, image_url)
  values (auth.uid(), p_product_id, p_service_id, nullif(btrim(p_target_url), ''), nullif(btrim(p_image_url), ''))
  on conflict (user_id, product_id) do update set
    service_id = excluded.service_id,
    target_url = excluded.target_url,
    image_url = excluded.image_url,
    consumed_at = null,
    created_at = now()
  returning id into intent_id;
  return intent_id;
end;
$$;

revoke all on function public.save_google_play_purchase_intent(text, uuid, text, text) from public, anon;
grant execute on function public.save_google_play_purchase_intent(text, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
