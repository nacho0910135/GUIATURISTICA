alter table public.traveler_posts
  add column recommended_destination_id uuid,
  add column recommended_destination_is_community boolean not null default false;

create index traveler_posts_recommended_destination_idx
  on public.traveler_posts (recommended_destination_id)
  where recommended_destination_id is not null;
