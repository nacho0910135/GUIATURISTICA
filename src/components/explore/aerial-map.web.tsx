import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

export function AerialMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = new mapboxgl.Map({ accessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '', container: container.current, style: 'mapbox://styles/mapbox/satellite-streets-v12', center: [longitude, latitude], zoom: 16 });
    new mapboxgl.Marker({ color: '#F26A44' }).setLngLat([longitude, latitude]).addTo(map);
    return () => map.remove();
  }, [latitude, longitude]);
  return <View ref={container as never} style={{ flex: 1 }} />;
}
