-- These four legacy rows are absent from the researched replacement catalog.
-- Preserve them for rollback and retire rather than delete so related data remains intact.
begin;

insert into private.destination_content_backups (batch_key, destination_id, snapshot)
select '20260903_retired_duplicates', destination.id, to_jsonb(destination)
from public.destinations destination
where destination.status = 'Activo'
  and (
    destination.name in (
    'Drake Bay (Bahía Drake)',
    'BAHÍA DRAKE - PUNTARENAS',
    'Catarata El Rey - Puriscal'
    )
    or (destination.name = 'Catarata Nauyaca' and abs(destination.latitude - 9.256347) < 0.000001 and abs(destination.longitude - (-83.7957434)) < 0.000001)
  )
on conflict (batch_key, destination_id) do nothing;

do $$
begin
  if (select count(*) from private.destination_content_backups where batch_key = '20260903_retired_duplicates') <> 4 then
    raise exception 'Expected four superseded destination backups';
  end if;
end $$;

update public.destinations
set status = 'Inactivo'
where status = 'Activo'
  and (
    name in (
    'Drake Bay (Bahía Drake)',
    'BAHÍA DRAKE - PUNTARENAS',
    'Catarata El Rey - Puriscal'
    )
    or (name = 'Catarata Nauyaca' and abs(latitude - 9.256347) < 0.000001 and abs(longitude - (-83.7957434)) < 0.000001)
  );

commit;
