-- Institutional badges require documented evidence. A matching domain or an
-- operational field (for example, SINAC booking) is not verification.
alter table public.destinations
  add column if not exists verification_evidence_url text,
  add column if not exists verification_checked_at timestamptz;

update public.destinations
set validated_by = '{}'::text[],
    verification_evidence_url = null,
    verification_checked_at = null
where cardinality(validated_by) > 0;

alter table public.destinations
  drop constraint if exists destinations_validated_by_known_authorities,
  add constraint destinations_validated_by_known_authorities
    check (validated_by <@ array['ICT', 'SINAC']::text[]),
  drop constraint if exists destinations_official_verification_is_documented,
  add constraint destinations_official_verification_is_documented
    check (
      cardinality(validated_by) = 0
      or (verification_evidence_url is not null and verification_checked_at is not null)
    );

alter table public.commercial_services
  add column if not exists business_verified_at timestamptz,
  add column if not exists business_verification_evidence_url text,
  add column if not exists business_updated_at timestamptz;

alter table public.commercial_services
  drop constraint if exists commercial_services_business_verification_is_documented,
  add constraint commercial_services_business_verification_is_documented
    check (
      business_verified_at is null
      or business_verification_evidence_url is not null
    );

comment on column public.destinations.verification_evidence_url is
  'Document or audit URL proving an institutional verification; never inferred from source_url.';
comment on column public.destinations.verification_checked_at is
  'Date on which the documented institutional verification was reviewed.';
comment on column public.commercial_services.business_verified_at is
  'Date business ownership was verified from documented evidence.';
comment on column public.commercial_services.business_updated_at is
  'Date the verified business last supplied or confirmed its listing information.';

-- Profile owners can edit profile fields, never the authorization role used by
-- the verification guards below.
revoke update on public.users from authenticated;
grant update (username, full_name, avatar_url, bio, contact_email) on public.users to authenticated;

create or replace function public.guard_destination_verification_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and cardinality(new.validated_by) > 0
      or tg_op = 'UPDATE' and (new.validated_by, new.verification_evidence_url, new.verification_checked_at)
        is distinct from (old.validated_by, old.verification_evidence_url, old.verification_checked_at))
     and session_user not in ('postgres', 'supabase_admin')
     and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role'
     and not exists (
       select 1 from public.users
       where id = (select auth.uid()) and role = 'admin'
     ) then
    raise exception 'Only administrators can change institutional verification metadata' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_destination_verification_metadata() from public, anon, authenticated;
drop trigger if exists guard_destination_verification_metadata on public.destinations;
create trigger guard_destination_verification_metadata
before insert or update on public.destinations
for each row execute function public.guard_destination_verification_metadata();

create or replace function public.guard_business_verification_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and new.business_verified_at is not null
      or tg_op = 'UPDATE' and (new.business_verified_at, new.business_verification_evidence_url)
        is distinct from (old.business_verified_at, old.business_verification_evidence_url))
     and session_user not in ('postgres', 'supabase_admin')
     and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role'
     and not exists (
       select 1 from public.users
       where id = (select auth.uid()) and role = 'admin'
     ) then
    raise exception 'Only administrators can change business verification metadata' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_business_verification_metadata() from public, anon, authenticated;
drop trigger if exists guard_business_verification_metadata on public.commercial_services;
create trigger guard_business_verification_metadata
before insert or update on public.commercial_services
for each row execute function public.guard_business_verification_metadata();
