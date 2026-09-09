-- Reactions and direct, in-app navigation for traveler comments.
insert into public.app_options(kind,id,label_es,label_en,icon,sort_order,active) values
  ('notification_type','comment_reply','respondió a tu comentario','replied to your comment','message-reply-text-outline',61,true),
  ('notification_type','comment_reaction','reaccionó a tu comentario','reacted to your comment','emoticon-outline',62,true)
on conflict (kind,id) do update set
  label_es=excluded.label_es,label_en=excluded.label_en,icon=excluded.icon,sort_order=excluded.sort_order,active=true;

create table public.traveler_reply_reactions (
  reply_id uuid not null references public.traveler_replies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (reply_id,user_id)
);

create index traveler_reply_reactions_user_id_idx on public.traveler_reply_reactions(user_id);
alter table public.traveler_reply_reactions enable row level security;
grant select on public.traveler_reply_reactions to anon,authenticated;
grant insert,update,delete on public.traveler_reply_reactions to authenticated;

create policy "Reacciones de comentarios visibles para todos"
on public.traveler_reply_reactions for select to anon,authenticated using (true);
create policy "Usuarios crean sus reacciones de comentarios"
on public.traveler_reply_reactions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Usuarios actualizan sus reacciones de comentarios"
on public.traveler_reply_reactions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Usuarios eliminan sus reacciones de comentarios"
on public.traveler_reply_reactions for delete to authenticated using ((select auth.uid())=user_id);

create or replace function public.notify_traveler_reply_reaction() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  select user_id into recipient from public.traveler_replies where id=new.reply_id;
  if recipient is not null and recipient<>new.user_id then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    values(recipient,new.user_id,'comment_reaction',new.reply_id);
  end if;
  return new;
end $$;
revoke all on function public.notify_traveler_reply_reaction() from public,anon,authenticated;
create trigger traveler_reply_reaction_notification
after insert or update of reaction on public.traveler_reply_reactions
for each row execute function public.notify_traveler_reply_reaction();

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
    if new.parent_reply_id is not null then
      select user_id into recipient from public.traveler_replies where id=new.parent_reply_id;
      if recipient <> new.user_id then insert into public.notifications(recipient_id,actor_id,type,target_id) values(recipient,new.user_id,'comment_reply',new.parent_reply_id); end if;
    else
      select user_id into recipient from public.traveler_posts where id=new.post_id;
      if recipient <> new.user_id then insert into public.notifications(recipient_id,actor_id,type,target_id) values(recipient,new.user_id,'comment',new.post_id); end if;
    end if;
  elsif tg_table_name = 'traveler_posts' then
    insert into public.notifications(recipient_id,actor_id,type,target_id)
    select follower_id,new.user_id,'new_post',new.id from public.user_follows where followed_id=new.user_id and follower_id<>new.user_id;
  elsif tg_table_name = 'traveler_messages' then
    insert into public.notifications(recipient_id,actor_id,type,target_id) values(new.recipient_id,new.sender_id,'message',new.id);
  end if;
  return new;
end $$;
revoke all on function public.notify_traveler_activity() from public,anon,authenticated;
