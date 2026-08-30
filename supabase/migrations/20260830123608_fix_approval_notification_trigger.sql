alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'like','review','follow','system_alert','claim_verified','comment','new_post','message','photo_featured','admin_approval'
));

create or replace function public.notify_admins_of_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := coalesce(to_jsonb(new) ->> 'user_id', to_jsonb(new) ->> 'reporter_id')::uuid;
begin
  insert into public.notifications (recipient_id, actor_id, type, target_id)
  select admin.id, actor_id, 'admin_approval', new.id
  from public.users admin
  where admin.role = 'admin';
  return new;
end;
$$;

revoke all on function public.notify_admins_of_approval() from public, anon, authenticated, service_role;
