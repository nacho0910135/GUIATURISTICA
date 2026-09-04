import assert from 'node:assert/strict';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const [{ data: options, error: optionsError }, { data: destinations, error: destinationsError }] = await Promise.all([
  supabase.rpc('get_public_app_options', { p_kinds: ['destination_category'] }),
  supabase.from('destinations').select('category').eq('status', 'Activo'),
]);
if (optionsError || destinationsError) throw optionsError ?? destinationsError;

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const matches = (category, targets) => targets.some((target) => normalize(category).includes(normalize(target)));
const roots = options.filter((option) => option.parent_id === null);
const counts = Object.fromEntries(roots.map((option) => [option.id, destinations.filter((destination) => matches(destination.category, option.allowed_targets ?? [])).length]));

assert.equal(roots.length, 19, 'Se esperaban 19 categorías principales activas.');
assert.deepEqual(Object.entries(counts).filter(([, count]) => count === 0), [], 'Todas las categorías deben tener destinos activos.');
console.log(`Categorías listas: ${roots.length} categorías y ${destinations.length} destinos activos; todas tienen contenido.`);
