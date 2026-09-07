// A current fix is shared across the session; old/approximate fixes are never
// presented as the traveler's current position.
export const LOCATION_MAX_AGE_MS = 60_000;
export const LOCATION_MAX_ACCURACY_METERS = 100;

export type Coordinates = { latitude: number; longitude: number };

export function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const a = Math.sin(latitude / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function straightLineDistanceLabel(distance: number | null, language: 'es' | 'en', nearby = true) {
  if (distance == null || !Number.isFinite(distance) || distance < 0) {
    return language === 'es' ? 'Distancia no disponible' : 'Distance unavailable';
  }
  const value = distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
  const origin = nearby ? '' : (language === 'es' ? ' del centro regional' : ' from region center');
  return language === 'es' ? `≈ ${value} en línea recta${origin}` : `≈ ${value} straight-line${origin}`;
}

export function isUsablePosition(position: {
  timestamp: number;
  coords: { latitude: number; longitude: number; accuracy: number | null };
}, now = Date.now()) {
  const { latitude, longitude, accuracy } = position.coords;
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    && accuracy != null && Number.isFinite(accuracy) && accuracy >= 0
    && accuracy <= LOCATION_MAX_ACCURACY_METERS
    && Number.isFinite(position.timestamp)
    && now - position.timestamp >= -5000 && now - position.timestamp <= LOCATION_MAX_AGE_MS;
}

export function hasPrecisePermission(permission: {
  granted: boolean;
  android?: { accuracy: string };
  ios?: { accuracy: string };
}) {
  return permission.granted && (!permission.android || permission.android.accuracy === 'fine')
    && (!permission.ios || permission.ios.accuracy === 'full');
}
