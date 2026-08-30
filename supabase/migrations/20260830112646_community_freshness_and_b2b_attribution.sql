alter table public.business_events
  add column if not exists attribution jsonb not null default '{}'::jsonb;

alter table public.business_events
  drop constraint if exists business_events_attribution_object_check,
  add constraint business_events_attribution_object_check
    check (jsonb_typeof(attribution) = 'object' and octet_length(attribution::text) <= 1024);

create table if not exists public.destination_freshness_votes (
  destination_id uuid not null references public.destinations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_type text not null check (check_type in ('open', 'price', 'cards')),
  confirmed boolean not null,
  updated_at timestamptz not null default now(),
  primary key (destination_id, user_id, check_type)
);

alter table public.destination_freshness_votes enable row level security;

revoke all on table public.destination_freshness_votes from anon, authenticated;
grant select, insert, update on table public.destination_freshness_votes to authenticated;

drop policy if exists "Travelers read own freshness votes" on public.destination_freshness_votes;
create policy "Travelers read own freshness votes"
on public.destination_freshness_votes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Travelers add own freshness votes" on public.destination_freshness_votes;
create policy "Travelers add own freshness votes"
on public.destination_freshness_votes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Travelers update own freshness votes" on public.destination_freshness_votes;
create policy "Travelers update own freshness votes"
on public.destination_freshness_votes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.get_destination_freshness(p_destination_id uuid)
returns table (check_type text, confirmed_count bigint, not_confirmed_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select vote.check_type,
    count(*) filter (where vote.confirmed) as confirmed_count,
    count(*) filter (where not vote.confirmed) as not_confirmed_count
  from public.destination_freshness_votes vote
  where vote.destination_id = p_destination_id
  group by vote.check_type;
$$;

revoke all on function public.get_destination_freshness(uuid) from public;
grant execute on function public.get_destination_freshness(uuid) to anon, authenticated;
