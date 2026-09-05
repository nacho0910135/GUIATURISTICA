-- Public profile pages expose only profile presentation fields and follower
-- counts. All follow, block, and direct-message mutations remain authenticated.
grant select (bio) on table public.users to anon;
grant select on table public.user_follows to anon;

drop policy if exists "Invitados leen relaciones públicas de viajeros" on public.user_follows;
create policy "Invitados leen relaciones públicas de viajeros"
on public.user_follows for select to anon
using (true);

notify pgrst, 'reload schema';
