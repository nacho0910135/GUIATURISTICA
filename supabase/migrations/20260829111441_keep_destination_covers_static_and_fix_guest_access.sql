drop trigger if exists destination_photo_like_featured_cover on public.destination_photo_likes;
drop function if exists public.refresh_featured_destination_photo();

update public.destinations set featured_community_photo_id = null where featured_community_photo_id is not null;

grant select on public.destination_photo_likes to anon, authenticated;
