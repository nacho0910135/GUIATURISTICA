-- Corrects only the four coordinates supplied after the bilingual content refresh.
begin;

create temporary table destination_coordinate_correction_payload (
  destination_id uuid primary key,
  expected_name text not null,
  previous_latitude double precision not null,
  previous_longitude double precision not null,
  latitude double precision not null,
  longitude double precision not null
) on commit drop;

insert into destination_coordinate_correction_payload values
  ('1fc1f83f-03fe-4c96-b3cb-a9a0595110f3', 'Catarata La Paz Waterfall Gardens', 10.2045, -84.1618, 10.2048, -84.2175),
  ('6c24c898-2a98-4b86-bdc1-af950bb36e53', 'Lago Arenal (Represa)', 10.5053, -84.8722, 10.4730, -84.9140),
  ('7c972607-b322-44e8-aba3-f8358e09d021', 'Cerro Amigos (Mirador Monteverde)', 10.3194, -84.7958, 10.3020, -84.8320),
  ('4e66c108-7ed0-4265-b12c-41ca17547271', 'Proyecto Asís (Centro de Rescate)', 10.3664, -84.5122, 10.3740, -84.5070);

do $$
begin
  if (select count(*) from destination_coordinate_correction_payload) <> 4 then
    raise exception 'Expected four destination coordinate corrections';
  end if;

  if (select count(*)
      from destination_coordinate_correction_payload payload
      join public.destinations destination
        on destination.id = payload.destination_id
       and destination.name = payload.expected_name
      where (abs(destination.latitude - payload.previous_latitude) < 0.0000001
             and abs(destination.longitude - payload.previous_longitude) < 0.0000001)
         or (abs(destination.latitude - payload.latitude) < 0.0000001
             and abs(destination.longitude - payload.longitude) < 0.0000001)) <> 4 then
    raise exception 'The four destination IDs, names, and coordinates must match before applying this correction';
  end if;
end
$$;

insert into private.destination_content_backups (batch_key, destination_id, snapshot)
select '20260903_precise_coordinate_correction', destination.id, to_jsonb(destination)
from public.destinations destination
join destination_coordinate_correction_payload payload on payload.destination_id = destination.id
on conflict (batch_key, destination_id) do nothing;

update public.destinations destination
set location = public.st_setsrid(public.st_makepoint(payload.longitude, payload.latitude), 4326)
from destination_coordinate_correction_payload payload
where destination.id = payload.destination_id;

do $$
begin
  if (select count(*)
      from public.destinations destination
      join destination_coordinate_correction_payload payload on payload.destination_id = destination.id
      where abs(destination.latitude - payload.latitude) < 0.0000001
        and abs(destination.longitude - payload.longitude) < 0.0000001) <> 4 then
    raise exception 'Destination coordinate correction verification failed';
  end if;
end
$$;

commit;
