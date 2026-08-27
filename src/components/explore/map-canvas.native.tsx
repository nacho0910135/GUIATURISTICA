import { Camera, FillLayer, LineLayer, MapView, ShapeSource, StyleURL, SymbolLayer, setAccessToken } from '@rnmapbox/maps';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, useWindowDimensions, View } from 'react-native';

import { getWeather, WEATHER_STALE_TIME } from '@/lib/logistics';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
void setAccessToken(MAPBOX_TOKEN);

const provinceShape: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, { code: string; name: string }> = {
  type: 'FeatureCollection',
  features: provinces.map((province) => ({
    type: 'Feature', id: province.code, properties: { code: province.code, name: province.name },
    geometry: { type: 'MultiPolygon', coordinates: province.polygons.map((ring) => [ring]) },
  })),
};
const provinceColors = ['match', ['get', 'code'], '1', '#bdebcf', '2', '#d0efd1', '3', '#c8e7ca', '4', '#d7efc6', '5', '#c8edc9', '6', '#c7e7d4', '7', '#c9eee1', '#d9efdc'] as const;

function weatherSymbol(icon?: string) {
  if (icon?.startsWith('01')) return '☀';
  if (icon?.startsWith('02')) return '⛅';
  if (icon?.startsWith('09') || icon?.startsWith('10')) return '☂';
  if (icon?.startsWith('11')) return 'ϟ';
  return '☁';
}

export function MapCanvas() {
  const { language } = useApp();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const wide = width >= 900;
  const weather = useQueries({ queries: provinces.map((province) => ({
    queryKey: ['weather', 'province', province.code, language],
    queryFn: () => getWeather(province.center, language),
    staleTime: WEATHER_STALE_TIME,
  })) });
  const weatherShape = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => ({
    type: 'FeatureCollection',
    features: provinces.map((province, index) => {
      const current = weather[index].data;
      return {
        type: 'Feature', id: province.code,
        properties: { name: province.name, label: `${weatherSymbol(current?.icon)} ${province.name}\n${current ? `${current.temperature}°` : '…'}` },
        geometry: { type: 'Point', coordinates: [province.center.longitude, province.center.latitude] },
      };
    }),
  }), [weather]);
  const openProvince = (name?: string) => {
    if (name) router.push({ pathname: '/(aux)/province', params: { province: name } });
  };

  return (
    <View className="overflow-hidden bg-sky-100" style={{ borderRadius: wide ? 28 : 0, height: wide ? 530 : 460 }}>
      <MapView attributionPosition={{ bottom: 8, right: 8 }} compassEnabled={false} logoPosition={{ bottom: 8, left: 8 }} onDidFinishLoadingMap={() => { setMapReady(true); setMapError(false); }} onMapLoadingError={() => setMapError(true)} scaleBarEnabled={false} style={{ height: '100%', width: '100%' }} styleURL={StyleURL.Outdoors}>
        <Camera centerCoordinate={[-84.12, 9.88]} zoomLevel={wide ? 7.05 : 6.35} minZoomLevel={5.7} maxZoomLevel={10} />
        <ShapeSource id="cr-provinces" shape={provinceShape} onPress={(event) => openProvince(event.features[0]?.properties?.name as string | undefined)}>
          <FillLayer id="province-fills" style={{ fillColor: provinceColors, fillOpacity: 0.58 }} />
          <LineLayer id="province-halo" style={{ lineColor: '#ffffff', lineOpacity: 0.92, lineWidth: 5.5 }} />
          <LineLayer id="province-lines" style={{ lineColor: '#07563d', lineOpacity: 0.9, lineWidth: 3 }} />
        </ShapeSource>
        <ShapeSource id="province-weather" shape={weatherShape} onPress={(event) => openProvince(event.features[0]?.properties?.name as string | undefined)}>
          <SymbolLayer id="province-weather-labels" style={{ textAllowOverlap: true, textColor: '#073f2e', textField: ['get', 'label'], textHaloColor: '#ffffff', textHaloWidth: 2, textSize: wide ? 15 : 12, textTransform: 'none' }} />
        </ShapeSource>
      </MapView>
      {!mapReady ? <View className="absolute inset-0 items-center justify-center bg-[#dff4f4]">{mapError ? <Text className="px-8 text-center font-bold text-coral-600">{language === 'es' ? 'No se pudo cargar Mapbox. Revisá la conexión.' : 'Mapbox could not load. Check the connection.'}</Text> : <ActivityIndicator size="large" color="#087443" />}</View> : null}
      <View className="absolute bottom-5 left-16 right-16 rounded-full bg-white/95 px-4 py-2"><Text className="text-center text-xs font-extrabold text-forest-800">{language === 'es' ? 'Tocá una provincia para ver sus sitios' : 'Tap a province to see its places'}</Text></View>
    </View>
  );
}
