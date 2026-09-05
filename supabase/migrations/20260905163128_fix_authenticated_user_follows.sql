-- The legacy social-interaction trigger dereferences NEW.target_type before
-- checking which table fired it. user_follows has no target_type column, so
-- every follow insert is aborted. traveler_follow_notification is the current
-- owner of follow notifications and remains enabled.
drop trigger if exists trg_notify_on_follow on public.user_follows;

grant select, insert, delete on table public.user_follows to authenticated;
alter table public.user_follows enable row level security;

drop policy if exists "Lectura pública de seguidores" on public.user_follows;
create policy "Lectura pública de seguidores"
on public.user_follows for select to authenticated
using (true);

drop policy if exists "Usuarios siguen perfiles" on public.user_follows;
create policy "Usuarios siguen perfiles"
on public.user_follows for insert to authenticated
with check (
  (select auth.uid()) = follower_id
  and follower_id <> followed_id
);

drop policy if exists "Usuarios dejan de seguir perfiles" on public.user_follows;
create policy "Usuarios dejan de seguir perfiles"
on public.user_follows for delete to authenticated
using ((select auth.uid()) = follower_id);

notify pgrst, 'reload schema';
