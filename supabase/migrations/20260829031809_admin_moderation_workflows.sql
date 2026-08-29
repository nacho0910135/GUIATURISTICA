-- Keep moderation queues actionable and notify every administrator as soon as a
-- user submits a suggestion for review.
create or replace function public.notify_admins_of_approval()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, target_id)
  select admin.id,
         case when tg_table_name in ('commercial_service_claims', 'creator_suggestions') then new.user_id else new.reporter_id end,
         'admin_approval',
         new.id
  from public.users admin
  where admin.role = 'admin';
  return new;
end;
$$;

revoke all on function public.notify_admins_of_approval() from public, anon, authenticated;

drop trigger if exists notify_admins_of_creator_suggestion on public.creator_suggestions;
create trigger notify_admins_of_creator_suggestion
after insert on public.creator_suggestions
for each row when (new.status = 'new')
execute function public.notify_admins_of_approval();

create index if not exists creator_suggestions_status_created_idx
  on public.creator_suggestions (status, created_at desc);
