alter table public.traveler_messages
  add column if not exists media_path text,
  add column if not exists media_type text,
  add column if not exists media_duration_ms integer;

alter table public.traveler_messages drop constraint if exists traveler_messages_media_check;
alter table public.traveler_messages add constraint traveler_messages_media_check check (
  (media_path is null and media_type is null and media_duration_ms is null)
  or (media_path is not null and media_type in ('image', 'audio') and (media_duration_ms is null or media_duration_ms between 0 and 600000))
);

create table if not exists public.traveler_message_reactions (
  message_id uuid not null references public.traveler_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 12),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists traveler_message_reactions_message_idx on public.traveler_message_reactions(message_id);
alter table public.traveler_message_reactions enable row level security;
grant select, insert, delete on public.traveler_message_reactions to authenticated;

create policy "Conversantes ven reacciones de mensajes" on public.traveler_message_reactions for select to authenticated using (exists (select 1 from public.traveler_messages m where m.id = message_id and (select auth.uid()) in (m.sender_id, m.recipient_id)));
create policy "Conversantes reaccionan mensajes" on public.traveler_message_reactions for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.traveler_messages m where m.id = message_id and (select auth.uid()) in (m.sender_id, m.recipient_id)));
create policy "Usuarios retiran sus reacciones de mensajes" on public.traveler_message_reactions for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 10485760, array['image/jpeg','image/png','image/webp','audio/m4a','audio/mp4','audio/x-m4a','audio/aac','audio/mpeg','audio/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Usuario sube sus adjuntos de chat" on storage.objects for insert to authenticated with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Participantes leen adjuntos de chat" on storage.objects for select to authenticated using (bucket_id = 'chat-media' and ((storage.foldername(name))[1] = (select auth.uid())::text or exists (select 1 from public.traveler_messages m where m.media_path = name and (select auth.uid()) in (m.sender_id, m.recipient_id))));
create policy "Usuario borra sus adjuntos de chat" on storage.objects for delete to authenticated using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
