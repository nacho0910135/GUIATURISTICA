-- Community confirmations apply only to traveler-submitted destinations.
alter table public.destination_suggestions
  add column if not exists community_verified_at timestamptz;

create table if not exists public.destination_suggestion_verifications (
  suggestion_id uuid not null references public.destination_suggestions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  location_correct boolean not null,
  access_difficulty text not null check (access_difficulty in ('Fácil', 'Medio', 'Difícil')),
  has_parking boolean not null,
  updated_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);

alter table public.destination_suggestion_verifications enable row level security;
revoke all on table public.destination_suggestion_verifications from anon, authenticated;
grant select, insert, update on table public.destination_suggestion_verifications to authenticated;

drop policy if exists "Travelers read their suggestion verifications" on public.destination_suggestion_verifications;
create policy "Travelers read their suggestion verifications"
on public.destination_suggestion_verifications for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Travelers verify other suggestions" on public.destination_suggestion_verifications;
create policy "Travelers verify other suggestions"
on public.destination_suggestion_verifications for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.destination_suggestions suggestion
    where suggestion.id = suggestion_id and suggestion.user_id = (select auth.uid())
  )
);

drop policy if exists "Travelers update their suggestion verifications" on public.destination_suggestion_verifications;
create policy "Travelers update their suggestion verifications"
on public.destination_suggestion_verifications for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.destination_suggestions suggestion
    where suggestion.id = suggestion_id and suggestion.user_id = (select auth.uid())
  )
);

create or replace function public.refresh_destination_suggestion_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_suggestion_id uuid;
begin
  target_suggestion_id := case when tg_op = 'DELETE' then old.suggestion_id else new.suggestion_id end;
  update public.destination_suggestions suggestion
  set community_verified_at = case
    when (
      select count(*)
      from public.destination_suggestion_verifications verification
      where verification.suggestion_id = target_suggestion_id
        and verification.location_correct
    ) >= 3 then coalesce(suggestion.community_verified_at, now())
    else null
  end
  where suggestion.id = target_suggestion_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists refresh_destination_suggestion_verification_status on public.destination_suggestion_verifications;
create trigger refresh_destination_suggestion_verification_status
after insert or update or delete on public.destination_suggestion_verifications
for each row execute function public.refresh_destination_suggestion_verification_status();

create or replace function public.get_destination_suggestion_verification(p_suggestion_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'location_correct', jsonb_build_object(
      'confirmed', count(*) filter (where location_correct),
      'notConfirmed', count(*) filter (where not location_correct)
    ),
    'access', jsonb_build_object(
      'easy', count(*) filter (where access_difficulty = 'Fácil'),
      'medium', count(*) filter (where access_difficulty = 'Medio'),
      'difficult', count(*) filter (where access_difficulty = 'Difícil')
    ),
    'parking', jsonb_build_object(
      'confirmed', count(*) filter (where has_parking),
      'notConfirmed', count(*) filter (where not has_parking)
    )
  )
  from public.destination_suggestion_verifications
  where suggestion_id = p_suggestion_id;
$$;

revoke all on function public.get_destination_suggestion_verification(uuid) from public;
grant execute on function public.get_destination_suggestion_verification(uuid) to anon, authenticated;
