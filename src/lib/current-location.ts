import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type PreciseLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const MAX_ACCEPTED_ACCURACY_METERS = 1000;

export async function getPreciseCurrentLocation(language: 'es' | 'en'): Promise<PreciseLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(language === 'es'
      ? 'Permití el acceso a la ubicación precisa para usar tu posición actual.'
      : 'Allow precise location access to use your current position.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
    ...(Platform.OS === 'web' ? { maximumAge: 0, timeout: 20000 } : {}),
  });
  const accuracy = position.coords.accuracy;
  if (accuracy == null || accuracy > MAX_ACCEPTED_ACCURACY_METERS) {
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
