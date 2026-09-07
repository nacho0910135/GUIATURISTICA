export type RoadPoint = { latitude: number | null; longitude: number | null };

export function roadPointKey(point: RoadPoint) {
  const { latitude, longitude } = point;
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    ? `${longitude},${latitude}` : '';
}

// Matrix driving allows 25 coordinates: one origin and 24 destinations.
// Serialize requests across screens to respect the provider's 60/minute limit.
let queue: Promise<unknown> = Promise.resolve();
let nextRequestAt = 0;
export function getRoadDistances(origin: string, destinations: string[], signal?: AbortSignal): Promise<(number | null)[]> {
  const run = async () => {
    signal?.throwIfAborted();
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) throw new Error('ROAD_DISTANCE_NOT_CONFIGURED');
    if (!origin || !destinations.length || destinations.length > 24) throw new Error('INVALID_ROAD_POINTS');
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    signal?.throwIfAborted();
    nextRequestAt = Date.now() + 1100;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 15000);
    try {
      // A single destination still needs two matrix elements. Include the
      // origin's self-distance and discard it; never invent a second endpoint.
      const single = destinations.length === 1;
      const indexes = destinations.map((_, i) => i + 1);
      const params = new URLSearchParams({
        access_token: token, sources: '0',
        destinations: (single ? [0, ...indexes] : indexes).join(';'),
        annotations: 'distance',
      });
      const response = await fetch(`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${[origin, ...destinations].join(';')}?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`ROAD_DISTANCE_HTTP_${response.status}`);
      const body = await response.json();
      if (body.code === 'NoRoute') return destinations.map(() => null);
      if (body.code !== 'Ok' || !Array.isArray(body.distances?.[0])) throw new Error('INVALID_ROAD_RESPONSE');
      const row = single ? body.distances[0].slice(1) : body.distances[0];
      const waypoints = single ? body.destinations?.slice(1) : body.destinations;
      if (row.length !== destinations.length) throw new Error('INVALID_ROAD_RESPONSE');
      return row.map((meters: unknown, index: number) => {
        // Don't claim to reach a site when the road ends far from its pin.
        const sourceSnap = body.sources?.[0]?.distance;
        const destinationSnap = waypoints?.[index]?.distance;
        return typeof meters === 'number' && Number.isFinite(meters) && meters >= 0
          && typeof sourceSnap === 'number' && sourceSnap <= 100
          && typeof destinationSnap === 'number' && destinationSnap <= 100
          ? meters / 1000 : null;
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
  const request = queue.then(run, run);
  queue = request.catch(() => undefined);
  return request;
}

export function roadDistanceLabel(distance: number | null | undefined, language: 'es' | 'en', _nearby = true) {
  if (distance === undefined) return language === 'es' ? 'Calculando ruta…' : 'Calculating route…';
  if (distance === null || !Number.isFinite(distance) || distance < 0) return language === 'es' ? 'Distancia por carretera no disponible' : 'Road distance unavailable';
  const value = distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
  return language === 'es' ? `≈ ${value} por carretera` : `≈ ${value} by road`;
}
