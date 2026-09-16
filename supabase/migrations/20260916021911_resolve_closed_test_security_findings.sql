create table public.destination_ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index destination_ai_requests_user_created_idx on public.destination_ai_requests(user_id, created_at desc);
alter table public.destination_ai_requests enable row level security;

create or replace function public.consume_destination_ai_quota(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if (select count(*) from public.destination_ai_requests where user_id = p_user_id and created_at > now() - interval '1 hour') >= 20 then
    return false;
  end if;
  insert into public.destination_ai_requests(user_id) values (p_user_id);
  return true;
end $$;
revoke all on function public.consume_destination_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_destination_ai_quota(uuid) to service_role;

create or replace function public.unregister_all_push_tokens()
returns void language sql security definer set search_path = '' as $$
  delete from public.user_push_tokens where user_id = (select auth.uid());
$$;
revoke all on function public.unregister_all_push_tokens() from public, anon;
grant execute on function public.unregister_all_push_tokens() to authenticated;

drop trigger if exists traveler_reaction_notification on public.traveler_reactions;
create trigger traveler_reaction_notification after insert on public.traveler_reactions
for each row execute function public.notify_traveler_activity();

create or replace function private.keep_reaction_owner_and_post() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.post_id <> old.post_id then
    raise exception 'reaction_identity_is_immutable' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists keep_reaction_owner_and_post on public.traveler_reactions;
create trigger keep_reaction_owner_and_post before update on public.traveler_reactions
for each row execute function private.keep_reaction_owner_and_post();

create index if not exists notifications_like_dedupe_idx
on public.notifications(actor_id, target_id, created_at desc)
where type = 'like';

create or replace function private.suppress_repeated_like_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type <> 'like' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(concat(new.actor_id, ':', new.target_id), 0));
  if exists (
    select 1 from public.notifications
    where type = 'like' and actor_id = new.actor_id and target_id = new.target_id
      and created_at > now() - interval '1 hour'
  ) then return null; end if;
  return new;
end $$;
revoke all on function private.suppress_repeated_like_notification() from public, anon, authenticated;
drop trigger if exists suppress_repeated_like_notification on public.notifications;
create trigger suppress_repeated_like_notification before insert on public.notifications
for each row execute function private.suppress_repeated_like_notification();

create or replace function private.limit_traveler_message_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 0));
  if (select count(*) from public.traveler_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'message_rate_limit_exceeded' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.limit_traveler_message_rate() from public, anon, authenticated;
drop trigger if exists limit_traveler_message_rate on public.traveler_messages;
create trigger limit_traveler_message_rate before insert on public.traveler_messages
for each row execute function private.limit_traveler_message_rate();

alter table public.commercial_services add constraint commercial_services_https_urls check (
  (external_url is null or external_url ~* '^https://') and
  (booking_url is null or booking_url ~* '^https://') and
  (menu_url is null or menu_url ~* '^https://')
) not valid;

alter table public.commerce_ad_campaigns drop constraint if exists commerce_ad_campaign_price_check;
alter table public.commerce_ad_campaigns add constraint commerce_ad_campaign_price_check check (
  (provider_subscription_id like 'google_play:%' and amount_usd is null and price_amount >= 0 and price_currency ~ '^[A-Z]{3}$'
    and (campaign_type <> 'banner' or length(target_url) <= 500 and target_url ~ '^https://'))
  or (provider_subscription_id is null or provider_subscription_id not like 'google_play:%') and (
    (campaign_type = 'featured' and amount_usd = 5 and target_url is null)
    or (campaign_type = 'banner' and amount_usd in (15, 50) and length(target_url) <= 500 and target_url ~ '^https://')
  )
) not valid;

notify pgrst, 'reload schema';
