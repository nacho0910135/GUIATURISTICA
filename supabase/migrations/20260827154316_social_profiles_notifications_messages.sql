alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like','review','follow','system_alert','claim_verified','comment','new_post','message'));

create table public.traveler_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_status boolean not null default false,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index traveler_messages_recipient_idx on public.traveler_messages(recipient_id, created_at desc);
alter table public.traveler_messages enable row level security;
grant select, insert, update on public.traveler_messages to anon, authenticated;
create policy "Invitado consulta sus mensajes" on public.traveler_messages for select to anon
using (sender_id = '00000000-0000-4000-8000-000000000001' or recipient_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitado envía mensajes" on public.traveler_messages for insert to anon
with check (sender_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitado marca mensajes recibidos" on public.traveler_messages for update to anon
using (recipient_id = '00000000-0000-4000-8000-000000000001')
with check (recipient_id = '00000000-0000-4000-8000-000000000001');
create policy "Usuarios consultan sus mensajes" on public.traveler_messages for select to authenticated
using ((select auth.uid()) in (sender_id, recipient_id));
create policy "Usuarios envían mensajes" on public.traveler_messages for insert to authenticated
with check ((select auth.uid()) = sender_id);
create policy "Usuarios marcan mensajes recibidos" on public.traveler_messages for update to authenticated
using ((select auth.uid()) = recipient_id) with check ((select auth.uid()) = recipient_id);

create policy "Invitado consulta sus notificaciones" on public.notifications for select to anon
using (recipient_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitado marca sus notificaciones" on public.notifications for update to anon
using (recipient_id = '00000000-0000-4000-8000-000000000001')
with check (recipient_id = '00000000-0000-4000-8000-000000000001');
grant select, update on public.notifications to anon;

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
revoke all on function public.notify_traveler_activity() from public, anon, authenticated;
create trigger traveler_reaction_notification after insert or update on public.traveler_reactions for each row execute function public.notify_traveler_activity();
create trigger traveler_follow_notification after insert on public.user_follows for each row execute function public.notify_traveler_activity();
create trigger traveler_reply_notification after insert on public.traveler_replies for each row execute function public.notify_traveler_activity();
create trigger traveler_post_notification after insert on public.traveler_posts for each row execute function public.notify_traveler_activity();
create trigger traveler_message_notification after insert on public.traveler_messages for each row execute function public.notify_traveler_activity();
