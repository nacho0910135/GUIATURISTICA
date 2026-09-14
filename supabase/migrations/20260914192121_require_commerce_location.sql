-- A directory entry without coordinates cannot provide directions and must not
-- be visible as a usable commerce or assistance service.
delete from public.commercial_services
where location is null;

alter table public.commercial_services
  alter column location set not null;

comment on column public.commercial_services.location is
  'Required map position for every commerce and assistance directory entry.';

notify pgrst, 'reload schema';
