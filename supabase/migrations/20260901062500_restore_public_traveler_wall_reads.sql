-- The traveler wall is intentionally visible before sign-in. Keep every
-- mutation authenticated while restoring only the three public read models.
grant select on table public.traveler_posts to anon;
grant select on table public.traveler_replies to anon;
grant select on table public.traveler_reactions to anon;

drop policy if exists "Invitados leen publicaciones viajeras" on public.traveler_posts;
create policy "Invitados leen publicaciones viajeras"
on public.traveler_posts for select to anon
using (true);

drop policy if exists "Invitados leen respuestas viajeras" on public.traveler_replies;
create policy "Invitados leen respuestas viajeras"
on public.traveler_replies for select to anon
using (true);

drop policy if exists "Invitados leen reacciones viajeras" on public.traveler_reactions;
create policy "Invitados leen reacciones viajeras"
on public.traveler_reactions for select to anon
using (true);

notify pgrst, 'reload schema';
