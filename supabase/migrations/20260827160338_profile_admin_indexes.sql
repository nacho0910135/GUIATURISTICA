create index creator_suggestions_user_id_idx on public.creator_suggestions(user_id);
create index destination_photos_destination_id_idx on public.destination_photos(destination_id);

drop policy if exists "Admin elimina publicaciones viajeras" on public.traveler_posts;
drop policy if exists "Usuarios eliminan sus publicaciones viajeras" on public.traveler_posts;
create policy "Usuarios o admin eliminan publicaciones viajeras" on public.traveler_posts for delete to authenticated
using (
  (select auth.uid()) = user_id
  or exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin')
);
