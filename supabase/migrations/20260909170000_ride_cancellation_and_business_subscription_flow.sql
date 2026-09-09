-- Cancelled rides disappear from community lists, but every attendee receives
-- one durable in-app notification that they explicitly dismiss.
insert into public.app_options
  (kind,id,label_es,label_en,icon,parent_id,allowed_targets,sort_order)
values
  ('notification_type','ride_cancelled','canceló una rodada a la que ibas a asistir','cancelled a ride you were attending','calendar-remove-outline',null,null,66)
on conflict (kind,id) do update set
  label_es=excluded.label_es,
  label_en=excluded.label_en,
  icon=excluded.icon,
  sort_order=excluded.sort_order,
  active=true;

create unique index if not exists notifications_ride_cancelled_once_idx
  on public.notifications(recipient_id, target_id)
  where type = 'ride_cancelled';

insert into public.notifications(recipient_id, actor_id, type, target_id)
select attendee.user_id, ride.organizer_id, 'ride_cancelled', ride.id
from public.group_rides ride
join public.group_ride_attendees attendee on attendee.ride_id=ride.id
where ride.status='cancelled' and attendee.user_id <> ride.organizer_id
on conflict (recipient_id, target_id) where type='ride_cancelled' do nothing;

create or replace function private.notify_group_ride_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications(recipient_id, actor_id, type, target_id)
  select attendee.user_id, new.organizer_id, 'ride_cancelled', new.id
  from public.group_ride_attendees attendee
  where attendee.ride_id = new.id
    and attendee.user_id <> new.organizer_id
  on conflict (recipient_id, target_id) where type = 'ride_cancelled' do nothing;
  return new;
end
$$;

revoke all on function private.notify_group_ride_cancelled() from public, anon, authenticated, service_role;

drop trigger if exists group_ride_cancelled_notification on public.group_rides;
create trigger group_ride_cancelled_notification
after update of status on public.group_rides
for each row
when (old.status = 'scheduled' and new.status = 'cancelled')
execute function private.notify_group_ride_cancelled();

-- A paid business entitlement is created before a service exists. Registration
-- locks one available entitlement and binds it to the new service atomically.
create or replace function private.register_commercial_service_v2(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  new_service_id uuid;
  entitlement_id uuid;
  category_id text := nullif(btrim(p_payload->>'category'),'');
  subcategory_ids text[] := array(select jsonb_array_elements_text(coalesce(p_payload->'subcategories','[]'::jsonb)));
  latitude double precision := (p_payload->>'latitude')::double precision;
  longitude double precision := (p_payload->>'longitude')::double precision;
  actor_is_admin boolean;
begin
  if actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select exists(select 1 from public.users where id=actor_id and role='admin') into actor_is_admin;

  if not actor_is_admin then
    select subscription.id into entitlement_id
    from public.subscriptions subscription
    where subscription.user_id=actor_id
      and subscription.plan='business'
      and subscription.offer_id='business_monthly'
      and subscription.status='active'
      and subscription.service_id is null
      and (subscription.current_period_end is null or subscription.current_period_end > now())
    order by subscription.created_at
    for update skip locked
    limit 1;
    if entitlement_id is null then raise exception 'active_business_subscription_required' using errcode='42501'; end if;
  end if;

  if nullif(btrim(p_payload->>'title'),'') is null then raise exception 'title_required' using errcode='23514'; end if;
  if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception 'invalid_coordinates' using errcode='23514'; end if;

  insert into public.commercial_services(
    owner_id,category,subcategories,main_category,subcategory,title,description,price_range,
    location,phone_whatsapp,whatsapp,external_url,booking_url,menu_url,opening_hours,parking,
    has_parking,payment_methods,accessibility,languages,experience_type,certifications,photos,
    cover_image_url,claim_status,source,is_claimed,business_updated_at,moderation_status
  ) values (
    actor_id,category_id,subcategory_ids,category_id,
    coalesce(nullif(array_to_string(subcategory_ids,', '),''),category_id),
    left(btrim(p_payload->>'title'),160),
    nullif(left(btrim(coalesce(p_payload->>'description','')),2000),''),
    nullif(left(btrim(coalesce(p_payload->>'priceRange','')),40),''),
    public.st_setsrid(public.st_makepoint(longitude,latitude),4326),
    nullif(left(btrim(coalesce(p_payload->>'phone','')),80),''),
    nullif(left(btrim(coalesce(p_payload->>'whatsapp','')),80),''),
    nullif(left(btrim(coalesce(p_payload->>'websiteUrl','')),500),''),
    nullif(left(btrim(coalesce(p_payload->>'bookingUrl','')),500),''),
    nullif(left(btrim(coalesce(p_payload->>'menuUrl','')),500),''),
    nullif(left(btrim(coalesce(p_payload->>'openingHours','')),160),''),
    nullif(left(btrim(coalesce(p_payload->>'parking','')),500),''),
    coalesce((p_payload->>'hasParking')::boolean,false),
    array(select jsonb_array_elements_text(coalesce(p_payload->'paymentMethods','[]'::jsonb))),
    nullif(left(btrim(coalesce(p_payload->>'accessibility','')),500),''),
    array(select jsonb_array_elements_text(coalesce(p_payload->'languages','[]'::jsonb))),
    nullif(left(btrim(coalesce(p_payload->>'experienceType','')),160),''),
    array(select jsonb_array_elements_text(coalesce(p_payload->'certifications','[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'photos','[]'::jsonb))),
    nullif(btrim(coalesce(p_payload->>'coverImageUrl','')),''),
    'claimed','owner_registered',true,now(),'pending'
  ) returning id into new_service_id;

  if entitlement_id is not null then
    update public.subscriptions set service_id=new_service_id, updated_at=now() where id=entitlement_id;
  end if;
  return new_service_id;
end
$$;

revoke all on function private.register_commercial_service_v2(jsonb) from public, anon, authenticated, service_role;

create or replace function public.register_commercial_service_v2(p_payload jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.register_commercial_service_v2(p_payload); $$;

revoke all on function public.register_commercial_service_v2(jsonb) from public, anon, authenticated;
grant execute on function public.register_commercial_service_v2(jsonb) to authenticated;

notify pgrst, 'reload schema';
