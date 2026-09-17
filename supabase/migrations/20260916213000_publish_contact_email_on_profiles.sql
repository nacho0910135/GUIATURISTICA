-- The profile screen already presents the account email as the contact email.
-- Persist that same value so other travelers receive it from public.users.
update public.users as profile
set contact_email = lower(auth_user.email)
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.contact_email is null
  and auth_user.email is not null;

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, username, full_name, avatar_url, contact_email, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'viajero'
    ) || '-' || left(new.id::text, 6),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Viajero'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    lower(new.email),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_auth_user() from public, anon, authenticated;
grant select (contact_email) on table public.users to anon;

notify pgrst, 'reload schema';
