import { createClient } from '@supabase/supabase-js';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await supabase.from('bus_routes').select('source_key,source_url,route_name,origin_city,destination_city,company_name,schedules,fare_crc,last_verified_at,route_scope').eq('route_scope', 'cantonal');
if (error) throw error;
const normalizeSchedules = (value) => {
  if (value && !Array.isArray(value) && typeof value === 'object') return { weekday: value.weekday ?? [], saturday: value.saturday ?? [], sunday: value.sunday ?? [] };
  const rows = Array.isArray(value) ? value : [];
  return {
    weekday: rows.find((row) => /semana|lunes|salida/i.test(row.label ?? ''))?.outbound ?? rows[0]?.outbound ?? [],
    saturday: rows.find((row) => /s[aá]bado/i.test(row.label ?? ''))?.outbound ?? [],
    sunday: rows.find((row) => /domingo/i.test(row.label ?? ''))?.outbound ?? [],
  };
};
const complete = (data ?? []).map((route) => ({ ...route, schedules: normalizeSchedules(route.schedules), fare_kind: 'official', is_published: true, route_scope: 'cantonal', quality_issues: [] })).filter((route) => route.schedules.weekday.length > 0);
await supabase.from('cantonal_bus_routes').update({ is_published: false }).neq('is_published', false);
if (complete.length) {
  const result = await supabase.from('cantonal_bus_routes').upsert(complete, { onConflict: 'source_key' });
  if (result.error) throw result.error;
}
console.log(JSON.stringify({ source_cantonal: data?.length ?? 0, published: complete.length, omitted_incomplete_or_districtal: (data?.length ?? 0) - complete.length }, null, 2));
