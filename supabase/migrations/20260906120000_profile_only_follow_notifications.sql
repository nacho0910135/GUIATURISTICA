-- Follow activity remains available in the Profile notification center, but it
-- no longer produces an Expo push. The global header also excludes this type.
create or replace function public.notify_follow_in_profile_only() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(recipient_id, actor_id, type, target_id)
  values(new.followed_id, new.follower_id, 'follow', new.follower_id);
  return new;
end $$;

revoke all on function public.notify_follow_in_profile_only() from public, anon, authenticated;

drop trigger if exists traveler_follow_notification on public.user_follows;
create trigger traveler_follow_notification
after insert on public.user_follows
for each row execute function public.notify_follow_in_profile_only();
