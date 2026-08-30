alter table public.fauna_sanctuaries
  add column if not exists cover_image_url text;

grant update (cover_image_url) on public.fauna_sanctuaries to authenticated;

drop policy if exists "Administradores actualizan portadas de santuarios" on public.fauna_sanctuaries;
create policy "Administradores actualizan portadas de santuarios"
on public.fauna_sanctuaries for update to authenticated
using (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin'));
