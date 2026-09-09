import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { getWeather, WEATHER_STALE_TIME } from '@/lib/logistics';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const PROVINCE_MAP_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [{ id: 'background', type: 'background' as const, paint: { 'background-color': '#F8F6F0' } }],
};
const provinceColors = ['match', ['get', 'code'], '1', '#2A7B4C', '2', '#1E5B75', '3', '#4A9874', '4', '#326F8B', '5', '#82B99C', '6', '#568BA4', '7', '#1E6038', '#2A7B4C'] as const;
const provinceShape: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: provinces.map((province) => ({ type: 'Feature', id: province.code, properties: { code: province.code, name: province.name }, geometry: { type: 'MultiPolygon', coordinates: province.polygons.map((ring) => [ring]) } })),
};
export type MapCoordinate = { latitude: number; longitude: number };
type MapCanvasProps = { onLocationPick?: (coordinate: MapCoordinate) => void; selectedLocation?: MapCoordinate };
type WeatherMarker = { icon: HTMLSpanElement; label: HTMLSpanElement; marker: mapboxgl.Marker };

function weatherSymbol(icon?: string) {
  if (icon?.startsWith('01')) return '☀';
  if (icon?.startsWith('02')) return '⛅';
  if (icon?.startsWith('09') || icon?.startsWith('10')) return '☂';
  if (icon?.startsWith('11')) return 'ϟ';
  return '☁';
}

export function MapCanvas({ onLocationPick, selectedLocation }: MapCanvasProps = {}) {
  const { language } = useApp();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const locationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const weatherMarkersRef = useRef(new Map<string, WeatherMarker>());
  const onLocationPickRef = useRef(onLocationPick);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const wide = width >= 900;
  const selectionMode = Boolean(onLocationPick);
  const weather = useQueries({ queries: provinces.map((province) => ({ queryKey: ['weather', 'province', province.code, language], queryFn: () => getWeather(province.center, language), enabled: !selectionMode, staleTime: WEATHER_STALE_TIME })) });
  useEffect(() => { onLocationPickRef.current = onLocationPick; }, [onLocationPick]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const weatherMarkers = weatherMarkersRef.current;
    let loaded = false;
    const map = new mapboxgl.Map({ accessToken: MAPBOX_TOKEN, container: mapContainer.current, style: selectionMode ? 'mapbox://styles/mapbox/outdoors-v12' : PROVINCE_MAP_STYLE, center: [-84.12, 9.88], zoom: wide ? 7.37 : 6.67, minZoom: 5.7, maxZoom: selectionMode ? 19 : 10, dragRotate: false, pitchWithRotate: false, attributionControl: selectionMode });
    if (selectionMode) map.scrollZoom.enable(); else map.scrollZoom.disable();
    mapRef.current = map;
    map.on('load', () => {
      loaded = true;
      setMapReady(true);
      setMapError(false);
      if (selectionMode) {
        map.on('click', (event) => onLocationPickRef.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }));
        return;
      }
      map.addSource('provinces', { type: 'geojson', data: provinceShape });
      map.addLayer({ id: 'province-fills', type: 'fill', source: 'provinces', paint: { 'fill-color': [...provinceColors] as mapboxgl.Expression, 'fill-opacity': 1 } });
      map.addLayer({ id: 'province-halo', type: 'line', source: 'provinces', paint: { 'line-color': '#F8F6F0', 'line-opacity': 0.8, 'line-width': 6 } });
      map.addLayer({ id: 'province-lines', type: 'line', source: 'provinces', paint: { 'line-color': '#1E5B75', 'line-opacity': 1, 'line-width': 3 } });
      provinces.forEach((province) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.setAttribute('aria-label', `Abrir ${province.name}`);
        element.dataset.weatherProvince = province.code;
        Object.assign(element.style, {
          alignItems: 'center', background: 'rgba(30, 91, 117, 0.94)', border: '1px solid rgba(248, 246, 240, 0.8)',
          borderRadius: '14px', color: '#F8F6F0', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          fontFamily: 'inherit', minWidth: wide ? '96px' : '78px', padding: wide ? '6px 9px' : '4px 6px', textAlign: 'center',
        });
        const icon = document.createElement('span');
        Object.assign(icon.style, { color: '#F26A44', fontSize: wide ? '28px' : '21px', fontWeight: '700', lineHeight: '1' });
        icon.textContent = '☁';
        const label = document.createElement('span');
        Object.assign(label.style, { fontSize: wide ? '15px' : '12px', fontWeight: '700', lineHeight: wide ? '19px' : '16px', whiteSpace: 'pre-line' });
        label.textContent = `${province.name}\n…`;
        element.append(icon, label);
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          router.push({ pathname: '/(aux)/province', params: { province: province.name } });
        });
        const marker = new mapboxgl.Marker({ anchor: 'center', element })
          .setLngLat([province.center.longitude, province.center.latitude])
          .addTo(map);
        weatherMarkersRef.current.set(province.code, { icon, label, marker });
      });
      const handleMapClick = (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
        if (onLocationPickRef.current) {
          onLocationPickRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
          return;
        }
        const feature = map.queryRenderedFeatures(event.point, { layers: ['province-fills'] })[0];
        const name = feature?.properties?.name as string | undefined;
        if (name) router.push({ pathname: '/(aux)/province', params: { province: name } });
      };
      map.on('click', handleMapClick);
      map.on('mouseenter', 'province-fills', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'province-fills', () => { map.getCanvas().style.cursor = ''; });
    });
    map.on('error', () => { if (!loaded) setMapError(true); });
    return () => {
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      weatherMarkers.forEach(({ marker }) => marker.remove());
      weatherMarkers.clear();
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [router, selectionMode, wide]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!selectedLocation) {
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      return;
    }
    const marker = locationMarkerRef.current ?? new mapboxgl.Marker({ color: '#F26A44' });
    marker.setLngLat([selectedLocation.longitude, selectedLocation.latitude]).addTo(map);
    locationMarkerRef.current = marker;
  }, [mapReady, selectedLocation]);

  useEffect(() => () => { locationMarkerRef.current?.remove(); }, []);

  useEffect(() => {
    if (selectionMode || !mapReady) return;
    provinces.forEach((province, index) => {
      const marker = weatherMarkersRef.current.get(province.code);
      const current = weather[index].data;
      if (!marker) return;
      marker.icon.textContent = weatherSymbol(current?.icon);
      marker.label.textContent = `${province.name}\n${current ? `${current.temperature}°${current.temperatureUnit}` : '…'}`;
    });
  }, [mapReady, selectionMode, weather]);

  return (
    <View className="relative overflow-hidden bg-ui-secondary dark:bg-ui-dark-secondary" style={{ borderColor: '#1E5B75', borderRadius: wide ? 28 : 0, borderWidth: 2, boxShadow: '0 10px 28px rgba(30, 91, 117, 0.28)', height: wide ? 530 : 460 }}>
      <div ref={mapContainer} style={{ height: '100%', inset: 0, position: 'absolute', width: '100%' }} />
      {!mapReady ? <View className="absolute inset-0 items-center justify-center bg-ui-background"><MaterialCommunityIcons name={mapError ? 'map-marker-off-outline' : 'map-search-outline'} color="#2A7B4C" size={34} /><Text className="mt-2 px-8 text-center font-bold text-forest-700">{mapError ? (language === 'es' ? 'No se pudo cargar Mapbox. Revisá el token o la conexión.' : 'Mapbox could not load. Check the token or connection.') : (language === 'es' ? 'Cargando mapa de Costa Rica…' : 'Loading Costa Rica map…')}</Text></View> : null}
    </View>
  );
}
