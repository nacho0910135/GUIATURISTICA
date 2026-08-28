grant insert (
  common_name_es, common_name_en, scientific_name, category,
  description, description_en, habitat, habitat_en,
  vulnerability_status, province, tour_observable, is_endemic,
  is_national_symbol, created_by, community_submitted
) on public.fauna_species to anon;

drop policy if exists "Invitados agregan especies para todos" on public.fauna_species;
create policy "Invitados agregan especies para todos"
on public.fauna_species for insert to anon
with check (
  created_by = '00000000-0000-4000-8000-000000000001'::uuid
  and community_submitted
  and not tour_observable
  and not is_endemic
  and not is_national_symbol
  and approx_location is null
  and image_url is null
  and sound_url is null
  and sound_name is null
  and vulnerability_status = 'Sin evaluar'
  and char_length(btrim(common_name_es)) between 2 and 100
  and char_length(btrim(common_name_en)) between 2 and 100
  and char_length(btrim(scientific_name)) between 3 and 150
  and char_length(btrim(category)) between 2 and 80
);
