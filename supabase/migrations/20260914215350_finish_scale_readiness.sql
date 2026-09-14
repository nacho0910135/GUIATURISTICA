create index if not exists traveler_posts_topic_created_idx
on public.traveler_posts (topic, created_at desc, id desc);

create index if not exists business_events_service_created_cover_idx
on public.business_events (service_id, created_at desc)
include (event_type, attribution);

create or replace function public.get_traveler_replies(p_post_ids uuid[], p_per_post_limit integer default 20)
returns table (
  id uuid,
  post_id uuid,
  parent_reply_id uuid,
  user_id uuid,
  body text,
  created_at timestamptz,
  "user" jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.post_id, r.parent_reply_id, r.user_id, r.body, r.created_at,
    jsonb_build_object('id', u.id, 'username', u.username, 'full_name', u.full_name, 'avatar_url', u.avatar_url, 'role', u.role)
  from unnest(p_post_ids) requested(post_id)
  cross join lateral (
    select reply.*
    from public.traveler_replies reply
    where reply.post_id = requested.post_id
    order by reply.created_at, reply.id
    limit least(greatest(coalesce(p_per_post_limit, 20), 1), 50)
  ) r
  join public.users u on u.id = r.user_id
  order by r.post_id, r.created_at, r.id;
$$;
revoke all on function public.get_traveler_replies(uuid[], integer) from public;
grant execute on function public.get_traveler_replies(uuid[], integer) to anon, authenticated;

create or replace function public.append_business_photos(p_service_id uuid, p_urls text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare current_photos text[]; current_cover text;
begin
  if coalesce(array_length(p_urls, 1), 0) not between 1 and 12 then raise exception 'invalid_photo_count'; end if;
  select coalesce(photos, '{}'::text[]), cover_image_url into current_photos, current_cover
  from public.commercial_services where id = p_service_id and owner_id = (select auth.uid()) for update;
  if not found then raise exception 'service_not_owned' using errcode = '42501'; end if;
  if cardinality(current_photos) + cardinality(p_urls) > 12 then raise exception 'photo_limit'; end if;
  update public.commercial_services
  set photos = current_photos || p_urls,
      cover_image_url = coalesce(current_cover, p_urls[1]),
      business_updated_at = now()
  where id = p_service_id;
end;
$$;

create or replace function public.set_business_cover_photo(p_service_id uuid, p_url text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.commercial_services
  set cover_image_url = p_url, business_updated_at = now()
  where id = p_service_id and owner_id = (select auth.uid()) and p_url = any(photos);
$$;

create or replace function public.remove_business_photo(p_service_id uuid, p_url text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare current_photos text[]; current_cover text;
begin
  select coalesce(photos, '{}'::text[]), cover_image_url into current_photos, current_cover
  from public.commercial_services where id = p_service_id and owner_id = (select auth.uid()) for update;
  if not found then raise exception 'service_not_owned' using errcode = '42501'; end if;
  current_photos := array_remove(current_photos, p_url);
  update public.commercial_services
  set photos = current_photos,
      cover_image_url = case when current_cover = p_url then current_photos[1] else current_cover end,
      business_updated_at = now()
  where id = p_service_id;
end;
$$;

revoke all on function public.append_business_photos(uuid, text[]) from public, anon;
revoke all on function public.set_business_cover_photo(uuid, text) from public, anon;
revoke all on function public.remove_business_photo(uuid, text) from public, anon;
grant execute on function public.append_business_photos(uuid, text[]) to authenticated;
grant execute on function public.set_business_cover_photo(uuid, text) to authenticated;
grant execute on function public.remove_business_photo(uuid, text) to authenticated;

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
  if exists (select 1 from public.business_events where user_id = caller and service_id = p_service_id and event_type = p_event_type and attribution = p_attribution and created_at > now() - interval '5 seconds') then return; end if;
  insert into public.business_events(service_id, user_id, event_type, attribution) values (p_service_id, caller, p_event_type, p_attribution);
end; $$;
revoke all on function public.record_business_event(uuid, text, jsonb) from public, anon;
grant execute on function public.record_business_event(uuid, text, jsonb) to authenticated;

create or replace function private.cleanup_business_events()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with removed as (delete from public.business_events where created_at < now() - interval '18 months' returning 1)
  select count(*) from removed;
$$;
revoke all on function private.cleanup_business_events() from public, anon, authenticated;
grant execute on function private.cleanup_business_events() to service_role;

create extension if not exists pg_cron;
do $$
declare existing_job bigint;
begin
  for existing_job in select jobid from cron.job where jobname = 'cleanup-business-events' loop
    perform cron.unschedule(existing_job);
  end loop;
  perform cron.schedule('cleanup-business-events', '17 3 * * *', 'select private.cleanup_business_events()');
end;
$$;

notify pgrst, 'reload schema';
