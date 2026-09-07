import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { hasPrecisePermission, isUsablePosition } from './location-quality';

export type PreciseLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export async function getPreciseCurrentLocation(language: 'es' | 'en'): Promise<PreciseLocation> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
  if (!hasPrecisePermission(permission)) {
    throw new Error(language === 'es'
      ? 'Permití el acceso a la ubicación precisa para usar tu posición actual.'
      : 'Allow precise location access to use your current position.');
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let position: Location.LocationObject;
  try {
    position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        ...(Platform.OS === 'web' ? { maximumAge: 0, timeout: 20000 } : {}),
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(language === 'es'
          ? 'No se pudo obtener una ubicación precisa. Revisá el GPS y reintentá.'
          : 'Could not get a precise location. Check GPS and try again.')), 25000);
      }),
    ]);
  } finally { clearTimeout(timeout); }
  const accuracy = position.coords.accuracy;
  if (!isUsablePosition(position)) {
    throw new Error(language === 'es'
      ? 'El dispositivo no logró una ubicación suficientemente precisa. Activá la ubicación precisa del teléfono o marcá el punto directamente en el mapa.'
      : 'The device could not get a precise enough location. Enable precise location on your phone or mark the point directly on the map.');
  }

  return {
    accuracy,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
