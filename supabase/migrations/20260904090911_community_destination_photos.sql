alter table public.destination_suggestions
  add column if not exists photos text[];

alter table public.destination_suggestions
  drop constraint if exists destination_suggestions_photos_limit;

alter table public.destination_suggestions
  add constraint destination_suggestions_photos_limit
  check (photos is null or cardinality(photos) between 1 and 10);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('destination-suggestion-photos', 'destination-suggestion-photos', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Fotos de aportes públicas" on storage.objects;
create policy "Fotos de aportes públicas"
on storage.objects for select to public
using (bucket_id = 'destination-suggestion-photos');

drop policy if exists "Usuarios suben fotos de sus aportes" on storage.objects;
create policy "Usuarios suben fotos de sus aportes"
on storage.objects for insert to authenticated
with check (bucket_id = 'destination-suggestion-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Usuarios eliminan fotos de sus aportes" on storage.objects;
create policy "Usuarios eliminan fotos de sus aportes"
on storage.objects for delete to authenticated
using (bucket_id = 'destination-suggestion-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
