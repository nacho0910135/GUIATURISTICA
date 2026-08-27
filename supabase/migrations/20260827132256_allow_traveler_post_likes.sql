alter table public.likes drop constraint likes_target_type_check;
alter table public.likes add constraint likes_target_type_check
  check (target_type in ('destination', 'fauna_photo', 'service', 'traveler_post'));
