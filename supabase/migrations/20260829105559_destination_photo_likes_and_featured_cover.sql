alter table public.destinations
  add column if not exists featured_community_photo_id uuid references public.destination_user_photos(id) on delete set null;

create table if not exists public.destination_photo_likes (
  photo_id uuid not null references public.destination_user_photos(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create index if not exists destination_photo_likes_photo_id_idx on public.destination_photo_likes(photo_id);

alter table public.destination_photo_likes enable row level security;
grant select, insert, delete on public.destination_photo_likes to authenticated;

create policy "Likes de fotos visibles para todos"
on public.destination_photo_likes for select to anon, authenticated
using (true);

create policy "Usuarios dan like una vez por foto"
on public.destination_photo_likes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Usuarios eliminan sus propios likes de foto"
on public.destination_photo_likes for delete to authenticated
using ((select auth.uid()) = user_id);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like','review','follow','system_alert','claim_verified','comment','new_post','message','photo_featured'));

create or replace function public.refresh_featured_destination_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_photo public.destination_user_photos%rowtype;
  current_featured_id uuid;
  current_likes integer;
  winning_photo public.destination_user_photos%rowtype;
  winning_likes integer;
  actor uuid;
begin
  select * into changed_photo
  from public.destination_user_photos
  where id = coalesce(new.photo_id, old.photo_id);

  if changed_photo.id is null then return coalesce(new, old); end if;
  actor := coalesce(new.user_id, old.user_id);

  select featured_community_photo_id into current_featured_id
  from public.destinations where id = changed_photo.destination_id for update;

  select count(*) into current_likes
  from public.destination_photo_likes
  where photo_id = current_featured_id;

  select photo.* into winning_photo
  from public.destination_user_photos photo
  left join public.destination_photo_likes like_row on like_row.photo_id = photo.id
  where photo.destination_id = changed_photo.destination_id
  group by photo.id
  order by count(like_row.user_id) desc, photo.created_at asc
  limit 1;

  select count(*) into winning_likes
  from public.destination_photo_likes
  where photo_id = winning_photo.id;

  if winning_photo.id is not null
     and (current_featured_id is null or winning_likes > coalesce(current_likes, 0))
     and winning_photo.id is distinct from current_featured_id then
    update public.destinations
    set featured_community_photo_id = winning_photo.id
    where id = changed_photo.destination_id;

    if winning_photo.user_id is distinct from actor then
      insert into public.notifications(recipient_id, actor_id, type, target_id)
      values (winning_photo.user_id, actor, 'photo_featured', winning_photo.id);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_featured_destination_photo() from public, anon, authenticated;

create trigger destination_photo_like_featured_cover
after insert or delete on public.destination_photo_likes
for each row execute function public.refresh_featured_destination_photo();
