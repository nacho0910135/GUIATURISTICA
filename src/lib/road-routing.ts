import AsyncStorage from '@react-native-async-storage/async-storage';

export type RoadPoint = { latitude: number; longitude: number };
export type RoadRoute = {
  distanceKm: number;
  durationMinutes: number;
  geometry?: { type: 'LineString'; coordinates: [number, number][] };
  cached: boolean;
  updatedAt: string;
};

const cache = new Map<string, Promise<RoadRoute | null>>();

export function getRoadRoute(from: RoadPoint, to: RoadPoint, geometry = false) {
  if (!valid(from) || !valid(to)) return Promise.resolve(null);
  const key = `${from.longitude.toFixed(5)},${from.latitude.toFixed(5)};${to.longitude.toFixed(5)},${to.latitude.toFixed(5)};${geometry}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const storageKey = `road-route:${key}`;
  const request = (async () => {
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (token) try {
      const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${key.split(';').slice(0, 2).join(';')}?access_token=${encodeURIComponent(token)}&overview=${geometry ? 'simplified' : 'false'}&geometries=geojson`);
      if (response.ok) {
        const body = await response.json() as { code?: string; routes?: { distance?: number; duration?: number; geometry?: RoadRoute['geometry'] }[] };
        const route = body.code === 'Ok' ? body.routes?.[0] : undefined;
        if (route && Number.isFinite(route.distance) && Number.isFinite(route.duration)) {
          const value: RoadRoute = { distanceKm: route.distance! / 1000, durationMinutes: route.duration! / 60, geometry: route.geometry, cached: false, updatedAt: new Date().toISOString() };
          await AsyncStorage.setItem(storageKey, JSON.stringify(value));
          return value;
        }
      }
    } catch { /* fall through to the last valid route */ }
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (!stored) return null;
      const value = JSON.parse(stored) as RoadRoute;
      return Number.isFinite(value.distanceKm) && Number.isFinite(value.durationMinutes) ? { ...value, cached: true } : null;
    } catch { return null; }
  })();
  cache.set(key, request);
  void request.finally(() => cache.delete(key));
  return request;
}

export async function getRoadRoutes<T extends RoadPoint & { id: string }>(from: RoadPoint, destinations: T[]) {
  const result = new Map<string, RoadRoute>();
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(6, destinations.length) }, async () => {
    while (cursor < destinations.length) {
      const destination = destinations[cursor++];
      const route = await getRoadRoute(from, destination);
      if (route) result.set(destination.id, route);
    }
  }));
  return result;
}

export async function getRoadDistances<T extends RoadPoint & { id: string }>(from: RoadPoint, destinations: T[]) {
  return new Map([...await getRoadRoutes(from, destinations)].map(([id, route]) => [id, route.distanceKm]));
}

function valid(point: RoadPoint) {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
