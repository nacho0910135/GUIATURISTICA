import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import mapboxgl, { type GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import districtsJson from '@/data/districts.json';
import { getPlacesInBounds, type MapPlace } from '@/lib/places';
import { provinces, type Province } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  ?? 'pk.eyJ1IjoibmFjaG8wOTEwIiwiYSI6ImNtbjFiMGV5MzB1cXEycHB3NWdtZmdzb3gifQ.8cnnBhtxbBFyxnLrx8JVdg';

const initialPlaces: MapPlace[] = [
  { id: '2', name: 'La Fortuna', province: 'Alajuela', category: 'Naturaleza', latitude: 10.4709, longitude: -84.6453 },
  { id: '1', name: 'Teatro Nacional', province: 'San José', category: 'Cultura', latitude: 9.933, longitude: -84.077 },
  { id: '3', name: 'Volcán Irazú', province: 'Cartago', category: 'Aventura', latitude: 9.976, longitude: -83.853 },
  { id: '4', name: 'Sarapiquí', province: 'Heredia', category: 'Naturaleza', latitude: 10.454, longitude: -84.016 },
  { id: '5', name: 'Tamarindo', province: 'Guanacaste', category: 'Playa', latitude: 10.299, longitude: -85.838 },
  { id: '6', name: 'Monteverde', province: 'Puntarenas', category: 'Naturaleza', latitude: 10.3009, longitude: -84.8255 },
  { id: '7', name: 'Puerto Viejo', province: 'Limón', category: 'Playa', latitude: 9.658, longitude: -82.753 },
];

const provinceShape: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: provinces.map((province) => ({
    type: 'Feature',
    id: province.code,
    properties: { code: province.code, name: province.name },
    geometry: { type: 'MultiPolygon', coordinates: province.polygons.map((ring) => [ring]) },
  })),
};

type SelectedItem = { name: string; province: string; category: string };
type MapCanvasProps = { activityFilter?: string };

function placesGeoJson(places: MapPlace[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: places.map((place) => ({
      type: 'Feature',
      id: place.id,
      properties: place,
      geometry: { type: 'Point', coordinates: [place.longitude, place.latitude] },
    })),
  };
}

function imageFor(category: string) {
  if (category === 'Playa') return require('@/assets/destinations/beach.jpg');
  if (category === 'Cultura') return require('@/assets/destinations/culture.jpg');
  if (category === 'Aventura') return require('@/assets/destinations/volcano.jpg');
  return require('@/assets/destinations/waterfall.jpg');
}

