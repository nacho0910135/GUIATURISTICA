create or replace function public.get_traveler_replies(p_post_ids uuid[], p_per_post_limit integer default 20)
returns table (id uuid, post_id uuid, parent_reply_id uuid, user_id uuid, body text, created_at timestamptz, "user" jsonb)
language sql stable security invoker set search_path = '' as $$
  select r.id, r.post_id, r.parent_reply_id, r.user_id, r.body, r.created_at,
    jsonb_build_object('id', u.id, 'username', u.username, 'full_name', u.full_name, 'avatar_url', u.avatar_url, 'role', u.role)
  from unnest(p_post_ids) requested(post_id)
  cross join lateral (
    select recent.* from (
      select reply.* from public.traveler_replies reply
      where reply.post_id = requested.post_id
      order by reply.created_at desc, reply.id desc
      limit least(greatest(coalesce(p_per_post_limit, 20), 1), 50)
    ) recent
    order by recent.created_at, recent.id
  ) r
  join public.users u on u.id = r.user_id
  order by r.post_id, r.created_at, r.id;
$$;
revoke all on function public.get_traveler_replies(uuid[], integer) from public;
grant execute on function public.get_traveler_replies(uuid[], integer) to anon, authenticated;
