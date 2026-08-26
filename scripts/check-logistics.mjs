const url = 'https://dxqezvkguswleoisxikz.supabase.co';
const key = 'sb_publishable_4YjkMWzHSFnxb4eCe4ukkw_j-yaPhd6';
const headers = { apikey: key, 'Content-Type': 'application/json' };

const nearbyResponse = await fetch(`${url}/rest/v1/rpc/get_destinations_nearby`, {
  method: 'POST', headers,
  body: JSON.stringify({ user_lat: 9.932, user_lng: -84.08, distance_meters: 120000 }),
});
if (!nearbyResponse.ok) throw new Error(`El RPC PostGIS respondió ${nearbyResponse.status}: ${await nearbyResponse.text()}`);
const nearby = await nearbyResponse.json();
if (!nearby.length) throw new Error('El recomendador no encontró destinos cerca de San José.');
if (nearby.some((item, index) => index > 0 && item.dist_meters < nearby[index - 1].dist_meters)) throw new Error('Los destinos no están ordenados por distancia real.');

const featuredResponse = await fetch(`${url}/rest/v1/destinations?select=name,latitude,longitude,has_high_tides_risk&name=in.(Parque%20Nacional%20Marino%20Ballena,Parque%20Nacional%20Manuel%20Antonio)`, { headers });
if (!featuredResponse.ok) throw new Error(`Los destinos respondieron ${featuredResponse.status}: ${await featuredResponse.text()}`);
const featured = await featuredResponse.json();
if (featured.length !== 2 || featured.some((item) => !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude))) throw new Error('Los destinos destacados deben exponer coordenadas PostGIS válidas.');
if (!featured.every((item) => item.has_high_tides_risk)) throw new Error('Los destinos costeros destacados deben activar vigilancia de mareas.');

console.log(`Logística lista: ${nearby.length} destinos PostGIS cercanos y ${featured.length} destinos costeros verificados.`);
