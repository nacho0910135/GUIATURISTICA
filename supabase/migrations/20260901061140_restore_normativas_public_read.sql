grant select on table public.normativas_destinos to anon;

drop policy if exists "Invitados leen normativas SINAC" on public.normativas_destinos;
create policy "Invitados leen normativas SINAC"
on public.normativas_destinos
for select
to anon
using (true);
