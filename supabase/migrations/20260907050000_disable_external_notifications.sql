-- Keep activity visible inside the app, but stop all external delivery.
update public.user_push_tokens set active = false where active;
update public.admin_push_tokens set active = false where active;

create or replace function public.notify_traveler_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  if tg_table_name = 'traveler_reactions' then
    select user_id into recipient from public.traveler_posts where id = new.post_id;
    if recipient <> new.user_id then insert into public.notifications(recipient_id,actor_id,type,target_id) values(recipient,new.user_id,'like',new.post_id); end if;
  elsif tg_table_name = 'user_follows' then
    insert into public.notifications(recipient_id,actor_id,type,target_id) values(new.followed_id,new.follower_id,'follow',new.follower_id);
  elsif tg_table_name = 'traveler_replies' then
    if new.parent_reply_id is not null then select user_id into recipient from public.traveler_replies where id=new.parent_reply_id;
    else select user_id into recipient from public.traveler_posts where id=new.post_id; end if;
    if recipient <> new.user_id then insert into public.notifications(recipient_id,actor_id,type,target_id) values(recipient,new.user_id,'comment',new.post_id); end if;
  elsif tg_table_name = 'traveler_posts' then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    select follower_id,new.user_id,'new_post',new.id from public.user_follows where followed_id=new.user_id and follower_id<>new.user_id;
  elsif tg_table_name = 'traveler_messages' then
    insert into public.notifications(recipient_id,actor_id,type,target_id) values(new.recipient_id,new.sender_id,'message',new.id);
  end if;
  return new;
end $$;
revoke all on function public.notify_traveler_activity() from public,anon,authenticated;

create or replace function private.notify_admins_of_submission()
returns trigger language plpgsql security definer set search_path='' as $$
declare submission_kind text := tg_argv[0]; submitter uuid;
begin
  if submission_kind='destination' then submitter:=new.user_id;
  elsif submission_kind='fauna' then submitter:=new.created_by;
  else submitter:=new.owner_id; end if;
  insert into public.notifications(recipient_id,actor_id,type,target_id)
  select u.id,submitter,'admin_approval',new.id from public.users u where u.role='admin';
  return new;
end $$;
revoke all on function private.notify_admins_of_submission() from public,anon,authenticated;
