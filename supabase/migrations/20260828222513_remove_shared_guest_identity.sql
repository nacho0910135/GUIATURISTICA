-- Anonymous visitors keep public read access, but every social write now needs
-- a real Supabase Auth identity and ownership is enforced with auth.uid().
drop policy if exists "Invitados administran likes" on public.likes;
drop policy if exists "Invitados publican reseñas" on public.reviews;
drop policy if exists "Invitados publican fotos de fauna" on public.fauna_photos;
drop policy if exists "Invitados comentan fauna" on public.fauna_comments;
drop policy if exists "Invitados registran avistamientos" on public.user_fauna_sightings;
drop policy if exists "Invitados siguen viajeros" on public.user_follows;
drop policy if exists "Invitados publican hilos" on public.traveler_posts;
drop policy if exists "Invitados responden hilos" on public.traveler_replies;
drop policy if exists "Invitados sugieren destinos" on public.destination_suggestions;
drop policy if exists "Invitados administran sus reacciones" on public.traveler_reactions;
drop policy if exists "Invitado envía mensajes" on public.traveler_messages;
drop policy if exists "Invitado marca mensajes recibidos" on public.traveler_messages;
drop policy if exists "Invitado consulta sus mensajes" on public.traveler_messages;
drop policy if exists "Invitado marca sus notificaciones" on public.notifications;
drop policy if exists "Invitado consulta sus notificaciones" on public.notifications;
drop policy if exists "Invitado edita su perfil" on public.users;
drop policy if exists "Invitado envía sugerencias" on public.creator_suggestions;
drop policy if exists "Invitados agregan especies para todos" on public.fauna_species;
drop policy if exists "Invitados suben fotos de sitios" on public.destination_user_photos;
drop policy if exists "Invitados eliminan sus fotos de sitios" on public.destination_user_photos;

drop policy if exists "Invitados suben fotos de reseñas" on storage.objects;
drop policy if exists "Invitados eliminan fotos de reseñas" on storage.objects;
drop policy if exists "Invitados suben fotos de fauna" on storage.objects;
drop policy if exists "Invitados eliminan fotos de fauna" on storage.objects;
drop policy if exists "Invitados suben imágenes viajeras" on storage.objects;
drop policy if exists "Invitados eliminan imágenes viajeras" on storage.objects;
drop policy if exists "Invitado administra su avatar" on storage.objects;
drop policy if exists "Invitados suben fotos de sitios" on storage.objects;
drop policy if exists "Invitados eliminan fotos de sitios" on storage.objects;

revoke insert, update, delete on public.likes, public.reviews,
  public.fauna_photos, public.fauna_comments, public.user_fauna_sightings,
  public.user_follows, public.traveler_posts, public.traveler_replies,
  public.destination_suggestions, public.traveler_reactions,
  public.traveler_messages, public.notifications, public.users,
  public.creator_suggestions, public.destination_user_photos from anon;
revoke select on public.traveler_messages, public.notifications from anon;
revoke insert on public.fauna_species from anon;
revoke insert, update, delete on storage.objects from anon;
revoke execute on function public.mark_fauna_seen(uuid) from anon;

create or replace function public.mark_fauna_seen(p_fauna_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  next_count integer;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  insert into public.user_fauna_sightings (user_id, fauna_id, sightings_count, last_seen_at)
  values (actor_id, p_fauna_id, 1, now())
  on conflict (user_id, fauna_id) do update
    set sightings_count = public.user_fauna_sightings.sightings_count + 1,
        last_seen_at = now()
  returning sightings_count into next_count;
  return next_count;
end;
$$;
grant execute on function public.mark_fauna_seen(uuid) to authenticated;

-- Create the public profile atomically for email/password and OAuth accounts.
create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, username, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'user_name', ''), nullif(split_part(new.email, '@', 1), ''), 'viajero') || '-' || left(new.id::text, 6),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), 'Viajero'),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_profile_for_new_auth_user() from public, anon, authenticated;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_auth_user();
