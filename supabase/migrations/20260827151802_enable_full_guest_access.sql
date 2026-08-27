-- Shared guest identity used while account authentication is disabled.
insert into auth.users (id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
values (
  '00000000-0000-4000-8000-000000000001', 'anon', 'anon', '{}',
  '{"full_name":"Invitado"}', now(), now(), true
)
on conflict (id) do nothing;

insert into public.users (id, username, full_name, role)
values ('00000000-0000-4000-8000-000000000001', 'invitado', 'Invitado', 'user')
on conflict (id) do nothing;

grant select, insert, update, delete on public.likes, public.reviews,
  public.fauna_photos, public.fauna_comments, public.user_fauna_sightings,
  public.user_follows, public.traveler_posts, public.traveler_replies,
  public.destination_suggestions to anon;

create policy "Invitados administran likes" on public.likes for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados publican reseñas" on public.reviews for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados publican fotos de fauna" on public.fauna_photos for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados comentan fauna" on public.fauna_comments for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados registran avistamientos" on public.user_fauna_sightings for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados siguen viajeros" on public.user_follows for all to anon
using (follower_id = '00000000-0000-4000-8000-000000000001')
with check (follower_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados publican hilos" on public.traveler_posts for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados responden hilos" on public.traveler_replies for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Invitados sugieren destinos" on public.destination_suggestions for insert to anon
with check (user_id = '00000000-0000-4000-8000-000000000001' and status = 'published');

create policy "Invitados suben fotos de reseñas" on storage.objects for insert to anon
with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');
create policy "Invitados eliminan fotos de reseñas" on storage.objects for delete to anon
using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');
create policy "Invitados suben fotos de fauna" on storage.objects for insert to anon
with check (bucket_id = 'fauna-photos' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');
create policy "Invitados eliminan fotos de fauna" on storage.objects for delete to anon
using (bucket_id = 'fauna-photos' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');
create policy "Invitados suben imágenes viajeras" on storage.objects for insert to anon
with check (bucket_id = 'traveler-posts' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');
create policy "Invitados eliminan imágenes viajeras" on storage.objects for delete to anon
using (bucket_id = 'traveler-posts' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');

create or replace function public.mark_fauna_seen(p_fauna_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  actor_id uuid := coalesce((select auth.uid()), '00000000-0000-4000-8000-000000000001'::uuid);
  next_count integer;
begin
  insert into public.user_fauna_sightings (user_id, fauna_id, sightings_count, last_seen_at)
  values (actor_id, p_fauna_id, 1, now())
  on conflict (user_id, fauna_id) do update
    set sightings_count = public.user_fauna_sightings.sightings_count + 1,
        last_seen_at = now()
  returning sightings_count into next_count;
  return next_count;
end;
$$;

grant execute on function public.mark_fauna_seen(uuid) to anon;