export function MapCanvas({ activityFilter = '' }: MapCanvasProps) {
  const { language, requireAuth, t } = useApp();
  const { width } = useWindowDimensions();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [places, setPlaces] = useState(initialPlaces);
  const [selected, setSelected] = useState<SelectedItem>({ name: 'La Fortuna', province: 'Alajuela', category: 'Naturaleza' });
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const wide = width >= 900;
  const visiblePlaces = useMemo(() => activityFilter ? places.filter((place) => place.category === activityFilter) : places, [activityFilter, places]);

  useEffect(() => {
    getPlacesInBounds({ minLat: 8, minLng: -86, maxLat: 11.3, maxLng: -82.3 })
      .then((data) => { if (data.length) setPlaces(data); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let loaded = false;
    const map = new mapboxgl.Map({
      accessToken: MAPBOX_TOKEN,
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-84.12, 9.88],
      zoom: wide ? 7.05 : 6.35,
      minZoom: 5.7,
      maxZoom: 15,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: true,
    });
    map.scrollZoom.disable();
    mapRef.current = map;

    map.on('load', () => {
      loaded = true;
      setMapReady(true);
      setMapError(false);
      map.addSource('districts', { type: 'geojson', data: districtsJson as GeoJSON.FeatureCollection, tolerance: 0.45 });
      map.addLayer({ id: 'district-fills', type: 'fill', source: 'districts', paint: { 'fill-color': ['match', ['get', 'provinceCode'], '1', '#bdebcf', '2', '#d0efd1', '3', '#c8e7ca', '4', '#d7efc6', '5', '#c8edc9', '6', '#c7e7d4', '7', '#c9eee1', '#d9efdc'], 'fill-opacity': 0.34 } });
      map.addLayer({ id: 'district-lines', type: 'line', source: 'districts', paint: { 'line-color': '#ffffff', 'line-opacity': 0.9, 'line-width': 1.4 } });
      map.addSource('provinces', { type: 'geojson', data: provinceShape });
      map.addLayer({ id: 'province-lines', type: 'line', source: 'provinces', paint: { 'line-color': '#1b704b', 'line-opacity': 0.82, 'line-width': 2.5 } });
      map.addSource('places', { type: 'geojson', data: placesGeoJson(initialPlaces) });
      map.addLayer({ id: 'place-dots', type: 'circle', source: 'places', paint: { 'circle-color': ['match', ['get', 'category'], 'Playa', '#159ed1', 'Cultura', '#ff5d52', '#087443'], 'circle-radius': 9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });

      map.on('click', 'place-dots', (event) => {
        const properties = event.features?.[0]?.properties as MapPlace | undefined;
        if (!properties) return;
        setSelected({ name: properties.name, province: properties.province, category: properties.category });
      });
      map.on('click', 'district-fills', (event) => {
        const properties = event.features?.[0]?.properties as { district?: string; canton?: string; province?: string } | undefined;
        if (!properties?.district) return;
        setSelected({ name: properties.district, province: `${properties.canton ?? ''} · ${properties.province ?? ''}`, category: language === 'es' ? 'Distrito' : 'District' });
      });
      map.on('mouseenter', 'place-dots', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'place-dots', () => { map.getCanvas().style.cursor = ''; });
    });
    map.on('error', () => { if (!loaded) setMapError(true); });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [language, wide]);

  useEffect(() => {
    const source = mapRef.current?.getSource('places') as GeoJSONSource | undefined;
    source?.setData(placesGeoJson(visiblePlaces));
  }, [visiblePlaces]);

  const focusProvince = (province?: Province) => {
    setShowFilters(false);
    if (!province) {
      mapRef.current?.flyTo({ center: [-84.12, 9.88], zoom: wide ? 7.05 : 6.35, duration: 650 });
      return;
    }
    mapRef.current?.fitBounds([[province.bounds.minLongitude, province.bounds.minLatitude], [province.bounds.maxLongitude, province.bounds.maxLatitude]], { padding: 54, duration: 650 });
  };

  const search = () => {
    const match = places.find((place) => place.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    if (!match) return;
    setSelected({ name: match.name, province: match.province, category: match.category });
    mapRef.current?.flyTo({ center: [match.longitude, match.latitude], zoom: 10.5, duration: 650 });
  };

  const locate = () => {
    const fallback = () => focusProvince();
    if (!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 11.5, duration: 700 }),
      fallback,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <View className="relative overflow-hidden bg-sky-100" style={{ height: wide ? 530 : 460, borderRadius: wide ? 28 : 0 }}>
      <div ref={mapContainer} style={{ height: '100%', inset: 0, position: 'absolute', width: '100%' }} />

      {!mapReady ? (
        <View className="absolute inset-0 items-center justify-center bg-[#dff4f4]">
          <MaterialCommunityIcons name={mapError ? 'map-marker-off-outline' : 'map-search-outline'} color="#087443" size={34} />
          <Text className="mt-2 px-8 text-center font-bold text-forest-700">{mapError ? (language === 'es' ? 'No se pudo cargar Mapbox. Revisá el token o la conexión.' : 'Mapbox could not load. Check the token or connection.') : (language === 'es' ? 'Cargando mapa de Costa Rica…' : 'Loading Costa Rica map…')}</Text>
        </View>
      ) : null}

      <View className="absolute left-4 right-4 top-4 z-10 flex-row items-center rounded-[20px] bg-white px-4 py-2.5" style={{ shadowColor: '#123c2c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12 }}>
        <MaterialCommunityIcons name="magnify" size={24} color="#0b5b3c" />
        <TextInput accessibilityLabel={t('discover')} className="ml-3 flex-1 py-1 text-base text-forest-950 outline-none" onChangeText={setQuery} onSubmitEditing={search} placeholder={t('discover')} placeholderTextColor="#82908a" returnKeyType="search" value={query} />
        <Pressable accessibilityLabel={language === 'es' ? 'Filtrar por provincia' : 'Filter by province'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-forest-600" onPress={() => setShowFilters((value) => !value)}>
          <MaterialCommunityIcons name="tune-variant" size={23} color="white" />
        </Pressable>
      </View>

      {showFilters ? (
        <ScrollView className="absolute left-0 right-0 top-[82px] z-10" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} horizontal showsHorizontalScrollIndicator={false}>
          <ProvinceChip label={language === 'es' ? 'Todo CR' : 'All CR'} onPress={() => focusProvince()} />
          {provinces.map((province) => <ProvinceChip key={province.code} label={province.name} onPress={() => focusProvince(province)} />)}
        </ScrollView>
      ) : null}

      <View className="absolute right-4 top-[92px] z-10 w-40 overflow-hidden rounded-[20px] border-2 border-white bg-white" style={{ shadowColor: '#123c2c', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 12 }}>
        <Image contentFit="cover" source={imageFor(selected.category)} style={{ height: 94, width: '100%' }} transition={180} />
        <Pressable accessibilityLabel={t('save')} accessibilityRole="button" className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-white" onPress={() => requireAuth(selected.name)}>
          <MaterialCommunityIcons name="heart-outline" size={21} color="#087443" />
        </Pressable>
        <View className="px-3 py-2.5"><Text className="font-black text-forest-950" numberOfLines={1}>{selected.name}</Text><Text className="text-xs text-forest-600" numberOfLines={1}>{selected.province}</Text><Text className="mt-1 text-xs font-bold text-forest-700" numberOfLines={1}>⌖ {selected.category}</Text></View>
      </View>

      <View className="absolute bottom-9 left-4 right-4 z-10 flex-row justify-between">
        <MapButton icon="crosshairs-gps" label={language === 'es' ? 'Usar mi ubicación' : 'Use my location'} onPress={locate} />
        <MapButton icon="navigation-variant-outline" label={language === 'es' ? 'Ver Costa Rica' : 'View Costa Rica'} onPress={() => focusProvince()} />
      </View>
    </View>
  );
}

function ProvinceChip({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" className="rounded-full border border-mint-200 bg-white px-3 py-2 shadow-sm" onPress={onPress}><Text className="text-xs font-extrabold text-forest-800">{label}</Text></Pressable>;
}

function MapButton({ icon, label, onPress }: { icon: 'crosshairs-gps' | 'navigation-variant-outline'; label: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-white" onPress={onPress} style={{ shadowColor: '#123c2c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 }}><MaterialCommunityIcons name={icon} size={24} color="#087443" /></Pressable>;
}
