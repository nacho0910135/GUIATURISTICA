alter table public.traveler_posts
  add column image_urls text[] not null default '{}';

update public.traveler_posts
set image_urls = array[image_url]
where image_url is not null;

alter table public.traveler_posts
  drop constraint traveler_posts_content,
  add constraint traveler_posts_content check (
    char_length(trim(body)) > 0
    or cardinality(image_urls) > 0
    or image_url is not null
    or recommended_destination_id is not null
  ),
  add constraint traveler_posts_image_limit check (cardinality(image_urls) <= 5);
