import Mapbox from '@rnmapbox/maps';
import { StyleSheet, View } from 'react-native';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

export function AerialMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return <Mapbox.MapView attributionEnabled logoEnabled style={StyleSheet.absoluteFill} styleURL="mapbox://styles/mapbox/satellite-streets-v12">
    <Mapbox.Camera defaultSettings={{ centerCoordinate: [longitude, latitude], zoomLevel: 16 }} />
    <Mapbox.PointAnnotation id="destination" coordinate={[longitude, latitude]}><View collapsable={false} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: 'white', backgroundColor: '#F26A44' }} /></Mapbox.PointAnnotation>
  </Mapbox.MapView>;
}
