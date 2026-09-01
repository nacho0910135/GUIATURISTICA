grant select on table public.destination_user_photos to anon;
grant select on table public.likes to anon;
grant select on table public.destination_photo_likes to anon;

drop policy if exists "Invitados leen fotos de destinos" on public.destination_user_photos;
create policy "Invitados leen fotos de destinos"
on public.destination_user_photos
for select
to anon
using (true);

drop policy if exists "Invitados leen likes públicos" on public.likes;
create policy "Invitados leen likes públicos"
on public.likes
for select
to anon
using (true);

drop policy if exists "Invitados leen likes de fotos" on public.destination_photo_likes;
create policy "Invitados leen likes de fotos"
on public.destination_photo_likes
for select
to anon
using (true);
