import Mapbox from '@rnmapbox/maps';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FrogLoader } from '@/components/frog-loader';
import { getWeather, WEATHER_STALE_TIME } from '@/lib/logistics';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
Mapbox.setAccessToken(MAPBOX_TOKEN);

const provinceColors = ['#2A7B4C', '#1E5B75', '#4A9874', '#326F8B', '#82B99C', '#568BA4', '#1E6038'];
const provinceShape: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: provinces.map((province) => ({
    type: 'Feature',
    id: province.code,
    properties: { code: province.code, color: provinceColors[Number(province.code) - 1], name: province.name },
    geometry: { type: 'MultiPolygon', coordinates: province.polygons.map((ring) => [ring]) },
  })),
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

export const MapCanvas = memo(function MapCanvas({ onLocationPick, selectedLocation }: MapCanvasProps = {}) {
  const { language } = useApp();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const wide = width >= 900;
  const selectionMode = Boolean(onLocationPick);
  const weather = useQueries({ queries: provinces.map((province) => ({
    queryKey: ['weather', 'province', province.code, language],
    queryFn: () => getWeather(province.center, language),
    enabled: !selectionMode,
    staleTime: WEATHER_STALE_TIME,
  })) });
  const openProvince = useCallback((name: string) => router.push({ pathname: '/(aux)/province', params: { province: name } }), [router]);
  const handleMapPress = useCallback((feature: GeoJSON.Feature) => {
    if (!onLocationPick || feature.geometry.type !== 'Point') return;
    const [longitude, latitude] = feature.geometry.coordinates;
    onLocationPick({ latitude, longitude });
  }, [onLocationPick]);
  const handleProvincePress = useCallback((event: { features: GeoJSON.Feature[] }) => {
    const name = event.features[0]?.properties?.name;
    if (typeof name === 'string') openProvince(name);
  }, [openProvince]);
  const weatherAnnotations = useMemo(() => selectionMode ? null : provinces.map((province, index) => {
    const current = weather[index].data;
    return (
      <Mapbox.PointAnnotation id={`province-${province.code}`} key={province.code} coordinate={[province.center.longitude, province.center.latitude]} onSelected={() => openProvince(province.name)}>
        <View collapsable={false} style={styles.weatherMarker}>
          <Text allowFontScaling={false} style={[styles.weatherIcon, { fontSize: wide ? 28 : 21 }]}>{weatherSymbol(current?.icon)}</Text>
          <Text allowFontScaling={false} numberOfLines={2} style={[styles.weatherLabel, { fontSize: wide ? 15 : 12, lineHeight: wide ? 19 : 16 }]}>
            {province.name}{'\n'}{current ? `${current.temperature}°${current.temperatureUnit}` : '…'}
          </Text>
        </View>
      </Mapbox.PointAnnotation>
    );
  }), [openProvince, selectionMode, weather, wide]);

  return (
    <View className="overflow-hidden bg-ui-secondary dark:bg-ui-dark-secondary" style={{ borderColor: '#1E5B75', borderRadius: wide ? 28 : 0, borderWidth: 2, height: wide ? 371 : 322, position: 'relative' }}>
      <Mapbox.MapView attributionEnabled compassEnabled={false} logoEnabled onPress={onLocationPick ? handleMapPress : undefined} pitchEnabled={false} rotateEnabled={false} scaleBarEnabled={false} style={StyleSheet.absoluteFill} styleURL={Mapbox.StyleURL.Outdoors}>
        <Mapbox.Camera defaultSettings={{ centerCoordinate: [-84.12, 9.88], zoomLevel: wide ? 7.37 : 6.67 }} maxZoomLevel={selectionMode ? 19 : 10} minZoomLevel={5} />
        {!selectionMode ? (
          <Mapbox.ShapeSource id="provinces" shape={provinceShape} onPress={handleProvincePress}>
            <Mapbox.FillLayer id="province-fills" style={{ fillColor: ['get', 'color'], fillOpacity: 0.72 }} />
            <Mapbox.LineLayer id="province-halo" style={{ lineColor: '#F8F6F0', lineOpacity: 0.8, lineWidth: 6 }} />
            <Mapbox.LineLayer id="province-lines" style={{ lineColor: '#1E5B75', lineWidth: 3 }} />
          </Mapbox.ShapeSource>
        ) : null}
        {selectedLocation ? (
          <Mapbox.PointAnnotation id="selected-location" coordinate={[selectedLocation.longitude, selectedLocation.latitude]}>
            <View collapsable={false} style={styles.selectedMarker} />
          </Mapbox.PointAnnotation>
        ) : null}
        {weatherAnnotations}
      </Mapbox.MapView>
      {!selectionMode && weather.every(({ isPending }) => isPending) ? <View className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 p-2"><FrogLoader color="#2A7B4C" /></View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  selectedMarker: { backgroundColor: '#F26A44', borderColor: '#FFFFFF', borderRadius: 10, borderWidth: 3, height: 20, width: 20 },
  weatherIcon: { color: '#F26A44', fontWeight: '700', textAlign: 'center', textShadowColor: '#F8F6F0', textShadowRadius: 3 },
  weatherLabel: { color: '#F8F6F0', fontWeight: '700', textAlign: 'center', textShadowColor: '#1E5B75', textShadowRadius: 3 },
  weatherMarker: { alignItems: 'center', backgroundColor: '#1E5B75ee', borderColor: '#F8F6F0cc', borderRadius: 14, borderWidth: 1, minWidth: 86, paddingHorizontal: 7, paddingVertical: 5 },
});
