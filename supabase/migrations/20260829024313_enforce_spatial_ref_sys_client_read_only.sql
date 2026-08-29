-- PostGIS owns spatial_ref_sys through supabase_admin, so project migrations
-- cannot remove its extension-managed ACL. Enforce client read-only access
-- without enabling RLS or interfering with administrative PostGIS writes.
create or replace function public.prevent_spatial_ref_sys_client_writes()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'spatial_ref_sys is read-only for client roles'
      using errcode = '42501';
  end if;

  return null;
end;
$$;

revoke all on function public.prevent_spatial_ref_sys_client_writes() from public;
grant execute on function public.prevent_spatial_ref_sys_client_writes()
to anon, authenticated, service_role;

drop trigger if exists spatial_ref_sys_client_read_only on public.spatial_ref_sys;
create trigger spatial_ref_sys_client_read_only
before insert or update or delete or truncate
on public.spatial_ref_sys
for each statement
execute function public.prevent_spatial_ref_sys_client_writes();
