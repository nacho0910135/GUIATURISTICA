-- The app only redirects to the verified official ticket issuer; it never processes payments.
alter table public.destinations
  add column if not exists requires_online_ticket boolean not null default false,
  add column if not exists online_ticket_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'destinations_online_ticket_url_https_check'
      and conrelid = 'public.destinations'::regclass
  ) then
    alter table public.destinations
      add constraint destinations_online_ticket_url_https_check
      check (online_ticket_url is null or online_ticket_url ~* '^https://');
  end if;
end
$$;

-- Preserve existing, verified SINAC reservation links as official purchase links.
-- Existing values are never overwritten.
update public.destinations
set
  requires_online_ticket = true,
  online_ticket_url = coalesce(online_ticket_url, sinac_booking_url)
where requires_sinac_booking
  and sinac_booking_url is not null;

comment on column public.destinations.requires_online_ticket is
  'True only when the official issuer requires online ticket purchase.';

comment on column public.destinations.online_ticket_url is
  'HTTPS URL of the verified official ticket issuer (SINAC or operator).';
