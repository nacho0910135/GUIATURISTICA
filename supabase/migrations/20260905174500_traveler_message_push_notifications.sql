-- Push tokens belong to every authenticated traveler, not only administrators.
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expo_push_token text not null unique
    check (expo_push_token ~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$'),
  platform text not null check (platform in ('android', 'ios')),
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists user_push_tokens_user_id_idx
  on public.user_push_tokens (user_id);

alter table public.user_push_tokens enable row level security;

-- Keep profile badges current while the profile screen is open. RLS still
-- limits the rows delivered to the authenticated recipient.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'traveler_messages'
  ) then
    alter publication supabase_realtime add table public.traveler_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

create policy "Usuarios leen sus tokens push"
  on public.user_push_tokens for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_push_tokens from anon, authenticated;
grant select on table public.user_push_tokens to authenticated;

-- A security-definer function lets a device token move safely to the account
-- currently signed in on that device without exposing other users' tokens.
create or replace function public.register_push_token(
  p_expo_push_token text,
  p_platform text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_platform not in ('android', 'ios') then
    raise exception 'invalid_platform' using errcode = '22023';
  end if;
  if p_expo_push_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'invalid_expo_push_token' using errcode = '22023';
  end if;

  delete from public.user_push_tokens where expo_push_token = p_expo_push_token;
  insert into public.user_push_tokens (user_id, expo_push_token, platform, active, last_seen_at)
  values (actor_id, p_expo_push_token, p_platform, true, now());
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Preserve every existing in-app notification and additionally deliver a push
-- when a private message is inserted.
create or replace function public.notify_traveler_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
  sender_name text;
  push_messages jsonb;
begin
  if tg_table_name = 'traveler_reactions' then
    select user_id into recipient from public.traveler_posts where id = new.post_id;
    if recipient <> new.user_id then insert into public.notifications(recipient_id,actor_id,type,target_id) values(recipient,new.user_id,'like',new.post_id); end if;
  elsif tg_table_name = 'user_follows' then
    insert into public.notifications(recipient_id,actor_id,type,target_id) values(new.followed_id,new.follower_id,'follow',new.follower_id);

    select coalesce(nullif(btrim(u.full_name), ''), nullif(btrim(u.username), ''), 'Alguien')
      into sender_name from public.users u where u.id = new.follower_id;

    select jsonb_agg(jsonb_build_object(
      'to', t.expo_push_token,
      'title', 'Nuevo seguidor',
      'body', concat(coalesce(sender_name, 'Alguien'), ' empezó a seguirte'),
      'sound', 'default',
      'channelId', 'social',
      'data', jsonb_build_object('type', 'follow', 'followerId', new.follower_id)
    )) into push_messages
    from public.user_push_tokens t
    where t.user_id = new.followed_id and t.active;

    if push_messages is not null then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := push_messages,
        headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    end if;
  elsif tg_table_name = 'traveler_replies' then
    if new.parent_reply_id is not null then select user_id into recipient from public.traveler_replies where id=new.parent_reply_id;
    else select user_id into recipient from public.traveler_posts where id=new.post_id; end if;
    if recipient <> new.user_id then insert into public.notifications(recipient_id,actor_id,type,target_id) values(recipient,new.user_id,'comment',new.post_id); end if;
  elsif tg_table_name = 'traveler_posts' then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
      select follower_id,new.user_id,'new_post',new.id from public.user_follows where followed_id=new.user_id and follower_id<>new.user_id;
  elsif tg_table_name = 'traveler_messages' then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    values(new.recipient_id,new.sender_id,'message',new.id);

    select coalesce(nullif(btrim(u.full_name), ''), nullif(btrim(u.username), ''), 'Alguien')
      into sender_name from public.users u where u.id = new.sender_id;

    select jsonb_agg(jsonb_build_object(
      'to', t.expo_push_token,
      'title', coalesce(sender_name, 'Nuevo mensaje'),
      'body', left(new.body, 180),
      'sound', 'default',
      'channelId', 'messages',
      'data', jsonb_build_object('type', 'message', 'messageId', new.id, 'senderId', new.sender_id)
    )) into push_messages
    from public.user_push_tokens t
    where t.user_id = new.recipient_id and t.active;

    if push_messages is not null then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := push_messages,
        headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    end if;
  end if;
  return new;
end $$;

revoke all on function public.notify_traveler_activity() from public, anon, authenticated;
