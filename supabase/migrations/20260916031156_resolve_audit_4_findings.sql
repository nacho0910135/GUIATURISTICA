alter table public.users
  add column if not exists restricted_until timestamptz;

alter table public.information_reports
  add column if not exists moderation_action text
    check (moderation_action in ('remove_content', 'restrict_user', 'remove_and_restrict')),
  add column if not exists actioned_by uuid references public.users(id) on delete set null,
  add column if not exists actioned_at timestamptz;

create or replace function private.reject_restricted_community_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
begin
  if exists (
    select 1 from public.users
    where id = actor_id and restricted_until > now()
  ) then
    raise exception 'account_restricted' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_restricted_community_write() from public, anon, authenticated;

drop trigger if exists reject_restricted_traveler_post on public.traveler_posts;
create trigger reject_restricted_traveler_post before insert on public.traveler_posts
for each row execute function private.reject_restricted_community_write('user_id');
drop trigger if exists reject_restricted_traveler_reply on public.traveler_replies;
create trigger reject_restricted_traveler_reply before insert on public.traveler_replies
for each row execute function private.reject_restricted_community_write('user_id');
drop trigger if exists reject_restricted_traveler_message on public.traveler_messages;
create trigger reject_restricted_traveler_message before insert on public.traveler_messages
for each row execute function private.reject_restricted_community_write('sender_id');
drop trigger if exists reject_restricted_group_ride on public.group_rides;
create trigger reject_restricted_group_ride before insert on public.group_rides
for each row execute function private.reject_restricted_community_write('organizer_id');
drop trigger if exists reject_restricted_group_ride_comment on public.group_ride_comments;
create trigger reject_restricted_group_ride_comment before insert on public.group_ride_comments
for each row execute function private.reject_restricted_community_write('user_id');

create or replace function public.moderate_information_report(p_report_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  report public.information_reports;
  target_user_id uuid;
begin
  if actor_id is null or not exists (
    select 1 from public.users where id = actor_id and role = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_action not in ('remove_content', 'restrict_user', 'remove_and_restrict') then
    raise exception 'invalid_moderation_action' using errcode = '22023';
  end if;

  select * into report from public.information_reports where id = p_report_id for update;
  if report.id is null or report.target_type not in ('traveler', 'traveler_post') then
    raise exception 'unsupported_report_target' using errcode = '22023';
  end if;
  if report.target_type = 'traveler' then
    target_user_id := report.target_id;
  else
    select user_id into target_user_id from public.traveler_posts where id = report.target_id;
  end if;
  if target_user_id is null then
    raise exception 'reported_target_not_found' using errcode = 'P0002';
  end if;

  if p_action in ('remove_content', 'remove_and_restrict') then
    if report.target_type <> 'traveler_post' then raise exception 'content_action_requires_post' using errcode = '22023'; end if;
    delete from public.traveler_posts where id = report.target_id;
  end if;
  if p_action in ('restrict_user', 'remove_and_restrict') then
    update public.users
    set restricted_until = greatest(coalesce(restricted_until, now()), now() + interval '7 days')
    where id = target_user_id and role <> 'admin';
    if not found then raise exception 'admin_accounts_cannot_be_restricted' using errcode = '42501'; end if;
  end if;

  update public.information_reports
  set status = 'resolved', reviewed_at = now(), moderation_action = p_action,
      actioned_by = actor_id, actioned_at = now(),
      resolution_note = coalesce(resolution_note, report.report_type)
  where id = p_report_id;
end;
$$;
revoke all on function public.moderate_information_report(uuid, text) from public, anon;
grant execute on function public.moderate_information_report(uuid, text) to authenticated;

notify pgrst, 'reload schema';
