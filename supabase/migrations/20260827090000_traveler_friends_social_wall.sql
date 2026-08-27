create table public.traveler_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  constraint traveler_posts_content check (char_length(trim(body)) > 0 or image_url is not null),
  constraint traveler_posts_body_length check (char_length(body) <= 2000)
);

create table public.traveler_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.traveler_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index traveler_posts_created_at_idx on public.traveler_posts(created_at desc);
create index traveler_replies_post_created_idx on public.traveler_replies(post_id, created_at);
create index traveler_replies_user_id_idx on public.traveler_replies(user_id);

alter table public.traveler_posts enable row level security;
alter table public.traveler_replies enable row level security;
grant select on public.traveler_posts, public.traveler_replies to anon;
grant select, insert, update, delete on public.traveler_posts, public.traveler_replies to authenticated;

create policy "Lectura pública de publicaciones viajeras" on public.traveler_posts for select to anon, authenticated using (true);
create policy "Usuarios crean sus publicaciones viajeras" on public.traveler_posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Usuarios editan sus publicaciones viajeras" on public.traveler_posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Usuarios eliminan sus publicaciones viajeras" on public.traveler_posts for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Lectura pública de respuestas viajeras" on public.traveler_replies for select to anon, authenticated using (true);
create policy "Usuarios crean sus respuestas viajeras" on public.traveler_replies for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Usuarios editan sus respuestas viajeras" on public.traveler_replies for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Usuarios eliminan sus respuestas viajeras" on public.traveler_replies for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('traveler-posts', 'traveler-posts', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Lectura pública de imágenes viajeras" on storage.objects for select to anon, authenticated using (bucket_id = 'traveler-posts');
create policy "Usuarios suben imágenes viajeras" on storage.objects for insert to authenticated with check (bucket_id = 'traveler-posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Usuarios eliminan sus imágenes viajeras" on storage.objects for delete to authenticated using (bucket_id = 'traveler-posts' and owner_id = (select auth.uid()::text));
