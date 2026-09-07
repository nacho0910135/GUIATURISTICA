// A current fix is shared across the session; old/approximate fixes are never
// presented as the traveler's current position.
export const LOCATION_MAX_AGE_MS = 60_000;
export const LOCATION_MAX_ACCURACY_METERS = 100;

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
