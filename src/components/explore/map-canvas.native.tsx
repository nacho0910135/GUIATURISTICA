import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, Polygon, type Region } from 'react-native-maps';

import { getWeather, WEATHER_STALE_TIME } from '@/lib/logistics';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const provinceColors = ['#2A7B4C', '#1E5B75', '#4A9874', '#326F8B', '#82B99C', '#568BA4', '#1E6038'];
const cleanMapStyle = [{ elementType: 'labels', stylers: [{ visibility: 'off' }] }];
const initialRegion: Region = { latitude: 9.65, longitude: -84.25, latitudeDelta: 5.8, longitudeDelta: 5.8 };

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
  const wide = width >= 900;
  const selectionMode = Boolean(onLocationPick);
  const mapRegion = useMemo<Region>(() => ({ ...initialRegion, latitudeDelta: wide ? 3.04 : 2.72, longitudeDelta: wide ? 3.04 : 2.72 }), [wide]);
  const [region, setRegion] = useState<Region>(mapRegion);
  const [mapSize, setMapSize] = useState({ height: 0, width: 0 });
  useEffect(() => {
    setRegion(mapRegion);
  }, [mapRegion]);
  const weather = useQueries({ queries: provinces.map((province) => ({
    queryKey: ['weather', 'province', province.code, language],
    queryFn: () => getWeather(province.center, language),
    enabled: !selectionMode,
    staleTime: WEATHER_STALE_TIME,
  })) });
  const openProvince = (name: string) => router.push({ pathname: '/(aux)/province', params: { province: name } });

  return (
    <View
      className="overflow-hidden bg-ui-secondary dark:bg-ui-dark-secondary"
      onLayout={({ nativeEvent }) => setMapSize({ height: nativeEvent.layout.height, width: nativeEvent.layout.width })}
      style={{ borderColor: '#1E5B75', borderRadius: wide ? 28 : 0, borderWidth: 2, height: wide ? 371 : 322, position: 'relative' }}
    >
      <MapView
        key={wide ? 'wide-3.04-v7' : 'mobile-2.72-v7'}
        initialRegion={mapRegion}
        mapType="standard"
        customMapStyle={selectionMode ? undefined : cleanMapStyle}
        maxZoomLevel={19}
        minZoomLevel={5}
        onPress={onLocationPick ? ({ nativeEvent }) => onLocationPick(nativeEvent.coordinate) : undefined}
        onRegionChangeComplete={setRegion}
        region={region}
        rotateEnabled={false}
        style={StyleSheet.absoluteFill}
      >
        {selectedLocation ? <Marker coordinate={selectedLocation} pinColor="#F26A44" /> : null}
        {!selectionMode ? provinces.flatMap((province, provinceIndex) => province.polygons.map((ring, ringIndex) => (
          <Polygon
            key={`${province.code}-${ringIndex}`}
            coordinates={ring.map(([longitude, latitude]) => ({ latitude, longitude }))}
            fillColor={`${provinceColors[provinceIndex]}b8`}
            onPress={onLocationPick ? undefined : () => openProvince(province.name)}
            strokeColor="#1E5B75"
            strokeWidth={3}
            tappable
          />
        ))) : null}
      </MapView>
      {!selectionMode ? <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {mapSize.width > 0 && mapSize.height > 0 ? provinces.map((province, index) => {
          const current = weather[index].data;
          const left = ((province.center.longitude - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta) * mapSize.width;
          const top = ((region.latitude + region.latitudeDelta / 2 - province.center.latitude) / region.latitudeDelta) * mapSize.height;
          return (
            <Pressable
              key={province.code}
              accessibilityLabel={`Ver provincia ${province.name}`}
              onPress={() => openProvince(province.name)}
              style={{ left, position: 'absolute', top, transform: [{ translateX: -56 }, { translateY: -35 }] }}
            >
              <Text
                allowFontScaling={false}
                numberOfLines={3}
                style={{ backgroundColor: '#1E5B75ee', borderColor: '#F8F6F0cc', borderRadius: 14, borderWidth: 1, color: '#F8F6F0', fontSize: wide ? 15 : 12, fontWeight: '700', includeFontPadding: true, lineHeight: wide ? 19 : 16, paddingHorizontal: wide ? 10 : 7, paddingVertical: wide ? 7 : 5, textAlign: 'center', textShadowColor: '#1E5B75', textShadowRadius: 3 }}
              >
                <Text style={{ color: '#F26A44', fontSize: wide ? 28 : 21 }}>{weatherSymbol(current?.icon)}</Text>
                {'\n'}{province.name}{'\n'}{current ? `${current.temperature}°${current.temperatureUnit}` : '…'}
              </Text>
            </Pressable>
          );
        }) : null}
      </View> : null}
      {!selectionMode && weather.every(({ isPending }) => isPending) ? <View className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 p-2"><ActivityIndicator color="#2A7B4C" /></View> : null}
    </View>
  );
}
