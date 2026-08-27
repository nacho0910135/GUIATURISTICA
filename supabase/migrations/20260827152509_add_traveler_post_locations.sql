alter table public.traveler_posts
  add column latitude double precision,
  add column longitude double precision,
  add constraint traveler_posts_location_pair_check check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  );
