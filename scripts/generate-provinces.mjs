import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourceDirectory = process.argv[2];
const tolerance = Number(process.argv[3] ?? 0.01);
const districtTolerance = Number(process.argv[4] ?? 0.0015);

if (!sourceDirectory) {
  throw new Error('Uso: node scripts/generate-provinces.mjs <directorio-geojson> [tolerancia]');
}

const destination = path.resolve('src/data/provinces.json');

function distanceSquared(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  const x = start[0] + t * dx;
  const y = start[1] + t * dy;
  return (point[0] - x) ** 2 + (point[1] - y) ** 2;
}

function simplifyLine(points, squaredTolerance) {
  if (points.length <= 2) return points;
  let furthestIndex = 0;
  let furthestDistance = squaredTolerance;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = distanceSquared(points[index], points[0], points.at(-1));
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }
  if (!furthestIndex) return [points[0], points.at(-1)];
  return [
    ...simplifyLine(points.slice(0, furthestIndex + 1), squaredTolerance).slice(0, -1),
    ...simplifyLine(points.slice(furthestIndex), squaredTolerance),
  ];
}

function simplifyRing(sourceRing, ringTolerance = tolerance) {
  const ring = sourceRing[0][0] === sourceRing.at(-1)[0] && sourceRing[0][1] === sourceRing.at(-1)[1]
    ? sourceRing.slice(0, -1)
    : sourceRing;
  if (ring.length < 4) return sourceRing;
  let splitIndex = 1;
  let maxDistance = 0;
  for (let index = 1; index < ring.length; index += 1) {
    const distance = (ring[index][0] - ring[0][0]) ** 2 + (ring[index][1] - ring[0][1]) ** 2;
    if (distance > maxDistance) {
      maxDistance = distance;
      splitIndex = index;
    }
  }
  const firstArc = simplifyLine(ring.slice(0, splitIndex + 1), ringTolerance ** 2);
  const secondArc = simplifyLine([...ring.slice(splitIndex), ring[0]], ringTolerance ** 2);
  const simplified = [...firstArc.slice(0, -1), ...secondArc];
  return simplified.length >= 4 ? simplified : sourceRing;
}

function titleCase(name) {
  return name.toLocaleLowerCase('es-CR').replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-CR'));
}

const provinceNames = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

const provinces = [];
let sourcePoints = 0;
let outputPoints = 0;

for (let code = 1; code <= 7; code += 1) {
  const sourcePath = path.join(sourceDirectory, `${code}.geojson`);
  const feature = JSON.parse(await readFile(sourcePath, 'utf8'));
  const sourceRings = feature.geometry.coordinates.flat();
  const polygons = sourceRings.map((ring) => simplifyRing(ring));
  const points = polygons.flat();
  sourcePoints += sourceRings.flat().length;
  outputPoints += points.length;
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  const bounds = {
    minLatitude: Math.min(...latitudes),
    minLongitude: Math.min(...longitudes),
    maxLatitude: Math.max(...latitudes),
    maxLongitude: Math.max(...longitudes),
  };
  provinces.push({
    code: String(code),
    name: provinceNames[code - 1] ?? titleCase(feature.properties.Provincia),
    center: {
      latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
      longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
    },
    bounds,
    polygons,
  });
}

const invalidGeometry = provinces.some((province) => province.polygons.some((ring) => {
  const first = ring[0];
  const last = ring.at(-1);
  return ring.length < 4 || !first || !last || first[0] !== last[0] || first[1] !== last[1]
    || ring.some(([longitude, latitude]) => !Number.isFinite(longitude) || !Number.isFinite(latitude));
}));

if (provinces.length !== 7 || provinces.some((province) => !province.polygons.length) || invalidGeometry) {
  throw new Error('La fuente no produjo las siete provincias esperadas.');
}

await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify({
  source: 'CR_distritos_geojson (Apache-2.0), geometrías provinciales simplificadas para uso móvil',
  coordinateReferenceSystem: 'WGS84 / EPSG:4326',
  toleranceDegrees: tolerance,
  provinces,
}, null, 2)}\n`);

console.log(`Generadas ${provinces.length} provincias: ${sourcePoints} → ${outputPoints} puntos (${destination})`);

const districtFiles = (await readdir(sourceDirectory)).filter((name) => /^\d{5}\.geojson$/.test(name));
const districts = [];
let districtSourcePoints = 0;
let districtOutputPoints = 0;

for (const fileName of districtFiles) {
  const feature = JSON.parse(await readFile(path.join(sourceDirectory, fileName), 'utf8'));
  const code = feature.properties.Codigo;
  const coordinates = feature.geometry.coordinates.map((polygon) => polygon.filter((ring) => ring.length >= 4).map((ring) => {
    districtSourcePoints += ring.length;
    const simplified = simplifyRing(ring, districtTolerance);
    districtOutputPoints += simplified.length;
    return simplified;
  })).filter((polygon) => polygon.length);
  districts.push({
    type: 'Feature',
    id: code,
    properties: {
      code,
      provinceCode: code[0],
      province: titleCase(feature.properties.Provincia),
      canton: titleCase(feature.properties.Canton),
      district: titleCase(feature.properties.Distrito),
    },
    geometry: { type: 'MultiPolygon', coordinates },
  });
}

if (districts.length !== 473 || districts.some((district) => !district.geometry.coordinates.length)) {
  throw new Error(`La fuente produjo ${districts.length} distritos; se esperaban 473.`);
}

const districtDestination = path.resolve('src/data/districts.json');
await writeFile(districtDestination, `${JSON.stringify({ type: 'FeatureCollection', features: districts })}\n`);
console.log(`Generados ${districts.length} distritos: ${districtSourcePoints} → ${districtOutputPoints} puntos (${districtDestination})`);
