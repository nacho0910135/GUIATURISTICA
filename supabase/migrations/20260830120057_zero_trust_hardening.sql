-- Zero Trust baseline for every relation exposed through the public Data API.
do $$
declare
  relation record;
  policy_row record;
  view_row record;
begin
  for relation in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname <> 'spatial_ref_sys'
  loop
    execute format('alter table %I.%I enable row level security', relation.nspname, relation.relname);
  end loop;

  -- Policies previously granted to PUBLIC or anon become authenticated-only.
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname in ('public', 'storage')
      and (roles @> array['public']::name[] or roles @> array['anon']::name[])
  loop
    execute format('alter policy %I on %I.%I to authenticated', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;

  -- Views must honor the caller and the RLS policies of their base tables.
  for view_row in
    select schemaname, viewname
    from pg_views
    where schemaname = 'public'
      and viewname not in ('geography_columns', 'geometry_columns')
  loop
    execute format('alter view %I.%I set (security_invoker = true)', view_row.schemaname, view_row.viewname);
  end loop;
end
$$;

do $$
declare
  owned_object record;
begin
  for owned_object in
    select n.nspname, c.relname, case when c.relkind = 'S' then 'sequence' else 'table' end as object_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'S')
      and pg_get_userbyid(c.relowner) = current_user
  loop
    execute format('revoke all privileges on %s %I.%I from anon', owned_object.object_type, owned_object.nspname, owned_object.relname);
  end loop;

  for owned_object in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and pg_get_userbyid(p.proowner) = current_user
  loop
    execute format('revoke all privileges on function %I.%I(%s) from public, anon', owned_object.nspname, owned_object.proname, owned_object.arguments);
  end loop;
end
$$;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

-- A message recipient can acknowledge receipt, but cannot rewrite sender content.
revoke update on table public.traveler_messages from authenticated;
grant update (read_status) on table public.traveler_messages to authenticated;

-- The same immutable-column boundary applies to notifications.
revoke update on table public.notifications from authenticated;
grant update (read_status) on table public.notifications to authenticated;

-- PostGIS owns spatial_ref_sys as supabase_admin; project migrations cannot
-- enable RLS on it. Existing migrations enforce read-only access with a trigger.

notify pgrst, 'reload schema';
