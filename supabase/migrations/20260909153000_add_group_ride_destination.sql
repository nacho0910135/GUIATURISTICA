alter table public.group_rides
  add column destination_name text,
  add column destination_latitude double precision,
  add column destination_longitude double precision;

alter table public.group_rides
  add constraint group_rides_destination_name_length
    check (destination_name is null or char_length(destination_name) between 3 and 240),
  add constraint group_rides_destination_latitude_range
    check (destination_latitude is null or destination_latitude between -90 and 90),
  add constraint group_rides_destination_longitude_range
    check (destination_longitude is null or destination_longitude between -180 and 180),
  add constraint group_rides_destination_complete
    check ((destination_name is null and destination_latitude is null and destination_longitude is null)
      or (destination_name is not null and destination_latitude is not null and destination_longitude is not null));
