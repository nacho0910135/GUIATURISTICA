alter table public.group_rides
  add column status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled')),
  add column cancelled_at timestamptz;

alter table public.group_rides
  add constraint group_rides_cancelled_state
    check ((status = 'scheduled' and cancelled_at is null)
      or (status = 'cancelled' and cancelled_at is not null));

create table public.group_ride_comments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.group_rides(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index group_ride_comments_ride_created_idx
  on public.group_ride_comments (ride_id, created_at);

alter table public.group_ride_comments enable row level security;

create policy "Comentarios de rodadas visibles para todos"
on public.group_ride_comments for select
to anon, authenticated
using (true);

create policy "Usuarios comentan rodadas"
on public.group_ride_comments for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Usuarios eliminan sus comentarios de rodadas"
on public.group_ride_comments for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.group_ride_comments to anon;
grant select, insert, delete on public.group_ride_comments to authenticated;

drop policy if exists "Usuarios confirman su asistencia" on public.group_ride_attendees;
create policy "Usuarios confirman asistencia a rodadas activas"
on public.group_ride_attendees for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.group_rides ride
    where ride.id = ride_id and ride.status = 'scheduled'
  )
);

insert into public.app_options
  (kind,id,label_es,label_en,icon,parent_id,allowed_targets,sort_order)
values
  ('notification_type','ride_comment','comentó tu rodada','commented on your ride','message-reply-text-outline',null,null,65)
on conflict (kind,id) do update set
  label_es=excluded.label_es,
  label_en=excluded.label_en,
  icon=excluded.icon,
  sort_order=excluded.sort_order,
  active=true;

create or replace function public.notify_group_ride_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  select organizer_id into recipient
  from public.group_rides
  where id = new.ride_id;

  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, type, target_id)
    values(recipient, new.user_id, 'ride_comment', new.ride_id);
  end if;
  return new;
end
$$;

revoke all on function public.notify_group_ride_comment() from public, anon, authenticated;

create trigger group_ride_comment_notification
after insert on public.group_ride_comments
for each row execute function public.notify_group_ride_comment();
