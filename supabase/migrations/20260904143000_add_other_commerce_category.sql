insert into public.app_options (kind, id, label_es, label_en, icon, parent_id, allowed_targets, sort_order, active)
values ('commerce_category', 'other', 'Otro', 'Other', 'dots-horizontal-circle-outline', null, null, 130, true)
on conflict (kind, id) do update set
  label_es = excluded.label_es,
  label_en = excluded.label_en,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  active = true;
