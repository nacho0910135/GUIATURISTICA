import { Camera, FillLayer, LineLayer, MapView, ShapeSource, SymbolLayer, setAccessToken } from '@rnmapbox/maps';
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
const provinceColors = ['match', ['get', 'code'], '1', '#ad2867', '2', '#247146', '3', '#6956b9', '4', '#30866d', '5', '#6689bd', '6', '#c23569', '7', '#d66b24', '#5b7f9e'] as const;

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
        properties: { icon: weatherSymbol(current?.icon), name: province.name, label: `${province.name}\n${current ? `${current.temperature}°${current.temperatureUnit}` : '…'}` },
        geometry: { type: 'Point', coordinates: [province.center.longitude, province.center.latitude] },
      };
    }),
  }), [weather]);
  const openProvince = (name?: string) => {
    if (name) router.push({ pathname: '/(aux)/province', params: { province: name } });
  };

  return (
    <View className="overflow-hidden bg-[#087fa1]" style={{ borderColor: '#56c7e9', borderRadius: wide ? 28 : 0, borderWidth: 2, height: wide ? 530 : 460 }}>
      <MapView attributionPosition={{ bottom: 8, right: 8 }} compassEnabled={false} logoPosition={{ bottom: 8, left: 8 }} onDidFinishLoadingMap={() => { setMapReady(true); setMapError(false); }} onMapLoadingError={() => setMapError(true)} scaleBarEnabled={false} style={{ height: '100%', width: '100%' }} styleURL="mapbox://styles/mapbox/outdoors-v12">
        <Camera centerCoordinate={[-84.12, 9.88]} zoomLevel={wide ? 7.05 : 6.35} minZoomLevel={5.7} maxZoomLevel={10} />
        <ShapeSource id="cr-provinces" shape={provinceShape} onPress={(event) => openProvince(event.features[0]?.properties?.name as string | undefined)}>
          <FillLayer id="province-fills" style={{ fillColor: provinceColors, fillOpacity: 0.78 }} />
          <LineLayer id="province-halo" style={{ lineColor: '#48c5df', lineOpacity: 0.7, lineWidth: 6 }} />
          <LineLayer id="province-lines" style={{ lineColor: '#173f48', lineOpacity: 1, lineWidth: 3 }} />
        </ShapeSource>
        <ShapeSource id="province-weather" shape={weatherShape} onPress={(event) => openProvince(event.features[0]?.properties?.name as string | undefined)}>
          <SymbolLayer id="province-weather-icons" style={{ textAllowOverlap: true, textColor: '#ffd84d', textField: ['get', 'icon'], textHaloColor: '#ffffff', textHaloWidth: 2, textOffset: [0, -0.8], textSize: wide ? 34 : 25 }} />
          <SymbolLayer id="province-weather-labels" style={{ textAllowOverlap: true, textColor: '#ffffff', textField: ['get', 'label'], textHaloColor: '#173f48', textHaloWidth: 2, textOffset: [0, 1], textSize: wide ? 15 : 12, textTransform: 'none' }} />
        </ShapeSource>
      </MapView>
      {!mapReady ? <View className="absolute inset-0 items-center justify-center bg-[#dff4f4]">{mapError ? <Text className="px-8 text-center font-bold text-coral-600">{language === 'es' ? 'No se pudo cargar Mapbox. Revisá la conexión.' : 'Mapbox could not load. Check the connection.'}</Text> : <ActivityIndicator size="large" color="#087443" />}</View> : null}
    </View>
  );
}
