import { readFile } from 'node:fs/promises';

const collection = JSON.parse(await readFile('src/data/districts.json', 'utf8'));
const rings = collection.features.flatMap((feature) => feature.geometry.coordinates.flat());
const validRing = (ring) => ring.length >= 4
  && ring.every(([longitude, latitude]) => longitude >= -88 && longitude <= -82 && latitude >= 5 && latitude <= 12)
  && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];

if (collection.type !== 'FeatureCollection' || collection.features.length !== 473 || rings.some((ring) => !validRing(ring))) {
  throw new Error('El GeoJSON distrital no cumple el contrato móvil esperado.');
}

console.log(`Mapa verificado: ${collection.features.length} distritos, ${rings.length} anillos WGS84 válidos.`);
