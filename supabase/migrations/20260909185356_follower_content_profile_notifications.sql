-- Followers learn about newly public content only in Profile notifications.
-- Forum posts are already covered by traveler_post_notification/new_post.
insert into public.app_options(kind,id,label_es,label_en,icon,sort_order,active)
values
  ('notification_type','new_destination','agregó un nuevo sitio','added a new place','map-marker-plus-outline',71,true),
  ('notification_type','new_business','agregó un nuevo comercio o servicio','added a new business or service','store-plus-outline',72,true)
on conflict(kind,id) do update set
  label_es=excluded.label_es,
  label_en=excluded.label_en,
  icon=excluded.icon,
  sort_order=excluded.sort_order,
  active=true;

create or replace function private.notify_followers_of_published_content()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  actor uuid;
  notification_type text;
begin
  if tg_table_name='destination_suggestions' then
    actor:=new.user_id;
    notification_type:='new_destination';
  elsif tg_table_name='commercial_services' then
    actor:=new.owner_id;
    notification_type:='new_business';
  else
    return new;
  end if;

  if actor is null then return new; end if;

  insert into public.notifications(recipient_id,actor_id,type,target_id)
  select follow.follower_id,actor,notification_type,new.id
  from public.user_follows follow
  where follow.followed_id=actor and follow.follower_id<>actor;
  return new;
end $$;

revoke all on function private.notify_followers_of_published_content() from public,anon,authenticated,service_role;

drop trigger if exists destination_published_follower_notification on public.destination_suggestions;
create trigger destination_published_follower_notification
after update of status on public.destination_suggestions
for each row
when (old.status is distinct from new.status and new.status='published')
execute function private.notify_followers_of_published_content();

drop trigger if exists business_approved_follower_notification on public.commercial_services;
create trigger business_approved_follower_notification
after update of moderation_status on public.commercial_services
for each row
when (old.moderation_status is distinct from new.moderation_status and new.moderation_status='approved')
execute function private.notify_followers_of_published_content();

notify pgrst,'reload schema';
