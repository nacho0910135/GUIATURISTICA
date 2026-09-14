create or replace function private.refresh_owner_commercial_visibility(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.commercial_services
  set subscription_visible_until = (
    select max(subscription.current_period_end)
    from public.subscriptions subscription
    where subscription.user_id = p_user_id
      and subscription.plan = 'business'
      and subscription.offer_id = 'business_monthly'
      and subscription.status in ('active', 'past_due', 'canceled')
      and subscription.current_period_end > now()
  )
  where owner_id = p_user_id and subscription_required;
$$;

revoke all on function private.refresh_owner_commercial_visibility(uuid) from public, anon, authenticated, service_role;

create or replace function private.sync_owner_commercial_visibility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform private.refresh_owner_commercial_visibility(old.user_id);
  end if;
  if new.plan = 'business' then
    perform private.refresh_owner_commercial_visibility(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function private.sync_owner_commercial_visibility() from public, anon, authenticated, service_role;
drop trigger if exists sync_owner_commercial_visibility on public.subscriptions;
create trigger sync_owner_commercial_visibility
after insert or update of user_id, status, current_period_end on public.subscriptions
for each row execute function private.sync_owner_commercial_visibility();

update public.commercial_services service
set subscription_visible_until = active.paid_until
from (
  select user_id, max(current_period_end) as paid_until
  from public.subscriptions
  where plan='business' and offer_id='business_monthly'
    and status in ('active','past_due','canceled') and current_period_end>now()
  group by user_id
) active
where service.owner_id=active.user_id and service.subscription_required;

create or replace function public.guard_paid_business_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or exists (select 1 from public.users where id = auth.uid() and role = 'admin') then return new; end if;
  if old.owner_id = auth.uid() and old.subscription_required and not exists (
    select 1 from public.subscriptions
    where user_id = auth.uid() and plan = 'business' and offer_id = 'business_monthly'
      and status in ('active', 'past_due', 'canceled') and current_period_end > now()
  ) then raise exception 'active_business_subscription_required' using errcode = '42501'; end if;
  return new;
end;
$$;

create or replace function private.register_commercial_service_v2(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  new_service_id uuid;
  category_id text := nullif(btrim(p_payload->>'category'),'');
  subcategory_ids text[] := array(select jsonb_array_elements_text(coalesce(p_payload->'subcategories','[]'::jsonb)));
  latitude double precision := (p_payload->>'latitude')::double precision;
  longitude double precision := (p_payload->>'longitude')::double precision;
  actor_is_admin boolean;
  paid_until timestamptz;
begin
  if actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select exists(select 1 from public.users where id=actor_id and role='admin') into actor_is_admin;
  if not actor_is_admin then
    select max(current_period_end) into paid_until from public.subscriptions
    where user_id=actor_id and plan='business' and offer_id='business_monthly'
      and status in ('active','past_due','canceled') and current_period_end>now();
    if paid_until is null then raise exception 'active_business_subscription_required' using errcode='42501'; end if;
    if category_id in ('food','nightlife') then perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text || ':' || category_id, 0)); end if;
    if category_id in ('food','nightlife') and (select count(*) from public.commercial_services
      where owner_id=actor_id and source='owner_registered' and category=category_id and moderation_status <> 'rejected') >= 2
    then raise exception 'commercial_category_site_limit_reached' using errcode='23514'; end if;
  else
    paid_until := 'infinity'::timestamptz;
  end if;
  if nullif(btrim(p_payload->>'title'),'') is null then raise exception 'title_required' using errcode='23514'; end if;
  if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception 'invalid_coordinates' using errcode='23514'; end if;

  insert into public.commercial_services(
    owner_id,category,subcategories,main_category,subcategory,title,description,price_range,location,
    phone_whatsapp,whatsapp,external_url,booking_url,menu_url,opening_hours,parking,has_parking,
    payment_methods,accessibility,languages,experience_type,certifications,photos,cover_image_url,
    claim_status,source,is_claimed,business_updated_at,moderation_status,subscription_required,subscription_visible_until
  ) values (
    actor_id,category_id,subcategory_ids,category_id,coalesce(nullif(array_to_string(subcategory_ids,', '),''),category_id),
    left(btrim(p_payload->>'title'),160),nullif(left(btrim(coalesce(p_payload->>'description','')),2000),''),
    nullif(left(btrim(coalesce(p_payload->>'priceRange','')),40),''),public.st_setsrid(public.st_makepoint(longitude,latitude),4326),
    nullif(left(btrim(coalesce(p_payload->>'phone','')),80),''),nullif(left(btrim(coalesce(p_payload->>'whatsapp','')),80),''),
    nullif(left(btrim(coalesce(p_payload->>'websiteUrl','')),500),''),nullif(left(btrim(coalesce(p_payload->>'bookingUrl','')),500),''),
    nullif(left(btrim(coalesce(p_payload->>'menuUrl','')),500),''),nullif(left(btrim(coalesce(p_payload->>'openingHours','')),160),''),
    nullif(left(btrim(coalesce(p_payload->>'parking','')),500),''),coalesce((p_payload->>'hasParking')::boolean,false),
    array(select jsonb_array_elements_text(coalesce(p_payload->'paymentMethods','[]'::jsonb))),nullif(left(btrim(coalesce(p_payload->>'accessibility','')),500),''),
    array(select jsonb_array_elements_text(coalesce(p_payload->'languages','[]'::jsonb))),nullif(left(btrim(coalesce(p_payload->>'experienceType','')),160),''),
    array(select jsonb_array_elements_text(coalesce(p_payload->'certifications','[]'::jsonb))),array(select jsonb_array_elements_text(coalesce(p_payload->'photos','[]'::jsonb))),
    nullif(btrim(coalesce(p_payload->>'coverImageUrl','')),''),'claimed','owner_registered',true,now(),'pending',true,paid_until
  ) returning id into new_service_id;
  return new_service_id;
end;
$$;

revoke all on function private.register_commercial_service_v2(jsonb) from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
