-- The public summary must not disclose votes for unpublished suggestions.
create or replace function public.get_destination_suggestion_verification(p_suggestion_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'location_correct', jsonb_build_object(
      'confirmed', count(*) filter (where location_correct),
      'notConfirmed', count(*) filter (where not location_correct)
    ),
    'access', jsonb_build_object(
      'easy', count(*) filter (where access_difficulty = 'Fácil'),
      'medium', count(*) filter (where access_difficulty = 'Medio'),
      'difficult', count(*) filter (where access_difficulty = 'Difícil')
    ),
    'parking', jsonb_build_object(
      'confirmed', count(*) filter (where has_parking),
      'notConfirmed', count(*) filter (where not has_parking)
    )
  )
  from public.destination_suggestion_verifications verification
  where verification.suggestion_id = p_suggestion_id
    and exists (
      select 1 from public.destination_suggestions suggestion
      where suggestion.id = p_suggestion_id and suggestion.status = 'published'
    );
$$;
