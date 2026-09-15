create or replace function public.storage_upload_within_quota(p_bucket text, p_name text, p_size bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  object_count bigint;
  used_bytes bigint;
begin
  if caller is null or (storage.foldername(p_name))[1] <> caller::text or p_size < 0 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('storage:' || caller::text, 0));
  select count(*), coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)
    into object_count, used_bytes
  from storage.objects
  where owner_id = caller::text
    and bucket_id in ('business-photos','review-photos','traveler-posts','profile-avatars','destination-user-photos','chat-media','destination-suggestion-photos','fauna-photos','campaign-banners');

  return object_count < 1000 and used_bytes + p_size <= 262144000;
end;
$$;
revoke all on function public.storage_upload_within_quota(text, text, bigint) from public, anon;
grant execute on function public.storage_upload_within_quota(text, text, bigint) to authenticated;

create or replace function public.get_private_conversation_summaries(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 30
)
returns table (
  partner_id uuid,
  partner_name text,
  partner_avatar_url text,
  unread_count bigint,
  message_id uuid,
  sender_id uuid,
  recipient_id uuid,
  body text,
  media_path text,
  media_type text,
  media_duration_ms integer,
  read_status boolean,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  with partners as (
    select m.recipient_id as other_id from public.traveler_messages m where m.sender_id = (select auth.uid())
    union
    select m.sender_id from public.traveler_messages m where m.recipient_id = (select auth.uid())
  )
  select partners.other_id, coalesce(nullif(u.username, ''), nullif(u.full_name, ''), 'Viajero'), u.avatar_url,
    unread.pending, latest.id, latest.sender_id, latest.recipient_id, latest.body, latest.media_path, latest.media_type,
    latest.media_duration_ms, latest.read_status, latest.created_at
  from partners
  cross join lateral (
    select m.* from public.traveler_messages m
    where (m.sender_id = (select auth.uid()) and m.recipient_id = partners.other_id)
       or (m.sender_id = partners.other_id and m.recipient_id = (select auth.uid()))
    order by m.created_at desc, m.id desc
    limit 1
  ) latest
  cross join lateral (
    select count(*) as pending from public.traveler_messages m
    where m.sender_id = partners.other_id and m.recipient_id = (select auth.uid()) and not m.read_status
  ) unread
  left join public.users u on u.id = partners.other_id
  where p_cursor_created_at is null or (latest.created_at, latest.id) < (p_cursor_created_at, p_cursor_id)
  order by latest.created_at desc, latest.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;
revoke all on function public.get_private_conversation_summaries(timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_private_conversation_summaries(timestamptz, uuid, integer) to authenticated;

create or replace function public.get_private_messages(
  p_partner_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 50
)
returns setof public.traveler_messages
language sql
security invoker
set search_path = ''
stable
as $$
  select m.*
  from public.traveler_messages m
  where ((m.sender_id = (select auth.uid()) and m.recipient_id = p_partner_id)
      or (m.sender_id = p_partner_id and m.recipient_id = (select auth.uid())))
    and (p_cursor_created_at is null or (m.created_at, m.id) < (p_cursor_created_at, p_cursor_id))
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 50);
$$;
revoke all on function public.get_private_messages(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_private_messages(uuid, timestamptz, uuid, integer) to authenticated;

create index if not exists traveler_messages_sender_recipient_created_idx
on public.traveler_messages (sender_id, recipient_id, created_at desc, id desc);
create index if not exists traveler_messages_unread_recipient_sender_idx
on public.traveler_messages (recipient_id, sender_id)
where not read_status;

notify pgrst, 'reload schema';
