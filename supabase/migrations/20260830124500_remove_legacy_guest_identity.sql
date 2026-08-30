-- Defense in depth: no policy may authorize the retired shared guest identity.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        policyname ilike '%invitad%'
        or coalesce(qual, '') like '%00000000-0000-4000-8000-000000000001%'
        or coalesce(with_check, '') like '%00000000-0000-4000-8000-000000000001%'
      )
  loop
    execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end
$$;

delete from public.users where id = '00000000-0000-4000-8000-000000000001';
delete from auth.users where id = '00000000-0000-4000-8000-000000000001';

notify pgrst, 'reload schema';
