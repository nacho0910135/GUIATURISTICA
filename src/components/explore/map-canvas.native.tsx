import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';

import { getWeather, WEATHER_STALE_TIME } from '@/lib/logistics';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const provinceColors = ['#ad2867', '#247146', '#6956b9', '#30866d', '#6689bd', '#c23569', '#d66b24'];

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
  const wide = width >= 900;
  const weather = useQueries({ queries: provinces.map((province) => ({
    queryKey: ['weather', 'province', province.code, language],
    queryFn: () => getWeather(province.center, language),
    staleTime: WEATHER_STALE_TIME,
  })) });
  const openProvince = (name: string) => router.push({ pathname: '/(aux)/province', params: { province: name } });

  return (
    <View className="overflow-hidden bg-ui-secondary dark:bg-ui-dark-secondary" style={{ borderColor: '#56c7e9', borderRadius: wide ? 28 : 0, borderWidth: 2, height: wide ? 530 : 460 }}>
      <MapView
        key={wide ? 'wide-6' : 'mobile-7.8'}
        initialRegion={{ latitude: 9.88, longitude: -84.12, latitudeDelta: wide ? 6 : 7.8, longitudeDelta: wide ? 6 : 7.8 }}
        mapType="standard"
        maxZoomLevel={19}
        minZoomLevel={5}
        rotateEnabled={false}
        style={{ height: '100%', width: '100%' }}
      >
        {provinces.flatMap((province, provinceIndex) => province.polygons.map((ring, ringIndex) => (
          <Polygon
            key={`${province.code}-${ringIndex}`}
            coordinates={ring.map(([longitude, latitude]) => ({ latitude, longitude }))}
            fillColor={`${provinceColors[provinceIndex]}c7`}
            onPress={() => openProvince(province.name)}
            strokeColor="#173f48"
            strokeWidth={3}
            tappable
          />
        )))}
        {provinces.map((province, index) => {
          const current = weather[index].data;
          return (
            <Marker key={province.code} coordinate={province.center} onPress={() => openProvince(province.name)} tracksViewChanges={false}>
              <View className="items-center">
                <Text style={{ color: '#ffd84d', fontSize: wide ? 34 : 25, textShadowColor: '#173f48', textShadowRadius: 3 }}>{weatherSymbol(current?.icon)}</Text>
                <Text style={{ color: '#ffffff', fontSize: wide ? 15 : 12, fontWeight: '700', textAlign: 'center', textShadowColor: '#173f48', textShadowRadius: 3 }}>{province.name}{'\n'}{current ? `${current.temperature}°${current.temperatureUnit}` : '…'}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
      {weather.every(({ isPending }) => isPending) ? <View className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 p-2"><ActivityIndicator color="#087443" /></View> : null}
    </View>
  );
}
