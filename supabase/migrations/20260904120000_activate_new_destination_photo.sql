-- An admin upload becomes the destination's active cover and remains so
-- until another photo is uploaded or the active photo is deleted.
create or replace function public.activate_new_destination_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.destinations
  set cover_image_url = new.image_url,
      image_verified = true,
      image_attribution = null,
      image_license = null,
      image_source_url = null
  where id = new.destination_id;

  return new;
end;
$$;

revoke all on function public.activate_new_destination_photo() from public, anon, authenticated;

drop trigger if exists activate_new_destination_photo on public.destination_photos;
create trigger activate_new_destination_photo
after insert on public.destination_photos
for each row execute function public.activate_new_destination_photo();
