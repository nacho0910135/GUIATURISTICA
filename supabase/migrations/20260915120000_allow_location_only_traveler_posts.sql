alter table public.traveler_posts
  drop constraint traveler_posts_content,
  add constraint traveler_posts_content check (
    char_length(trim(body)) > 0
    or cardinality(image_urls) > 0
    or image_url is not null
    or recommended_destination_id is not null
    or (latitude is not null and longitude is not null)
  );
