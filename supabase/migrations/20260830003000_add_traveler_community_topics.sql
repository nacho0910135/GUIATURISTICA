alter table public.traveler_posts
  add column if not exists topic text not null default 'general',
  drop constraint if exists traveler_posts_topic_check,
  add constraint traveler_posts_topic_check check (topic in ('general', 'moteros', 'enduro', 'convoy_4x4'));

create index if not exists traveler_posts_topic_created_at_idx
  on public.traveler_posts (topic, created_at desc);
