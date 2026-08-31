-- A ferry ticket link is always a verified official issuer URL; the app only redirects.
alter table public.ferry_routes
  add column if not exists ticket_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ferry_routes_ticket_url_https_check'
      and conrelid = 'public.ferry_routes'::regclass
  ) then
    alter table public.ferry_routes
      add constraint ferry_routes_ticket_url_https_check
      check (ticket_url is null or ticket_url ~* '^https://');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ferry_routes'
      and policyname = 'Published ferry routes are public'
  ) then
    execute 'create policy "Published ferry routes are public" on public.ferry_routes for select to anon, authenticated using (is_published)';
  end if;
end
$$;

alter table public.ferry_routes enable row level security;
grant select on public.ferry_routes to anon, authenticated;

-- Do not overwrite any operator link that was already registered.
update public.ferry_routes
set ticket_url = case source_key
  when 'puntarenas-paquera' then 'https://www.quickpaycr.com/'
  when 'paquera-puntarenas' then 'https://www.quickpaycr.com/'
  when 'puntarenas-naranjo' then 'https://coonatramar.com/home/'
  when 'naranjo-puntarenas' then 'https://coonatramar.com/home/'
end
where ticket_url is null
  and source_key in (
    'puntarenas-paquera',
    'paquera-puntarenas',
    'puntarenas-naranjo',
    'naranjo-puntarenas'
  );

comment on column public.ferry_routes.ticket_url is
  'HTTPS URL for the ferry operator official online ticket issuer. Null when no online sale is verified.';
