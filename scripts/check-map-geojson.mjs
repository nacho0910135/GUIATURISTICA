import { readFile } from 'node:fs/promises';

const collection = JSON.parse(await readFile('src/data/provinces.json', 'utf8'));
const validRing = (ring) => ring.length >= 4
  && ring.every(([longitude, latitude]) => longitude >= -88 && longitude <= -82 && latitude >= 5 && latitude <= 12)
  && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
const rings = collection.provinces.flatMap((province) => province.polygons);

if (collection.provinces.length !== 7 || rings.some((ring) => !validRing(ring))) throw new Error('El GeoJSON provincial no cumple el contrato esperado.');

console.log(`Mapa verificado: ${collection.provinces.length} provincias, ${rings.length} anillos WGS84 válidos.`);
