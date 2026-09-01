create table public.user_blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy "Usuarios gestionan sus bloqueos" on public.user_blocks for all to authenticated
using (blocker_id=(select auth.uid())) with check (blocker_id=(select auth.uid()));
grant select,insert,delete on public.user_blocks to authenticated;
revoke all on public.user_blocks from anon;
create index user_blocks_blocked_idx on public.user_blocks(blocked_id,blocker_id);

alter table public.information_reports drop constraint if exists information_reports_target_type_check;
insert into public.app_options(kind,id,label_es,label_en,icon,parent_id,allowed_targets,sort_order,active)
values ('report_type','abusive_content','Contenido o conducta abusiva','Abusive content or behavior','account-alert-outline',null,array['traveler','traveler_post'],70,true)
on conflict(kind,id) do update set allowed_targets=excluded.allowed_targets,active=true;

-- Blocking is mutual for visibility and private messaging.
create or replace function private.users_are_blocked(a uuid,b uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;
revoke all on function private.users_are_blocked(uuid,uuid) from public,anon;
grant execute on function private.users_are_blocked(uuid,uuid) to authenticated;

create or replace function private.prevent_blocked_messages()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if private.users_are_blocked(new.sender_id,new.recipient_id) then raise exception 'user_blocked' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.prevent_blocked_messages() from public,anon,authenticated;
drop trigger if exists prevent_blocked_traveler_messages on public.traveler_messages;
create trigger prevent_blocked_traveler_messages before insert on public.traveler_messages for each row execute function private.prevent_blocked_messages();
