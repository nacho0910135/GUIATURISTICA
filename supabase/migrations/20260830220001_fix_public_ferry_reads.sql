-- Replace the pre-existing authenticated-only policy so public ferries can load for guest visitors.
drop policy if exists "Published ferry routes are public" on public.ferry_routes;
create policy "Published ferry routes are public"
on public.ferry_routes for select to anon, authenticated
using (is_published);
