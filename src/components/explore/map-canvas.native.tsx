import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  StyleURL,
  setAccessToken,
  type Camera as CameraRef,
} from '@rnmapbox/maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import districtsJson from '@/data/districts.json';
import { getPlacesInBounds, type MapPlace } from '@/lib/places';
import { provinces, type Province } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  ?? 'pk.eyJ1IjoibmFjaG8wOTEwIiwiYSI6ImNtbjFiMGV5MzB1cXEycHB3NWdtZmdzb3gifQ.8cnnBhtxbBFyxnLrx8JVdg';

void setAccessToken(MAPBOX_TOKEN);

const initialPlaces: MapPlace[] = [
  { id: '2', name: 'La Fortuna', province: 'Alajuela', category: 'Naturaleza', latitude: 10.4709, longitude: -84.6453 },
  { id: '1', name: 'Teatro Nacional', province: 'San José', category: 'Cultura', latitude: 9.933, longitude: -84.077 },
  { id: '3', name: 'Volcán Irazú', province: 'Cartago', category: 'Aventura', latitude: 9.976, longitude: -83.853 },
  { id: '4', name: 'Sarapiquí', province: 'Heredia', category: 'Naturaleza', latitude: 10.454, longitude: -84.016 },
  { id: '5', name: 'Tamarindo', province: 'Guanacaste', category: 'Playa', latitude: 10.299, longitude: -85.838 },
  { id: '6', name: 'Monteverde', province: 'Puntarenas', category: 'Naturaleza', latitude: 10.3009, longitude: -84.8255 },
  { id: '7', name: 'Puerto Viejo', province: 'Limón', category: 'Playa', latitude: 9.658, longitude: -82.753 },
];

type DistrictProperties = { code: string; provinceCode: string; province: string; canton: string; district: string };
type SelectedItem = { name: string; province: string; category: string; photo: number | null };
type MapCanvasProps = { activityFilter?: string };

const districtShape = districtsJson as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, DistrictProperties>;
const provinceShape: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, { code: string; name: string }> = {
  type: 'FeatureCollection',
  features: provinces.map((province) => ({
    type: 'Feature',
    id: province.code,
    properties: { code: province.code, name: province.name },
    geometry: { type: 'MultiPolygon', coordinates: province.polygons.map((ring) => [ring]) },
  })),
};

const provinceColors = [
  'match', ['get', 'provinceCode'],
  '1', '#bdebcf', '2', '#d0efd1', '3', '#c8e7ca', '4', '#d7efc6',
  '5', '#c8edc9', '6', '#c7e7d4', '7', '#c9eee1', '#d9efdc',
] as const;

function imageFor(category: string) {
  if (category === 'Playa') return require('@/assets/destinations/beach.jpg');
  if (category === 'Cultura') return require('@/assets/destinations/culture.jpg');
  if (category === 'Aventura') return require('@/assets/destinations/volcano.jpg');
  return require('@/assets/destinations/waterfall.jpg');
}

