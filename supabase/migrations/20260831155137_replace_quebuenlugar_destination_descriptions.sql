-- Replace operational, source-imported copy with the concise place descriptions
-- used throughout the destination catalogue. Future imports use the same copy
-- in scripts/sync-quebuenlugar-places.mjs.
update public.destinations
set
  description = case
    when category ilike '%Catarata%' then format('%s es una catarata ubicada en %s, Costa Rica, rodeada de un entorno natural.', name, province)
    when category ilike '%Río%' or category ilike '%Poza%' or category ilike '%Laguna%' then format('%s es un espacio de río y pozas naturales ubicado en %s, Costa Rica.', name, province)
    when category ilike '%Mirador%' then format('%s es un mirador ubicado en %s, Costa Rica, con vistas del paisaje de la zona.', name, province)
    when category ilike '%Parque Nacional%' then format('%s es un espacio natural en %s, Costa Rica, para conocer los paisajes y la biodiversidad de la zona.', name, province)
    when category ilike '%Playa%' then format('%s es una playa de %s, Costa Rica, para disfrutar la costa y su entorno natural.', name, province)
    else format('%s es un destino de senderismo en %s, Costa Rica, para recorrer y conocer el entorno natural.', name, province)
  end,
  description_en = case
    when category ilike '%Catarata%' then format('%s is a waterfall in %s, Costa Rica, surrounded by a natural setting.', name, province)
    when category ilike '%Río%' or category ilike '%Poza%' or category ilike '%Laguna%' then format('%s is a river and natural swimming-hole destination in %s, Costa Rica.', name, province)
    when category ilike '%Mirador%' then format('%s is a viewpoint in %s, Costa Rica, with views of the surrounding landscape.', name, province)
    when category ilike '%Parque Nacional%' then format('%s is a natural area in %s, Costa Rica, where visitors can explore the region''s landscapes and biodiversity.', name, province)
    when category ilike '%Playa%' then format('%s is a beach in %s, Costa Rica, for enjoying the coast and its natural surroundings.', name, province)
    else format('%s is a hiking destination in %s, Costa Rica, for exploring the natural surroundings.', name, province)
  end
where source_url like 'https://quebuenlugar.com/%';
