const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const COSTA_RICA_BBOX = '-85.96,8.03,-82.55,11.22';

export type LocationSearchResult = {
  id: string;
  name: string;
  address: string;
  coordinate?: { latitude: number; longitude: number };
};

type GeocodingFeature = {
  id?: string;
  geometry?: { coordinates?: number[] };
  properties?: { full_address?: string; name?: string; place_formatted?: string; coordinates?: { longitude?: number; latitude?: number } };
};

function featureToResult(feature: GeocodingFeature, index: number): LocationSearchResult | undefined {
  const longitude = feature.properties?.coordinates?.longitude ?? feature.geometry?.coordinates?.[0];
  const latitude = feature.properties?.coordinates?.latitude ?? feature.geometry?.coordinates?.[1];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  const name = feature.properties?.name ?? feature.properties?.full_address?.split(',')[0];
  if (!name) return undefined;
  return {
    id: feature.id ?? `${longitude}-${latitude}-${index}`,
    name,
    address: feature.properties?.place_formatted ?? feature.properties?.full_address ?? 'Costa Rica',
    coordinate: { latitude: latitude as number, longitude: longitude as number },
  };
}

export async function searchLocations(query: string, language: 'es' | 'en', signal: AbortSignal): Promise<LocationSearchResult[]> {
  if (!MAPBOX_TOKEN || query.trim().length < 3) return [];
  const params = new URLSearchParams({ access_token: MAPBOX_TOKEN, autocomplete: 'true', bbox: COSTA_RICA_BBOX, country: 'CR', language, limit: '7', q: query.trim() });
  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { signal });
  if (!response.ok) throw new Error('location-search');
  const payload = await response.json() as { features?: GeocodingFeature[] };
  return (payload.features ?? []).map(featureToResult).filter((item): item is LocationSearchResult => Boolean(item));
}

export async function reverseLocationName(coordinate: { latitude: number; longitude: number }, language: 'es' | 'en', signal?: AbortSignal) {
  if (!MAPBOX_TOKEN) return undefined;
  const params = new URLSearchParams({ access_token: MAPBOX_TOKEN, country: 'CR', language, latitude: String(coordinate.latitude), longitude: String(coordinate.longitude) });
  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`, { signal });
  if (!response.ok) return undefined;
  const payload = await response.json() as { features?: GeocodingFeature[] };
  const feature = payload.features?.[0];
  return feature?.properties?.full_address ?? feature?.properties?.name;
}
