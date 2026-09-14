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
  with mine as (
    select m.*,
      case when m.sender_id = (select auth.uid()) then m.recipient_id else m.sender_id end as other_id
    from public.traveler_messages m
    where (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  ), ranked as (
    select mine.*,
      row_number() over (partition by other_id order by created_at desc, id desc) as position,
      count(*) filter (where recipient_id = (select auth.uid()) and not read_status) over (partition by other_id) as pending
    from mine
  )
  select r.other_id, coalesce(nullif(u.username, ''), nullif(u.full_name, ''), 'Viajero'), u.avatar_url,
    r.pending, r.id, r.sender_id, r.recipient_id, r.body, r.media_path, r.media_type,
    r.media_duration_ms, r.read_status, r.created_at
  from ranked r
  left join public.users u on u.id = r.other_id
  where r.position = 1
    and (p_cursor_created_at is null or (r.created_at, r.id) < (p_cursor_created_at, p_cursor_id))
  order by r.created_at desc, r.id desc
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

notify pgrst, 'reload schema';
