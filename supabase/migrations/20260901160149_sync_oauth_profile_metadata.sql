-- Keep the public profile in sync with the identity supplied by Google (or any
-- future OAuth provider) when Supabase creates the auth user.
create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, username, full_name, avatar_url, role)
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
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_auth_user() from public, anon, authenticated;

-- Fill avatars for OAuth accounts that were created before this migration.
update public.users as profile
set avatar_url = coalesce(
  nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
  nullif(auth_user.raw_user_meta_data ->> 'picture', '')
)
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.avatar_url is null
  and coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(auth_user.raw_user_meta_data ->> 'picture', '')
  ) is not null;
