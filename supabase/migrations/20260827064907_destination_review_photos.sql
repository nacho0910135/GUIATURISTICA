insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Lectura pública de fotos de reseñas" on storage.objects;
create policy "Lectura pública de fotos de reseñas"
on storage.objects for select to public
using (bucket_id = 'review-photos');

drop policy if exists "Usuarios suben fotos de reseñas propias" on storage.objects;
create policy "Usuarios suben fotos de reseñas propias"
on storage.objects for insert to authenticated
with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Usuarios eliminan fotos de reseñas propias" on storage.objects;
create policy "Usuarios eliminan fotos de reseñas propias"
on storage.objects for delete to authenticated
using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
