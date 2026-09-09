alter table public.commercial_services
  add column subscription_required boolean not null default false,
  add column subscription_visible_until timestamptz;

alter table public.commercial_service_claims
  add column subscription_id uuid references public.subscriptions(id) on delete restrict;

create unique index commercial_claims_pending_subscription_uidx
  on public.commercial_service_claims(subscription_id)
  where status='pending' and subscription_id is not null;

create or replace function private.refresh_commercial_subscription_visibility(p_service_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare paid_until timestamptz;
begin
  select max(subscription.current_period_end) into paid_until
  from public.subscriptions subscription
  where subscription.service_id=p_service_id
    and subscription.plan='business'
    and subscription.offer_id='business_monthly'
    and subscription.status in ('active','past_due','canceled')
    and subscription.current_period_end > now();
  update public.commercial_services
  set subscription_required=true, subscription_visible_until=paid_until
  where id=p_service_id;
end $$;

revoke all on function private.refresh_commercial_subscription_visibility(uuid) from public,anon,authenticated,service_role;

create or replace function private.sync_commercial_subscription_visibility()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and old.service_id is not null and old.service_id is distinct from new.service_id then
    perform private.refresh_commercial_subscription_visibility(old.service_id);
  end if;
  if new.service_id is not null and new.plan='business' then
    perform private.refresh_commercial_subscription_visibility(new.service_id);
  end if;
  return new;
end $$;

revoke all on function private.sync_commercial_subscription_visibility() from public,anon,authenticated,service_role;
drop trigger if exists sync_commercial_subscription_visibility on public.subscriptions;
create trigger sync_commercial_subscription_visibility
after insert or update of service_id,status,current_period_end on public.subscriptions
for each row execute function private.sync_commercial_subscription_visibility();

create or replace function private.mark_owner_registered_subscription_required()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.source='owner_registered' then new.subscription_required=true; end if;
  return new;
end $$;

revoke all on function private.mark_owner_registered_subscription_required() from public,anon,authenticated,service_role;
drop trigger if exists mark_owner_registered_subscription_required on public.commercial_services;
create trigger mark_owner_registered_subscription_required
before insert on public.commercial_services
for each row execute function private.mark_owner_registered_subscription_required();

update public.commercial_services service
set subscription_visible_until = active.paid_until
from (
  select service_id,max(current_period_end) paid_until
  from public.subscriptions
  where plan='business' and offer_id='business_monthly'
    and status in ('active','past_due','canceled') and current_period_end>now()
    and service_id is not null
  group by service_id
) active
where service.id=active.service_id;

create or replace view public.vw_ranked_commercial_services
with (security_invoker = true) as
select
  service.id, service.owner_id, service.main_category, service.subcategory,
  service.title, service.description, service.price_range, service.location,
  service.phone_whatsapp, service.external_url, service.accepts_sinpe,
  service.accepts_cards, service.pet_friendly, service.is_verified_ict,
  service.cst_stars, service.is_sponsored, service.sponsored_tier,
  service.photos, service.created_at, service.osm_type, service.osm_id,
  service.osm_tags, service.data_source, service.source_license,
  service.source_updated_at, service.imported_at, service.has_parking,
  service.business_verified_at, service.business_verification_evidence_url,
  service.business_updated_at, service.whatsapp, service.menu_url,
  service.opening_hours, service.parking, service.payment_methods,
  service.accessibility, service.languages, service.experience_type,
  service.booking_url, service.certifications, service.cover_image_url,
  service.claim_status, service.category, service.subcategories,
  service.region_id, service.is_claimed, service.source, service.source_record_id,
  coalesce(rating.avg_rating,0::numeric) avg_rating,
  coalesce(rating.total_reviews,0) total_reviews
from public.commercial_services service
left join public.vw_target_ratings rating
  on rating.target_type::text='service' and rating.target_id=service.id
where service.moderation_status='approved'
  and (not service.subscription_required or service.subscription_visible_until > now());

create or replace function private.request_commercial_service_claim(p_service_id uuid,p_message text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor_id uuid := (select auth.uid());
  claim_id uuid;
  entitlement_id uuid;
  actor_is_admin boolean;
begin
  if actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.commercial_services where id=p_service_id and owner_id is null) then raise exception 'service_not_available' using errcode='23514'; end if;
  select exists(select 1 from public.users where id=actor_id and role='admin') into actor_is_admin;
  if not actor_is_admin then
    select subscription.id into entitlement_id
    from public.subscriptions subscription
    where subscription.user_id=actor_id and subscription.plan='business'
      and subscription.offer_id='business_monthly' and subscription.status in ('active','past_due','canceled')
      and subscription.service_id is null and subscription.current_period_end>now()
      and not exists(select 1 from public.commercial_service_claims claim where claim.subscription_id=subscription.id and claim.status='pending')
    order by subscription.created_at for update skip locked limit 1;
    if entitlement_id is null then raise exception 'active_business_subscription_required' using errcode='42501'; end if;
  end if;
  insert into public.commercial_service_claims(service_id,user_id,message,subscription_id)
  values(p_service_id,actor_id,nullif(left(btrim(coalesce(p_message,'')),1000),''),entitlement_id)
  on conflict(service_id,user_id) do update set message=excluded.message,status='pending',reviewed_at=null,subscription_id=excluded.subscription_id
  returning id into claim_id;
  update public.commercial_services set claim_status='pending' where id=p_service_id and owner_id is null;
  return claim_id;
end $$;

revoke all on function private.request_commercial_service_claim(uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.request_commercial_service_claim(uuid,text) to authenticated;

create or replace function private.review_commercial_service_claim(p_claim_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare
  claim public.commercial_service_claims%rowtype;
  claimant_is_admin boolean;
begin
  if not exists(select 1 from public.users where id=(select auth.uid()) and role='admin') then raise exception 'admin_required' using errcode='42501'; end if;
  if p_status not in ('approved','rejected') then raise exception 'invalid_status' using errcode='23514'; end if;
  select * into claim from public.commercial_service_claims where id=p_claim_id for update;
  if claim.id is null then raise exception 'claim_not_found' using errcode='P0002'; end if;
  select exists(select 1 from public.users where id=claim.user_id and role='admin') into claimant_is_admin;
  if p_status='approved' and not claimant_is_admin and not exists(
    select 1 from public.subscriptions where id=claim.subscription_id and user_id=claim.user_id
      and plan='business' and offer_id='business_monthly' and status in ('active','past_due','canceled')
      and service_id is null and current_period_end>now()
  ) then raise exception 'active_business_subscription_required' using errcode='42501'; end if;
  update public.commercial_service_claims set status=p_status,reviewed_at=now() where id=claim.id;
  if p_status='approved' then
    update public.commercial_services set owner_id=claim.user_id,claim_status='claimed',is_claimed=true,subscription_required=true where id=claim.service_id;
    if claim.subscription_id is not null then update public.subscriptions set service_id=claim.service_id,updated_at=now() where id=claim.subscription_id; end if;
    update public.commercial_service_claims set status='rejected',reviewed_at=now() where service_id=claim.service_id and id<>claim.id and status='pending';
  else
    update public.commercial_services service set claim_status=case when service.owner_id is null then 'unclaimed' else 'claimed' end
    where service.id=claim.service_id and not exists(select 1 from public.commercial_service_claims pending where pending.service_id=claim.service_id and pending.status='pending');
  end if;
  insert into public.notifications(recipient_id,type,target_id) values(claim.user_id,'claim_verified',claim.id);
end $$;

revoke all on function private.review_commercial_service_claim(uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.review_commercial_service_claim(uuid,text) to authenticated;

notify pgrst,'reload schema';
