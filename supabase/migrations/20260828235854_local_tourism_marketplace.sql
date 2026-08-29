-- Marketplace fields keep assistance and tourism businesses in one directory.
alter table public.commercial_services
  add column if not exists whatsapp text,
  add column if not exists menu_url text,
  add column if not exists opening_hours text,
  add column if not exists parking text,
  add column if not exists payment_methods text[] not null default '{}',
  add column if not exists accessibility text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists experience_type text,
  add column if not exists booking_url text,
  add column if not exists certifications text[] not null default '{}',
  add column if not exists cover_image_url text,
  add column if not exists claim_status text not null default 'unclaimed';

alter table public.commercial_services
  drop constraint if exists commercial_services_claim_status_check,
  add constraint commercial_services_claim_status_check
    check (claim_status in ('unclaimed', 'pending', 'claimed'));

-- Existing owner_id is linked to public.users (whose id is auth.users.id),
-- so owners can update a claimed profile without introducing a second identity.
create index if not exists commercial_services_owner_id_idx
  on public.commercial_services (owner_id);

alter table public.business_events
  drop constraint if exists business_events_event_type_check,
  add constraint business_events_event_type_check
    check (event_type in (
      'impression', 'whatsapp_click', 'call', 'directions',
      'save', 'reservation', 'coupon_redeemed'
    ));

create table if not exists public.commercial_service_claims (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.commercial_services(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (service_id, user_id)
);

create index if not exists commercial_service_claims_user_idx
  on public.commercial_service_claims (user_id, created_at desc);

alter table public.commercial_service_claims enable row level security;

drop policy if exists "Usuarios leen sus reclamos comerciales" on public.commercial_service_claims;
create policy "Usuarios leen sus reclamos comerciales"
on public.commercial_service_claims for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Usuarios solicitan reclamos comerciales" on public.commercial_service_claims;
create policy "Usuarios solicitan reclamos comerciales"
on public.commercial_service_claims for insert to authenticated
with check (user_id = (select auth.uid()));

create or replace function public.request_commercial_service_claim(
  p_service_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if not exists (select 1 from public.commercial_services where id = p_service_id) then
    raise exception 'service_not_found';
  end if;

  insert into public.commercial_service_claims (service_id, user_id, message)
  values (p_service_id, v_user_id, nullif(left(trim(coalesce(p_message, '')), 1000), ''))
  on conflict (service_id, user_id) do update
    set message = excluded.message, status = 'pending', reviewed_at = null;

  select id into v_claim_id
  from public.commercial_service_claims
  where service_id = p_service_id and user_id = v_user_id;
  update public.commercial_services
  set claim_status = case when owner_id is null then 'pending' else claim_status end
  where id = p_service_id;
  return v_claim_id;
end;
$$;

revoke all on function public.request_commercial_service_claim(uuid, text) from public;
grant execute on function public.request_commercial_service_claim(uuid, text) to authenticated;

grant select, insert on public.commercial_service_claims to authenticated;
