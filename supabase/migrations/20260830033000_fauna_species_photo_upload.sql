grant insert (
  common_name_es, common_name_en, scientific_name, category,
  description, description_en, habitat, habitat_en,
  vulnerability_status, province, tour_observable, is_endemic,
  is_national_symbol, image_url, created_by, community_submitted
) on public.fauna_species to authenticated;

drop policy if exists "Usuarios agregan especies para todos" on public.fauna_species;
create policy "Usuarios agregan especies para todos"
on public.fauna_species for insert to authenticated
with check (
  (select auth.uid()) = created_by
  and community_submitted
  and not tour_observable
  and not is_endemic
  and not is_national_symbol
  and approx_location is null
  and (image_url is null or image_url like ('%/storage/v1/object/public/fauna-photos/' || (select auth.uid())::text || '/%'))
  and sound_url is null
  and sound_name is null
  and vulnerability_status = 'Sin evaluar'
  and char_length(btrim(common_name_es)) between 2 and 100
  and char_length(btrim(common_name_en)) between 2 and 100
  and char_length(btrim(scientific_name)) between 3 and 150
  and char_length(btrim(category)) between 2 and 80
);