export function MapCanvas({ activityFilter = '' }: MapCanvasProps) {
  const { language, requireAuth, t } = useApp();
  const { width } = useWindowDimensions();
  const cameraRef = useRef<CameraRef>(null);
  const [places, setPlaces] = useState(initialPlaces);
  const [selected, setSelected] = useState<SelectedItem>({ name: 'La Fortuna', province: 'Alajuela', category: 'Naturaleza', photo: imageFor('Naturaleza') });
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
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

  const placeShape = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, MapPlace>>(() => ({
    type: 'FeatureCollection',
    features: visiblePlaces.map((place) => ({
      type: 'Feature',
      id: place.id,
      properties: place,
      geometry: { type: 'Point', coordinates: [place.longitude, place.latitude] },
    })),
  }), [visiblePlaces]);

  const focusProvince = (province?: Province) => {
    setShowFilters(false);
    setSelectedDistrictCode('');
    if (!province) {
      cameraRef.current?.setCamera({ centerCoordinate: [-84.12, 9.88], zoomLevel: wide ? 7.05 : 6.35, animationDuration: 600 });
      return;
    }
    const { bounds } = province;
    cameraRef.current?.fitBounds([bounds.maxLongitude, bounds.maxLatitude], [bounds.minLongitude, bounds.minLatitude], [90, 36, 72, 36], 650);
  };

  const search = () => {
    const match = places.find((place) => place.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    if (!match) return;
    setSelected({ name: match.name, province: match.province, category: match.category, photo: imageFor(match.category) });
    setSelectedDistrictCode('');
    cameraRef.current?.setCamera({ centerCoordinate: [match.longitude, match.latitude], zoomLevel: 10.5, animationDuration: 650 });
  };

  const locate = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return focusProvince();
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    cameraRef.current?.setCamera({ centerCoordinate: [location.coords.longitude, location.coords.latitude], zoomLevel: 11.5, animationDuration: 700 });
  };

  return (
    <View className="overflow-hidden bg-sky-100" style={{ borderRadius: wide ? 28 : 0, height: wide ? 530 : 460 }}>
      <MapView
        attributionPosition={{ bottom: 8, right: 8 }}
        compassEnabled
        logoPosition={{ bottom: 8, left: 76 }}
        onDidFinishLoadingMap={() => { setMapReady(true); setMapError(false); }}
        onMapLoadingError={() => setMapError(true)}
        scaleBarEnabled={false}
        style={{ height: '100%', width: '100%' }}
        styleURL={StyleURL.Outdoors}
      >
        <Camera ref={cameraRef} centerCoordinate={[-84.12, 9.88]} zoomLevel={wide ? 7.05 : 6.35} minZoomLevel={5.7} maxZoomLevel={15} />

        <ShapeSource
          id="cr-districts"
          shape={districtShape}
          tolerance={0.45}
          onPress={(event) => {
            const properties = event.features[0]?.properties as DistrictProperties | undefined;
            if (!properties) return;
            setSelectedDistrictCode(properties.code);
            setSelected({ name: properties.district, province: `${properties.canton} · ${properties.province}`, category: language === 'es' ? 'Distrito' : 'District', photo: null });
          }}
        >
          <FillLayer id="district-fills" style={{ fillColor: provinceColors, fillOpacity: 0.34 }} />
          <LineLayer id="district-halo" style={{ lineColor: '#ffffff', lineOpacity: 0.9, lineWidth: 3.6 }} />
          <LineLayer id="district-lines" style={{ lineColor: '#1b704b', lineOpacity: 0.72, lineWidth: 1.8 }} />
          <FillLayer id="selected-district-fill" filter={['==', ['get', 'code'], selectedDistrictCode]} style={{ fillColor: '#ff5d52', fillOpacity: 0.46 }} />
          <LineLayer id="selected-district-line" filter={['==', ['get', 'code'], selectedDistrictCode]} style={{ lineColor: '#ff5d52', lineWidth: 4.5 }} />
        </ShapeSource>

        <ShapeSource id="cr-provinces" shape={provinceShape}>
          <LineLayer id="province-halo" style={{ lineColor: '#ffffff', lineOpacity: 0.92, lineWidth: 5.5 }} />
          <LineLayer id="province-lines" style={{ lineColor: '#07563d', lineOpacity: 0.9, lineWidth: 3 }} />
        </ShapeSource>

        <ShapeSource
          id="places"
          shape={placeShape}
          hitbox={{ width: 44, height: 44 }}
          onPress={(event) => {
            const place = event.features[0]?.properties as MapPlace | undefined;
            if (!place) return;
            setSelectedDistrictCode('');
            setSelected({ name: place.name, province: place.province, category: place.category, photo: imageFor(place.category) });
          }}
        >
          <CircleLayer id="place-dots" style={{ circleColor: ['match', ['get', 'category'], 'Playa', '#159ed1', 'Cultura', '#ff5d52', '#087443'], circleRadius: 8.5, circleStrokeColor: '#ffffff', circleStrokeWidth: 3 }} />
        </ShapeSource>
      </MapView>

      {!mapReady ? (
        <View className="absolute inset-0 items-center justify-center bg-[#dff4f4]">
          {mapError ? <Text className="px-8 text-center font-bold text-coral-600">{language === 'es' ? 'No se pudo cargar Mapbox. Revisá la conexión.' : 'Mapbox could not load. Check the connection.'}</Text> : <ActivityIndicator size="large" color="#087443" />}
        </View>
      ) : null}

      <View className="absolute left-4 right-4 top-4 flex-row items-center rounded-[20px] bg-white px-4 py-2.5" style={{ shadowColor: '#123c2c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12 }}>
        <MaterialCommunityIcons name="magnify" size={24} color="#0b5b3c" />
        <TextInput accessibilityLabel={t('discover')} className="ml-3 flex-1 py-1 text-base text-forest-950" onChangeText={setQuery} onSubmitEditing={search} placeholder={t('discover')} placeholderTextColor="#82908a" returnKeyType="search" value={query} />
        <Pressable accessibilityLabel={language === 'es' ? 'Filtrar por provincia' : 'Filter by province'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-forest-600" onPress={() => setShowFilters((value) => !value)}>
          <MaterialCommunityIcons name="tune-variant" size={23} color="white" />
        </Pressable>
      </View>

      {showFilters ? (
        <ScrollView className="absolute left-0 right-0 top-[82px]" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} horizontal showsHorizontalScrollIndicator={false}>
          <ProvinceChip label={language === 'es' ? 'Todo CR' : 'All CR'} onPress={() => focusProvince()} />
          {provinces.map((province) => <ProvinceChip key={province.code} label={province.name} onPress={() => focusProvince(province)} />)}
        </ScrollView>
      ) : null}

      {selected.photo ? (
        <View className="absolute right-4 top-[92px] w-40 overflow-hidden rounded-[20px] border-2 border-white bg-white" style={{ shadowColor: '#123c2c', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 12 }}>
          <Image contentFit="cover" source={selected.photo} style={{ height: 94, width: '100%' }} transition={180} />
          <Pressable accessibilityLabel={t('save')} accessibilityRole="button" className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-white" onPress={() => requireAuth(selected.name)}>
            <MaterialCommunityIcons name="heart-outline" size={21} color="#087443" />
          </Pressable>
          <View className="px-3 py-2.5"><Text className="font-black text-forest-950" numberOfLines={1}>{selected.name}</Text><Text className="text-xs text-forest-600" numberOfLines={1}>{selected.province}</Text><Text className="mt-1 text-xs font-bold text-forest-700" numberOfLines={1}>⌖ {selected.category}</Text></View>
        </View>
      ) : (
        <View className="absolute bottom-9 left-20 right-20 rounded-2xl bg-white px-4 py-3"><Text className="text-center font-black text-forest-950" numberOfLines={1}>{selected.name}</Text><Text className="text-center text-xs text-forest-600" numberOfLines={1}>{selected.province}</Text></View>
      )}

      <View className="absolute bottom-9 left-4 right-4 flex-row justify-between">
        <MapButton icon="crosshairs-gps" label={language === 'es' ? 'Usar mi ubicación' : 'Use my location'} onPress={locate} />
        <MapButton icon="navigation-variant-outline" label={language === 'es' ? 'Ver Costa Rica' : 'View Costa Rica'} onPress={() => focusProvince()} />
      </View>
    </View>
  );
}

function ProvinceChip({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" className="rounded-full border border-mint-200 bg-white px-3 py-2 shadow-sm" onPress={onPress}><Text className="text-xs font-extrabold text-forest-800">{label}</Text></Pressable>;
}

function MapButton({ icon, label, onPress }: { icon: 'crosshairs-gps' | 'navigation-variant-outline'; label: string; onPress: () => void | Promise<void> }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-white" onPress={onPress} style={{ shadowColor: '#123c2c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 }}><MaterialCommunityIcons name={icon} size={24} color="#087443" /></Pressable>;
}
