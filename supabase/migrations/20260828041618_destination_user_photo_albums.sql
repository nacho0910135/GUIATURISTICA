create table if not exists public.destination_user_photos (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.destination_user_photos enable row level security;
create index if not exists destination_user_photos_destination_id_idx on public.destination_user_photos(destination_id);
grant select, insert, delete on public.destination_user_photos to anon, authenticated;

drop policy if exists "Fotos de sitios visibles para todos" on public.destination_user_photos;
create policy "Fotos de sitios visibles para todos" on public.destination_user_photos for select to anon, authenticated using (true);

drop policy if exists "Invitados suben fotos de sitios" on public.destination_user_photos;
create policy "Invitados suben fotos de sitios" on public.destination_user_photos for insert to anon
with check (user_id = '00000000-0000-4000-8000-000000000001'::uuid);

drop policy if exists "Usuarios suben fotos de sitios" on public.destination_user_photos;
create policy "Usuarios suben fotos de sitios" on public.destination_user_photos for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Invitados eliminan sus fotos de sitios" on public.destination_user_photos;
create policy "Invitados eliminan sus fotos de sitios" on public.destination_user_photos for delete to anon
using (user_id = '00000000-0000-4000-8000-000000000001'::uuid);

drop policy if exists "Usuarios eliminan sus fotos de sitios" on public.destination_user_photos;
create policy "Usuarios eliminan sus fotos de sitios" on public.destination_user_photos for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('destination-user-photos', 'destination-user-photos', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Lectura pública de fotos de sitios" on storage.objects;
create policy "Lectura pública de fotos de sitios" on storage.objects for select to public
using (bucket_id = 'destination-user-photos');

drop policy if exists "Invitados suben fotos de sitios" on storage.objects;
create policy "Invitados suben fotos de sitios" on storage.objects for insert to anon
with check (bucket_id = 'destination-user-photos' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');

drop policy if exists "Usuarios suben fotos de sitios" on storage.objects;
create policy "Usuarios suben fotos de sitios" on storage.objects for insert to authenticated
with check (bucket_id = 'destination-user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Invitados eliminan fotos de sitios" on storage.objects;
create policy "Invitados eliminan fotos de sitios" on storage.objects for delete to anon
using (bucket_id = 'destination-user-photos' and (storage.foldername(name))[1] = '00000000-0000-4000-8000-000000000001');

drop policy if exists "Usuarios eliminan fotos de sitios" on storage.objects;
create policy "Usuarios eliminan fotos de sitios" on storage.objects for delete to authenticated
using (bucket_id = 'destination-user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
