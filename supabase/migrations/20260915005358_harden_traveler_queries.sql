create or replace function public.get_traveler_replies(p_post_ids uuid[], p_per_post_limit integer default 20)
returns table (id uuid, post_id uuid, parent_reply_id uuid, user_id uuid, body text, created_at timestamptz, "user" jsonb)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_post_ids is null or cardinality(p_post_ids) > 50 or array_position(p_post_ids, null) is not null then
    raise exception 'invalid_post_ids' using errcode = '22023';
  end if;

  return query
  with requested as (select distinct requested_id from unnest(p_post_ids) requested(requested_id))
  select r.id, r.post_id, r.parent_reply_id, r.user_id, r.body, r.created_at,
    jsonb_build_object('id', u.id, 'username', u.username, 'full_name', u.full_name, 'avatar_url', u.avatar_url, 'role', u.role)
  from requested
  cross join lateral (
    select recent.* from (
      select reply.* from public.traveler_replies reply
      where reply.post_id = requested.requested_id
      order by reply.created_at desc, reply.id desc
      limit least(greatest(coalesce(p_per_post_limit, 20), 1), 50)
    ) recent
    order by recent.created_at, recent.id
  ) r
  join public.users u on u.id = r.user_id
  order by r.post_id, r.created_at, r.id;
end;
$$;
revoke all on function public.get_traveler_replies(uuid[], integer) from public;
grant execute on function public.get_traveler_replies(uuid[], integer) to anon, authenticated;

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
language sql security invoker set search_path = '' stable as $$
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

create index if not exists traveler_messages_sender_recipient_created_idx
on public.traveler_messages (sender_id, recipient_id, created_at desc, id desc);
create index if not exists traveler_messages_unread_recipient_sender_idx
on public.traveler_messages (recipient_id, sender_id)
where not read_status;

notify pgrst, 'reload schema';
