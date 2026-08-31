-- Reference directories are read-only imports, not claimable businesses.
insert into public.app_options (kind, id, label_es, label_en, icon, parent_id, allowed_targets, sort_order, active)
values
  ('commerce_category', 'embassies', 'Directorio de embajadas', 'Embassy directory', 'flag-variant', null, null, 115, true),
  ('commerce_category', 'airports', 'Aeropuertos', 'Airports', 'airplane', null, null, 120, true),
  ('commerce_subcategory', 'embassy', 'Embajada / consulado', 'Embassy / consulate', null, 'embassies', null, 10, true),
  ('commerce_subcategory', 'international_airport', 'Aeropuerto internacional', 'International airport', null, 'airports', null, 10, true),
  ('commerce_subcategory', 'aerodrome', 'Aeródromo', 'Aerodrome', null, 'airports', null, 20, true)
on conflict (kind, id) do update set
  label_es = excluded.label_es,
  label_en = excluded.label_en,
  icon = excluded.icon,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  active = true;
