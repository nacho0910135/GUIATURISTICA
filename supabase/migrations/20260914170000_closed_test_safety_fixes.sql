revoke insert on table public.business_events from anon, authenticated;
drop policy if exists "Invitados registran métricas anónimas" on public.business_events;
drop policy if exists "Visitas registran métricas anónimas" on public.business_events;

create or replace function public.record_business_event(p_service_id uuid, p_event_type text, p_attribution jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_event_type not in ('impression','whatsapp_click','call','directions','save','coupon_redeem') then raise exception 'invalid_event'; end if;
  if jsonb_typeof(p_attribution) <> 'object' or octet_length(p_attribution::text) > 1024 then raise exception 'invalid_attribution'; end if;
  if not exists (select 1 from public.commercial_services where id = p_service_id) then raise exception 'unknown_service'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  if (select count(*) from public.business_events where user_id = caller and created_at > now() - interval '1 minute') >= 60 then raise exception 'event_rate_limited' using errcode = 'P0001'; end if;
  if (select count(*) from public.business_events where user_id = caller and created_at > now() - interval '1 day') >= 2000 then raise exception 'event_daily_limit' using errcode = 'P0001'; end if;
  delete from public.business_events where user_id = caller and created_at < now() - interval '18 months';
  if exists (select 1 from public.business_events where user_id = caller and service_id = p_service_id and event_type = p_event_type and attribution = p_attribution and created_at > now() - interval '5 seconds') then return; end if;
  insert into public.business_events(service_id, user_id, event_type, attribution) values (p_service_id, caller, p_event_type, p_attribution);
end; $$;
revoke all on function public.record_business_event(uuid, text, jsonb) from public, anon;
grant execute on function public.record_business_event(uuid, text, jsonb) to authenticated;

create or replace function public.upsert_google_play_banner_campaign(p_service_id uuid, p_user_id uuid, p_target_url text, p_image_url text, p_amount_usd numeric, p_provider_subscription_id text, p_ends_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('commerce-banner-capacity', 0));
  if not exists (select 1 from public.commerce_ad_campaigns where campaign_type = 'banner' and status = 'active' and starts_at <= now() and ends_at > now() and service_id = p_service_id)
    and (select count(distinct service_id) from public.commerce_ad_campaigns where campaign_type = 'banner' and status = 'active' and starts_at <= now() and ends_at > now()) >= 3 then raise exception 'banner_capacity_reached' using errcode = 'P0001'; end if;
  insert into public.commerce_ad_campaigns(service_id,user_id,campaign_type,target_url,image_url,status,amount_usd,provider_session_id,provider_subscription_id,ends_at)
  values (p_service_id,p_user_id,'banner',p_target_url,p_image_url,'active',p_amount_usd,null,p_provider_subscription_id,p_ends_at)
  on conflict (provider_subscription_id) do update set service_id=excluded.service_id,user_id=excluded.user_id,target_url=excluded.target_url,image_url=excluded.image_url,status=excluded.status,amount_usd=excluded.amount_usd,provider_session_id=null,ends_at=excluded.ends_at;
end; $$;
revoke all on function public.upsert_google_play_banner_campaign(uuid, uuid, text, text, numeric, text, timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_google_play_banner_campaign(uuid, uuid, text, text, numeric, text, timestamptz) to service_role;

create schema if not exists private;
create or replace function public.storage_upload_within_quota(p_bucket text, p_name text, p_size bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); object_count bigint; used_bytes bigint;
begin
  if caller is null or (storage.foldername(p_name))[1] <> caller::text or p_size < 0 then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('storage:' || caller::text, 0));
  select count(*), coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0) into object_count, used_bytes from storage.objects
  where bucket_id in ('business-photos','review-photos','traveler-posts','profile-avatars','destination-user-photos','chat-media','destination-suggestion-photos','fauna-photos','campaign-banners') and (storage.foldername(name))[1] = caller::text;
  return object_count < 1000 and used_bytes + p_size <= 262144000;
end; $$;
revoke all on function public.storage_upload_within_quota(text, text, bigint) from public, anon;
grant execute on function public.storage_upload_within_quota(text, text, bigint) to authenticated;
drop policy if exists "Cuota agregada de archivos por usuario" on storage.objects;
create policy "Cuota agregada de archivos por usuario" on storage.objects as restrictive for insert to authenticated
with check ((bucket_id not in ('business-photos','review-photos','traveler-posts','profile-avatars','destination-user-photos','chat-media','destination-suggestion-photos','fauna-photos','campaign-banners') or public.storage_upload_within_quota(bucket_id, name, coalesce((metadata ->> 'size')::bigint, 0)))
  and (bucket_id <> 'chat-media' or exists (select 1 from public.traveler_messages where media_path = name and sender_id = auth.uid())));

create or replace function public.discard_failed_traveler_message(p_message_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.traveler_messages m
  where m.id = p_message_id and m.sender_id = auth.uid()
    and m.media_path is not null
    and not exists (select 1 from storage.objects o where o.bucket_id = 'chat-media' and o.name = m.media_path);
$$;
revoke all on function public.discard_failed_traveler_message(uuid) from public, anon;
grant execute on function public.discard_failed_traveler_message(uuid) to authenticated;

delete from public.business_events where created_at < now() - interval '18 months';
