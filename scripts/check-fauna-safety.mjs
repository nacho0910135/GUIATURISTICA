const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.');
const headers = { apikey: key };

const safeResponse = await fetch(`${url}/rest/v1/fauna_species_public?select=tour_observable,is_endemic,is_national_symbol,location_protected,latitude,longitude,image_url`, { headers });
if (!safeResponse.ok) throw new Error(`La vista pública respondió ${safeResponse.status}: ${await safeResponse.text()}`);
const species = await safeResponse.json();
const count = (field) => species.filter((item) => item[field]).length;

if (species.length < 40) throw new Error('El catálogo debe contener al menos 40 especies de Costa Rica.');
if (count('tour_observable') < 7) throw new Error('El catálogo debe conservar al menos 7 especies observables en tours.');
if (count('is_endemic') < 3) throw new Error('El catálogo debe conservar al menos 3 especies endémicas.');
if (count('is_national_symbol') < 4) throw new Error('El catálogo debe conservar al menos 4 símbolos nacionales.');
if (species.some((item) => !item.image_url)) throw new Error('Todas las especies deben tener una imagen.');
if (species.some((item) => item.location_protected && (item.latitude !== null || item.longitude !== null))) {
  throw new Error('La vista pública filtró coordenadas de una especie protegida.');
}

const rawResponse = await fetch(`${url}/rest/v1/fauna_species?select=approx_location&limit=1`, { headers });
if (rawResponse.ok) throw new Error('El rol anónimo todavía puede leer approx_location.');

console.log(`Fauna segura: ${species.length} especies, sin coordenadas sensibles expuestas.`);
