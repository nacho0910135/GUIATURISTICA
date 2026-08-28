import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import mapboxgl, { type GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { getWeather, WEATHER_STALE_TIME } from '@/lib/logistics';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const provinceColors = ['match', ['get', 'code'], '1', '#ad2867', '2', '#247146', '3', '#6956b9', '4', '#30866d', '5', '#6689bd', '6', '#c23569', '7', '#d66b24', '#5b7f9e'] as const;
const provinceShape: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: provinces.map((province) => ({ type: 'Feature', id: province.code, properties: { code: province.code, name: province.name }, geometry: { type: 'MultiPolygon', coordinates: province.polygons.map((ring) => [ring]) } })),
};
const initialWeatherShape: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: provinces.map((province) => ({ type: 'Feature', id: province.code, properties: { icon: '☁', name: province.name, label: `${province.name}\n…` }, geometry: { type: 'Point', coordinates: [province.center.longitude, province.center.latitude] } })),
};

export type MapCoordinate = { latitude: number; longitude: number };
type MapCanvasProps = { onLocationPick?: (coordinate: MapCoordinate) => void; selectedLocation?: MapCoordinate };

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
  const onLocationPickRef = useRef(onLocationPick);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const wide = width >= 900;
  const selectionMode = Boolean(onLocationPick);
  const weather = useQueries({ queries: provinces.map((province) => ({ queryKey: ['weather', 'province', province.code, language], queryFn: () => getWeather(province.center, language), enabled: !selectionMode, staleTime: WEATHER_STALE_TIME })) });
  const weatherShape = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: provinces.map((province, index) => {
      const current = weather[index].data;
      return { type: 'Feature', id: province.code, properties: { icon: weatherSymbol(current?.icon), name: province.name, label: `${province.name}\n${current ? `${current.temperature}°${current.temperatureUnit}` : '…'}` }, geometry: { type: 'Point', coordinates: [province.center.longitude, province.center.latitude] } };
    }),
  }), [weather]);

  useEffect(() => { onLocationPickRef.current = onLocationPick; }, [onLocationPick]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let loaded = false;
    const map = new mapboxgl.Map({ accessToken: MAPBOX_TOKEN, container: mapContainer.current, style: 'mapbox://styles/mapbox/outdoors-v12', center: [-84.12, 9.88], zoom: wide ? 7.37 : 6.67, minZoom: 5.7, maxZoom: selectionMode ? 19 : 10, dragRotate: false, pitchWithRotate: false, attributionControl: true });
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
      map.addLayer({ id: 'province-fills', type: 'fill', source: 'provinces', paint: { 'fill-color': [...provinceColors] as mapboxgl.Expression, 'fill-opacity': 0.78 } });
      map.addLayer({ id: 'province-halo', type: 'line', source: 'provinces', paint: { 'line-color': '#48c5df', 'line-opacity': 0.7, 'line-width': 6 } });
      map.addLayer({ id: 'province-lines', type: 'line', source: 'provinces', paint: { 'line-color': '#173f48', 'line-opacity': 1, 'line-width': 3 } });
      map.addSource('province-weather', { type: 'geojson', data: initialWeatherShape });
      map.addLayer({ id: 'province-weather-icons', type: 'symbol', source: 'province-weather', layout: { 'text-allow-overlap': true, 'text-field': ['get', 'icon'], 'text-offset': [0, -0.8], 'text-size': wide ? 34 : 25 }, paint: { 'text-color': '#ffd84d', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });
      map.addLayer({ id: 'province-weather-labels', type: 'symbol', source: 'province-weather', layout: { 'text-allow-overlap': true, 'text-field': ['get', 'label'], 'text-offset': [0, 1], 'text-size': wide ? 15 : 12 }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#173f48', 'text-halo-width': 2 } });
      const handleMapClick = (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
        if (onLocationPickRef.current) {
          onLocationPickRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
          return;
        }
        const feature = map.queryRenderedFeatures(event.point, { layers: ['province-weather-icons', 'province-weather-labels', 'province-fills'] })[0];
        const name = feature?.properties?.name as string | undefined;
        if (name) router.push({ pathname: '/(tabs)/catalog', params: { province: name } });
      };
      map.on('click', handleMapClick);
      map.on('mouseenter', 'province-fills', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'province-fills', () => { map.getCanvas().style.cursor = ''; });
    });
    map.on('error', () => { if (!loaded) setMapError(true); });
    return () => { locationMarkerRef.current?.remove(); locationMarkerRef.current = null; setMapReady(false); map.remove(); mapRef.current = null; };
  }, [router, selectionMode, wide]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!selectedLocation) {
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      return;
    }
    const marker = locationMarkerRef.current ?? new mapboxgl.Marker({ color: '#087443' });
    marker.setLngLat([selectedLocation.longitude, selectedLocation.latitude]).addTo(map);
    locationMarkerRef.current = marker;
  }, [mapReady, selectedLocation]);

  useEffect(() => () => { locationMarkerRef.current?.remove(); }, []);

  useEffect(() => { if (!selectionMode) (mapRef.current?.getSource('province-weather') as GeoJSONSource | undefined)?.setData(weatherShape); }, [selectionMode, weatherShape]);

  return (
    <View className="relative overflow-hidden bg-ui-secondary dark:bg-ui-dark-secondary" style={{ borderColor: '#56c7e9', borderRadius: wide ? 28 : 0, borderWidth: 2, boxShadow: '0 10px 28px rgba(7, 72, 94, 0.28)', height: wide ? 530 : 460 }}>
      <div ref={mapContainer} style={{ height: '100%', inset: 0, position: 'absolute', width: '100%' }} />
      {!mapReady ? <View className="absolute inset-0 items-center justify-center bg-[#dff4f4]"><MaterialCommunityIcons name={mapError ? 'map-marker-off-outline' : 'map-search-outline'} color="#087443" size={34} /><Text className="mt-2 px-8 text-center font-bold text-forest-700">{mapError ? (language === 'es' ? 'No se pudo cargar Mapbox. Revisá el token o la conexión.' : 'Mapbox could not load. Check the token or connection.') : (language === 'es' ? 'Cargando mapa de Costa Rica…' : 'Loading Costa Rica map…')}</Text></View> : null}
    </View>
  );
}
