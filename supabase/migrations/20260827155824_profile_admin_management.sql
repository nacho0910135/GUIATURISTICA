-- The administrator is identified by the immutable auth UUID, never by a password.
update public.users
set role = 'admin'
where id = (select id from auth.users where lower(email) = 'jose17mp3@gmail.com' limit 1);

alter table public.users add column if not exists contact_email text;

grant update on public.users to anon, authenticated;
drop policy if exists "Invitado edita su perfil" on public.users;
create policy "Invitado edita su perfil" on public.users for update to anon
using (id = '00000000-0000-4000-8000-000000000001')
with check (id = '00000000-0000-4000-8000-000000000001' and role = 'user');

create table public.creator_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null check (char_length(message) between 3 and 2000),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.creator_suggestions enable row level security;
grant select, insert, update on public.creator_suggestions to anon, authenticated;
create policy "Invitado envía sugerencias" on public.creator_suggestions for insert to anon
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Usuarios envían sugerencias" on public.creator_suggestions for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Admin consulta sugerencias" on public.creator_suggestions for select to authenticated
using (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));
create policy "Admin actualiza sugerencias" on public.creator_suggestions for update to authenticated
using (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));

create table public.destination_photos (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  image_url text not null,
  sort_order smallint not null check (sort_order between 0 and 4),
  created_at timestamptz not null default now(),
  unique (destination_id, sort_order)
);
alter table public.destination_photos enable row level security;
grant select on public.destination_photos to anon, authenticated;
grant insert, update, delete on public.destination_photos to authenticated;
create policy "Fotos de destinos públicas" on public.destination_photos for select to anon, authenticated using (true);
create policy "Admin agrega fotos de destinos" on public.destination_photos for insert to authenticated
with check (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));
create policy "Admin actualiza fotos de destinos" on public.destination_photos for update to authenticated
using (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));
create policy "Admin elimina fotos de destinos" on public.destination_photos for delete to authenticated
using (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-avatars', 'profile-avatars', true, 6291456, array['image/jpeg','image/png','image/webp']),
  ('destination-photos', 'destination-photos', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Avatares públicos" on storage.objects for select to public using (bucket_id = 'profile-avatars');
create policy "Invitado administra su avatar" on storage.objects for all to anon
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001')
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');
create policy "Usuarios administran su avatar" on storage.objects for all to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Fotos administradas de destinos públicas" on storage.objects for select to public using (bucket_id = 'destination-photos');
create policy "Admin administra archivos de destinos" on storage.objects for all to authenticated
using (bucket_id = 'destination-photos' and exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'))
with check (bucket_id = 'destination-photos' and exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));

create policy "Admin elimina publicaciones viajeras" on public.traveler_posts for delete to authenticated
using (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));
