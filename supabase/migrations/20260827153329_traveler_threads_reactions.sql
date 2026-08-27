alter table public.traveler_replies
  add column parent_reply_id uuid references public.traveler_replies(id) on delete cascade;
create index traveler_replies_parent_reply_id_idx on public.traveler_replies(parent_reply_id);

create table public.traveler_reactions (
  post_id uuid not null references public.traveler_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'love', 'laugh', 'angry', 'wow', 'sad')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.traveler_reactions enable row level security;
grant select, insert, update, delete on public.traveler_reactions to anon, authenticated;
create policy "Reacciones viajeras visibles para todos" on public.traveler_reactions for select to anon, authenticated using (true);
create policy "Invitados administran sus reacciones" on public.traveler_reactions for all to anon
using (user_id = '00000000-0000-4000-8000-000000000001')
with check (user_id = '00000000-0000-4000-8000-000000000001');
create policy "Usuarios administran sus reacciones" on public.traveler_reactions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
