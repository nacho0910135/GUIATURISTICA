-- Deliver every social activity through the same reliable path. The in-app
-- notification is always inserted first; push delivery is attempted only when
-- the recipient has a registered active device.
create or replace function public.notify_traveler_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
  actor uuid;
  sender_name text;
  push_title text;
  push_body text;
  push_data jsonb;
  push_messages jsonb;
begin
  if tg_table_name = 'traveler_reactions' then
    actor := new.user_id;
    select user_id into recipient from public.traveler_posts where id = new.post_id;
    if recipient <> new.user_id then
      insert into public.notifications(recipient_id,actor_id,type,target_id)
      values(recipient,new.user_id,'like',new.post_id);
      push_title := 'Nueva reacción';
      push_body := 'reaccionó a tu publicación';
      push_data := jsonb_build_object('type', 'like', 'postId', new.post_id);
    end if;
  elsif tg_table_name = 'user_follows' then
    actor := new.follower_id;
    recipient := new.followed_id;
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    values(recipient,new.follower_id,'follow',new.follower_id);
    push_title := 'Nuevo seguidor';
    push_body := 'empezó a seguirte';
    push_data := jsonb_build_object('type', 'follow', 'followerId', new.follower_id);
  elsif tg_table_name = 'traveler_replies' then
    actor := new.user_id;
    if new.parent_reply_id is not null then
      select user_id into recipient from public.traveler_replies where id=new.parent_reply_id;
    else
      select user_id into recipient from public.traveler_posts where id=new.post_id;
    end if;
    if recipient <> new.user_id then
      insert into public.notifications(recipient_id,actor_id,type,target_id)
      values(recipient,new.user_id,'comment',new.post_id);
      push_title := 'Nuevo comentario';
      push_body := 'comentó en tu publicación';
      push_data := jsonb_build_object('type', 'comment', 'postId', new.post_id);
    end if;
  elsif tg_table_name = 'traveler_posts' then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
      select follower_id,new.user_id,'new_post',new.id
      from public.user_follows
      where followed_id=new.user_id and follower_id<>new.user_id;
  elsif tg_table_name = 'traveler_messages' then
    actor := new.sender_id;
    recipient := new.recipient_id;
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    values(recipient,new.sender_id,'message',new.id);
    push_title := 'Nuevo mensaje';
    push_body := left(new.body, 180);
    push_data := jsonb_build_object('type', 'message', 'messageId', new.id, 'senderId', new.sender_id);
  end if;

  if push_title is not null then
    select coalesce(nullif(btrim(u.full_name), ''), nullif(btrim(u.username), ''), 'Alguien')
      into sender_name
      from public.users u
      where u.id = actor;

    if tg_table_name <> 'traveler_messages' then
      push_body := concat(coalesce(sender_name, 'Alguien'), ' ', push_body);
    else
      push_title := coalesce(sender_name, push_title);
    end if;

    select jsonb_agg(jsonb_build_object(
      'to', t.expo_push_token,
      'title', push_title,
      'body', push_body,
      'sound', 'default',
      'channelId', case when tg_table_name = 'traveler_messages' then 'messages' else 'social' end,
      'data', push_data
    )) into push_messages
    from public.user_push_tokens t
    where t.user_id = recipient and t.active;

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
