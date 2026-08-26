import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Marker, Polygon, type Region } from 'react-native-maps';

import { getPlacesInBounds, type MapPlace } from '@/lib/places';
import { provinces, type Province } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const initialPlaces: MapPlace[] = [
  { id: '2', name: 'La Fortuna', province: 'Alajuela', category: 'Naturaleza', latitude: 10.4709, longitude: -84.6453 },
  { id: '1', name: 'Teatro Nacional', province: 'San José', category: 'Cultura', latitude: 9.933, longitude: -84.077 },
  { id: '3', name: 'Volcán Irazú', province: 'Cartago', category: 'Aventura', latitude: 9.976, longitude: -83.853 },
  { id: '4', name: 'Sarapiquí', province: 'Heredia', category: 'Naturaleza', latitude: 10.454, longitude: -84.016 },
  { id: '5', name: 'Tamarindo', province: 'Guanacaste', category: 'Playa', latitude: 10.299, longitude: -85.838 },
  { id: '6', name: 'Monteverde', province: 'Puntarenas', category: 'Bosque nuboso', latitude: 10.3009, longitude: -84.8255 },
  { id: '7', name: 'Puerto Viejo', province: 'Limón', category: 'Caribe', latitude: 9.658, longitude: -82.753 },
];

const initialRegion: Region = { latitude: 9.88, longitude: -84.12, latitudeDelta: 3.5, longitudeDelta: 3.5 };
const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CR');
const provincePolygons = provinces.flatMap((province) => province.polygons.map((ring, index) => ({
  coordinates: ring.map(([longitude, latitude]) => ({ latitude, longitude })),
  id: `${province.code}-${index}`,
  province,
})));

export function MapCanvas() {
  const { isDark, requireAuth, t } = useApp();
  const mapRef = useRef<MapView>(null);
  const [places, setPlaces] = useState(initialPlaces);
  const [selected, setSelected] = useState(initialPlaces[0]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>();

  useEffect(() => {
    getPlacesInBounds({ minLat: 8, minLng: -86, maxLat: 11.3, maxLng: -82.3 })
      .then((data) => { if (data.length) setPlaces(data); })
      .catch(() => undefined);
  }, []);

  const focusProvince = useCallback((province?: Province) => {
    setSelectedProvinceCode(province?.code);
    if (!province) {
      mapRef.current?.animateToRegion(initialRegion, 500);
      setSelected(places[0] ?? initialPlaces[0]);
      return;
    }
    const { bounds } = province;
    mapRef.current?.fitToCoordinates([
      { latitude: bounds.minLatitude, longitude: bounds.minLongitude },
      { latitude: bounds.maxLatitude, longitude: bounds.maxLongitude },
    ], { animated: true, edgePadding: { top: 125, right: 36, bottom: 120, left: 36 } });
    const provincePlace = places.find((place) => normalizeName(place.province) === normalizeName(province.name));
    if (provincePlace) setSelected(provincePlace);
  }, [places]);

  return (
    <View className="h-[430px] overflow-hidden rounded-[30px] border border-mint-200 bg-mint-100 dark:border-forest-700 dark:bg-forest-900">
      <MapView
        initialRegion={initialRegion}
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {provincePolygons.map(({ coordinates, id, province }) => (
          <Polygon
            coordinates={coordinates}
            fillColor={province.code === selectedProvinceCode ? 'rgba(255, 93, 82, 0.30)' : 'rgba(8, 116, 67, 0.12)'}
            key={id}
            onPress={() => focusProvince(province)}
            strokeColor={province.code === selectedProvinceCode ? '#ff5d52' : '#087443'}
            strokeWidth={province.code === selectedProvinceCode ? 3 : 1}
            tappable
          />
        ))}
        {places.map((place) => (
          <Marker
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            key={place.id}
            onPress={() => setSelected(place)}
            pinColor={place.id === selected.id ? '#ff5d52' : '#087443'}
            title={place.name}
          />
        ))}
      </MapView>
      <View className="absolute left-4 right-4 top-4 flex-row items-center rounded-2xl bg-white/95 px-4 py-3 dark:bg-forest-900/95">
        <MaterialCommunityIcons name="magnify" size={23} color="#0b5b3c" />
        <Text className="ml-3 flex-1 text-base text-forest-500 dark:text-mint-200">{t('discover')}</Text>
        <MaterialCommunityIcons name="tune-variant" size={22} color="#0b5b3c" />
      </View>
      <ScrollView
        className="absolute left-0 right-0 top-[72px]"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <ProvinceChip label={t('allCR')} onPress={() => focusProvince()} selected={!selectedProvinceCode} />
        {provinces.map((province) => (
          <ProvinceChip
            key={province.code}
            label={province.name}
            onPress={() => focusProvince(province)}
            selected={province.code === selectedProvinceCode}
          />
        ))}
      </ScrollView>
      <View className="absolute bottom-4 left-4 right-4 flex-row items-center rounded-2xl bg-white p-4 shadow-lg dark:bg-forest-900">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-frog-100 dark:bg-forest-700">
          <MaterialCommunityIcons name="map-marker-radius" size={25} color="#087443" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-black text-forest-950 dark:text-white">{selected.name}</Text>
          <Text className="mt-0.5 text-sm text-forest-500 dark:text-mint-300">{selected.province} · {selected.category}</Text>
        </View>
        <Pressable accessibilityLabel={t('save')} accessibilityRole="button" hitSlop={10} onPress={() => requireAuth(selected.name)}>
          <MaterialCommunityIcons name="heart-outline" size={27} color="#ff5d52" />
        </Pressable>
      </View>
    </View>
  );
}

function ProvinceChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-3 py-2 ${selected ? 'border-coral-500 bg-coral-500' : 'border-mint-200 bg-white/95 dark:border-forest-600 dark:bg-forest-900/95'}`}
      onPress={onPress}
    >
      <Text className={`text-xs font-extrabold ${selected ? 'text-white' : 'text-forest-800 dark:text-mint-100'}`}>{label}</Text>
    </Pressable>
  );
}
