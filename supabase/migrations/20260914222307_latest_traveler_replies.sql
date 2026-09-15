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
