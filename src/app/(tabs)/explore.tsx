import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { MapCanvas } from '@/components/explore/map-canvas';
import { type Destination, getDestinationAlert, getFeaturedDestinations, getLiveRoadAlerts, getTides, getWeather, type RoadTrafficAlert, TIDES_STALE_TIME, WEATHER_STALE_TIME } from '@/lib/logistics';
import { getExplorePlaces, publishCommunityPlace, type ExplorePlace } from '@/lib/places';
import { provinces } from '@/lib/provinces';
import { getFollowedTravelerIds, toggleTravelerFollow } from '@/lib/travelers';
import { useApp } from '@/providers/app-provider';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type Activity = {
  title: { es: string; en: string };
  subtitle: { es: string; en: string };
  category: string;
  icon: IconName;
  color: string;
  premium?: boolean;
};

const activities: Activity[] = [
  { title: { es: 'Playas', en: 'Beaches' }, subtitle: { es: 'Relajate', en: 'Unwind' }, category: 'Playa', icon: 'waves', color: '#159ed1' },
  { title: { es: 'Cataratas', en: 'Waterfalls' }, subtitle: { es: 'Naturaleza', en: 'Nature' }, category: 'Catarata', icon: 'leaf', color: '#087443' },
  { title: { es: 'Volcanes', en: 'Volcanoes' }, subtitle: { es: 'Aventura', en: 'Adventure' }, category: 'Volcán', icon: 'image-filter-hdr', color: '#087443' },
  { title: { es: 'Parques Nacionales', en: 'National Parks' }, subtitle: { es: 'Naturaleza protegida', en: 'Protected nature' }, category: 'Parque Nacional', icon: 'pine-tree', color: '#087443' },
  { title: { es: 'Cultura', en: 'Culture' }, subtitle: { es: 'Descubrí', en: 'Discover' }, category: 'Cultura', icon: 'bank-outline', color: '#ff5d52' },
  { title: { es: 'Ríos', en: 'Rivers' }, subtitle: { es: 'Refrescate', en: 'Refresh' }, category: 'Río', icon: 'waves', color: '#159ed1' },
  { title: { es: 'Miradores', en: 'Viewpoints' }, subtitle: { es: 'Admirá', en: 'Take it in' }, category: 'Mirador', icon: 'binoculars', color: '#087443' },
  { title: { es: 'Termales', en: 'Hot springs' }, subtitle: { es: 'Relajate', en: 'Unwind' }, category: 'Termales', icon: 'hot-tub', color: '#ff8f52' },
  { title: { es: 'Senderismo', en: 'Hiking' }, subtitle: { es: 'Caminá y explorá', en: 'Walk and explore' }, category: 'Senderismo', icon: 'hiking', color: '#8b5e34' },
  { title: { es: 'Pozas / Lagos', en: 'Pools / Lakes' }, subtitle: { es: 'Agua natural', en: 'Natural water' }, category: 'Pozas / Lagos', icon: 'water', color: '#159ed1' },
  { title: { es: 'Santuarios de animales', en: 'Animal Sanctuaries' }, subtitle: { es: 'Centros verificados', en: 'Verified centers' }, category: 'Santuarios de animales', icon: 'paw', color: '#087443' },
  { title: { es: 'Reservas naturales', en: 'Nature Reserves' }, subtitle: { es: 'Bosques protegidos', en: 'Protected forests' }, category: 'Reservas naturales y forestales', icon: 'forest', color: '#236b3d' },
  { title: { es: 'Refugios silvestres', en: 'Wildlife Refuges' }, subtitle: { es: 'Hábitats protegidos', en: 'Protected habitats' }, category: 'Refugios de vida silvestre', icon: 'bird', color: '#3f7f5f' },
  { title: { es: 'Experiencia Gastronómica', en: 'Food Experiences' }, subtitle: { es: 'Selección premium', en: 'Premium selection' }, category: 'Experiencia Gastronómica', icon: 'silverware-fork-knife', color: '#d69e2e', premium: true },
  { title: { es: 'Bares / Discotecas', en: 'Bars / Nightclubs' }, subtitle: { es: 'Selección premium', en: 'Premium selection' }, category: 'Bares / Discotecas', icon: 'glass-cocktail', color: '#7c4dff', premium: true },
];

export default function ExploreScreen() {
  const { formatPrice, language, requireAuth, session, t } = useApp();
  const router = useRouter();
  const { reset: resetToken } = useLocalSearchParams<{ reset?: string }>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [proposalOpen, setProposalOpen] = useState(false);
  const wide = width >= 900;
  const places = useQuery({ queryKey: ['explore-places'], queryFn: getExplorePlaces, staleTime: 10 * 60 * 1000 });
  const featuredWeather = useQuery({ queryKey: ['logistics', 'featured-destinations-v2'], queryFn: getFeaturedDestinations, staleTime: 24 * 60 * 60 * 1000 });
  const roadAlerts = useQuery({ queryKey: ['mapbox-road-alerts', language], queryFn: () => getLiveRoadAlerts(language), refetchInterval: 8 * 60 * 1000, staleTime: 8 * 60 * 1000 });
  const followed = useQuery({ queryKey: ['followed-travelers', session?.user.id], queryFn: () => getFollowedTravelerIds(session?.user.id), staleTime: 60 * 1000 });
  const resetExplore = useCallback(() => {
    setSearch('');
    setCoordinates(undefined);
    setProposalOpen(false);
  }, []);
  useEffect(() => { if (resetToken) resetExplore(); }, [resetExplore, resetToken]);
  useFocusEffect(useCallback(() => {
    const refresh = () => void queryClient.refetchQueries({ queryKey: ['explore-places'], type: 'active' });
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [queryClient]));
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!coordinates && !proposalOpen && !search) return false;
      resetExplore();
      return true;
    });
    return () => subscription.remove();
  }, [coordinates, proposalOpen, resetExplore, search]));
  const visiblePlaces = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(language === 'es' ? 'es' : 'en');
    const filtered = term ? (places.data ?? []).filter((place) => `${place.name} ${place.province} ${place.category} ${place.description ?? ''}`.toLocaleLowerCase().includes(term)) : coordinates ? [...(places.data ?? [])] : [];
    return coordinates ? filtered.sort((a, b) => distanceKm(coordinates, a) - distanceKm(coordinates, b)) : filtered;
  }, [coordinates, language, places.data, search]);

  const discover = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', language === 'es' ? 'Necesitamos tu ubicación para ordenar los sitios cercanos.' : 'Location permission is required to sort nearby places.');
    const cachedPosition = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 5000 });
    if (cachedPosition) {
      setCoordinates(cachedPosition.coords);
      void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((position) => setCoordinates(position.coords)).catch(() => undefined);
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinates(position.coords);
  };

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ alignItems: 'center', paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View className="w-full px-4 pb-4 pt-5" style={{ maxWidth: 1180 }}>
        <Text className="mb-1.5 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Busca un sitio por nombre' : 'Search for a place by name'}</Text>
        <View className="flex-row items-center rounded-control border border-ui-border bg-ui-surface px-4 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name="magnify" size={23} color="#68737A" /><TextInput accessibilityLabel={language === 'es' ? 'Buscar lugares' : 'Search places'} className="ml-3 flex-1 py-4 text-ui-text dark:text-ui-dark-text" onChangeText={setSearch} placeholder={language === 'es' ? 'Buscar playas, cataratas, miradores, volcanes o senderos…' : 'Search beaches, waterfalls, viewpoints, volcanoes or trails…'} placeholderTextColor="#68737A" value={search} /></View>
        <Pressable
          accessibilityRole="button"
          className="relative mt-3 flex-row items-center justify-center overflow-hidden rounded-2xl border border-white/60 px-4 py-3"
          onPress={() => void discover()}
          style={{ alignSelf: 'center', backgroundColor: '#0077A8dd', elevation: 8, shadowColor: '#21c8f6', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.45, shadowRadius: 12, width: '88%' }}
        >
          <View className="absolute left-5 right-5 top-0 h-[2px] rounded-full bg-white/80" />
          <MaterialCommunityIcons name="crosshairs-gps" size={21} color="white" />
          <Text className="ml-2 text-center text-sm font-black text-white">{language === 'es' ? 'Descubrir destinos turísticos cercanos' : 'Discover nearby tourist destinations'}</Text>
        </Pressable>
        {coordinates ? <Text className="mt-3 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Ordenados del más cercano al más lejano.' : 'Sorted from nearest to farthest.'}</Text> : null}
        {search || coordinates ? <View className="mt-4 gap-3">{places.isPending ? <ActivityIndicator color="#0B6B4F" /> : visiblePlaces.slice(0, 20).map((place) => <PlaceResult followed={Boolean(place.contributor_id && followed.data?.has(place.contributor_id))} formatPrice={formatPrice} key={`${place.community ? 'community' : 'official'}-${place.id}`} language={language} onFollow={async () => { if (!place.contributor_id || !requireAuth(language === 'es' ? 'Seguir a un viajero' : 'Follow a traveler') || !session) return; try { await toggleTravelerFollow(session.user.id, place.contributor_id, Boolean(followed.data?.has(place.contributor_id))); await queryClient.invalidateQueries({ queryKey: ['followed-travelers', session.user.id] }); } catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : language === 'es' ? 'No se pudo actualizar el seguimiento.' : 'Could not update follow.'); } }} onPress={() => router.push({ pathname: '/(tabs)/catalog', params: { category: place.category, destinationId: place.id } })} origin={coordinates} ownContribution={place.contributor_id === session?.user.id} place={place} />)}{!places.isPending && !visiblePlaces.length ? <Text className="py-6 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'No encontramos sitios con esa búsqueda.' : 'No places matched your search.'}</Text> : null}</View> : null}
      </View>

      <View className="w-full" style={{ maxWidth: 1180, paddingHorizontal: wide ? 20 : 0 }}>
        <View className="bg-ui-background px-5 pb-2 dark:bg-ui-dark-background">
          <Text className="text-sm font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Mapa interactivo de CR' : 'Interactive map of Costa Rica'}</Text>
          <Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Presioná una provincia para acceder a los destinos.' : 'Tap a province to see its destinations.'}</Text>
        </View>
        <MapCanvas />
      </View>

      <View className="-mt-16 w-full rounded-t-[30px] bg-ui-background pb-2 pt-6 dark:bg-ui-dark-background" style={{ maxWidth: 1180 }}>
        <View className="flex-row items-center justify-between px-5">
          <Text className="text-[17px] font-black tracking-tight text-ui-text dark:text-ui-dark-text">{t('today')}</Text>
          <Pressable accessibilityRole="button" className="flex-row items-center rounded-xl bg-ui-primary px-3 py-2 dark:bg-ui-dark-primary" hitSlop={8} onPress={() => { if (requireAuth(language === 'es' ? 'Publicar un nuevo lugar' : 'Publish a new place')) setProposalOpen(true); }}>
            <MaterialCommunityIcons name="plus-circle-outline" size={17} color="white" />
            <Text className="ml-1.5 text-xs font-black text-white">{language === 'es' ? 'Agregar sitio' : 'Add place'}</Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row flex-wrap px-3">
          {activities.map((activity) => {
            const matchingPlaces = (places.data ?? []).filter((place) => matchesActivityCategory(place.category, activity.category));
            const count = matchingPlaces.length;
            const countPending = places.isPending;
            return (
              <Pressable
                accessibilityLabel={`${activity.title[language]}, ${countPending ? (language === 'es' ? 'cargando cantidad' : 'loading count') : `${count} ${language === 'es' ? 'sitios' : 'places'}`}`}
                accessibilityRole="button"
                className="items-center px-1 py-3"
                key={activity.title.es}
                onPress={() => router.push({ pathname: '/(tabs)/catalog', params: { category: activity.category } })}
                style={{ width: '33.3333%' }}
              >
                <View className="items-center justify-center rounded-full" style={{ backgroundColor: `${activity.color}20`, height: wide ? 64 : 51, width: wide ? 64 : 51 }}>
                  <MaterialCommunityIcons name={activity.icon} size={wide ? 34 : 27} color={activity.color} />
                  {activity.premium ? <View className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-[#d69e2e]"><MaterialCommunityIcons name="crown" size={13} color="white" /></View> : null}
                  <View className="absolute -bottom-1 -right-1 h-6 min-w-6 items-center justify-center rounded-full border-2 border-ui-background px-1 dark:border-ui-dark-background" style={{ backgroundColor: activity.color }}>
                    <Text className="text-[10px] font-black text-white">{countPending ? '…' : count}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-center text-sm font-black text-ui-text dark:text-ui-dark-text" numberOfLines={2}>{activity.title[language]}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6 flex-row items-center px-7"><View className="h-9 w-9 items-center justify-center rounded-xl bg-caribbean-500/15"><MaterialCommunityIcons name="weather-partly-cloudy" size={21} color="#0077A8" /></View><Text className="ml-3 flex-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Clima y mareas por destino' : 'Weather and tides by destination'}</Text></View>
        {featuredWeather.isPending ? <ActivityIndicator className="mt-6" color="#159ed1" /> : null}
        {featuredWeather.isError ? <Text className="mx-7 mt-4 font-bold text-coral-600">{language === 'es' ? 'No se pudo cargar el clima.' : 'Weather could not be loaded.'}</Text> : null}
        <View className="mt-3 gap-3 px-12 md:px-16">
          {(featuredWeather.data ?? []).map((destination) => <WeatherDestinationAlert destination={destination} key={destination.id} language={language} onPress={() => router.push({ pathname: '/(tabs)/catalog', params: { category: destination.category, destinationId: destination.id } })} />)}
        </View>
        <Text className="mx-7 mt-2 text-[10px] leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Clima: caché 30 min · Mareas: caché 3 h.' : 'Weather: 30 min cache · Tides: 3 h cache.'}</Text>

        <View className="mx-7 mt-6 rounded-[24px] border border-[#ffac16]/40 bg-ui-surface p-4 dark:bg-ui-dark-surface"><View className="flex-row items-center"><MaterialCommunityIcons name="alert-outline" size={27} color="#d97706" /><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Alertas viales actuales' : 'Current road alerts'}</Text><Text className="mt-0.5 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">Mapbox Traffic · {roadAlerts.data ? new Date(roadAlerts.data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (language === 'es' ? 'actualizando…' : 'updating…')}</Text></View></View>{roadAlerts.isPending ? <ActivityIndicator className="my-6" color="#d97706" /> : null}{roadAlerts.isError ? <Text className="mt-4 font-bold text-coral-600">{language === 'es' ? 'No se pudo consultar Mapbox Traffic.' : 'Mapbox Traffic could not be reached.'}</Text> : null}<View className="mt-3 gap-3">{roadAlerts.data?.alerts.map((alert) => <RoadAlertRow alert={alert} key={alert.id} />)}</View><Text className="mt-3 text-[10px] leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Datos de congestión, cierres e incidentes de Mapbox. Actualización aproximada cada 8 minutos.' : 'Congestion, closure, and incident data from Mapbox. Updated approximately every 8 minutes.'}</Text></View>
      </View>
      <ProposalModal language={language} onClose={() => setProposalOpen(false)} onPublished={() => void queryClient.invalidateQueries({ queryKey: ['explore-places'] })} open={proposalOpen} session={session} />
    </ScrollView>
  );
}

function WeatherDestinationAlert({ destination, language, onPress }: { destination: Destination; language: 'es' | 'en'; onPress: () => void }) {
  const weather = useQuery({ queryKey: ['weather', destination.latitude.toFixed(3), destination.longitude.toFixed(3), language], queryFn: () => getWeather(destination, language), staleTime: WEATHER_STALE_TIME });
  const tides = useQuery({ queryKey: ['tides', destination.latitude.toFixed(3), destination.longitude.toFixed(3)], queryFn: () => getTides(destination), staleTime: TIDES_STALE_TIME, enabled: destination.has_high_tides_risk });
  const alert = getDestinationAlert(weather.data, tides.data, language, destination.has_high_tides_risk);
  return <Pressable accessibilityLabel={`${language === 'es' ? 'Abrir alerta de' : 'Open alert for'} ${destination.name}`} accessibilityRole="button" className={`rounded-[18px] border p-4 active:opacity-80 ${alert.level === 'warning' ? 'border-coral-500 bg-coral-50 dark:bg-coral-500/15' : 'border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface'}`} onPress={onPress} style={{ alignSelf: 'center', maxWidth: 448, width: '82%' }}><View className="flex-row items-center"><MaterialCommunityIcons name={alert.level === 'warning' ? 'alert-circle' : 'weather-partly-cloudy'} size={22} color={alert.level === 'warning' ? '#ff5d52' : '#0077A8'} /><View className="ml-3 flex-1"><Text className="text-sm font-black text-ui-text dark:text-ui-dark-text" numberOfLines={2}>{destination.name}</Text><Text className={`mt-1 text-xs font-black ${alert.level === 'warning' ? 'text-coral-600' : 'text-ui-secondary dark:text-ui-dark-secondary'}`}>{alert.title}</Text><Text className="mt-1 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{alert.detail}</Text></View><MaterialCommunityIcons name="chevron-right" size={21} color="#68737A" /></View></Pressable>;
}

function RoadAlertRow({ alert }: { alert: RoadTrafficAlert }) {
  const colors = alert.status === 'closed' ? ['#7f1d1d', '#fee2e2'] : alert.status === 'heavy' ? ['#b45309', '#fff7ed'] : alert.status === 'moderate' ? ['#a16207', '#fefce8'] : ['#047857', '#ecfdf5'];
  return <View className="rounded-2xl border border-ui-border bg-ui-muted p-4 dark:border-ui-dark-border dark:bg-ui-dark-muted"><View className="flex-row items-start"><View className="flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{alert.name}</Text><Text className="mt-2 text-xs leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{alert.detail}</Text></View><View className="ml-3 rounded-xl px-3 py-2" style={{ backgroundColor: colors[1] }}><Text className="text-xs font-black" style={{ color: colors[0] }}>{alert.statusLabel}</Text></View></View></View>;
}

function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const lat = rad(to.latitude - from.latitude);
  const lng = rad(to.longitude - from.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesActivityCategory(placeCategory: string, activityCategory: string) {
  const normalizedPlace = normalizeCategory(placeCategory);
  if (activityCategory === 'Pozas / Lagos') return ['poza', 'lago', 'laguna'].some((term) => normalizedPlace.includes(term));
  return normalizedPlace.includes(normalizeCategory(activityCategory));
}

function normalizeCategory(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function PlaceResult({ followed, formatPrice, language, onFollow, onPress, origin, ownContribution, place }: { followed: boolean; formatPrice: (value: number) => string; language: 'es' | 'en'; onFollow: () => void; onPress: () => void; origin?: { latitude: number; longitude: number }; ownContribution: boolean; place: ExplorePlace }) {
  const documentedAuthorities = place.verification_evidence_url && place.verification_checked_at ? place.validated_by : [];
  return <Pressable accessibilityRole="button" className="flex-row items-center rounded-control border border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface" onPress={onPress}><View className="h-12 w-12 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="map-marker" size={25} color="#0B6B4F" /></View><View className="ml-3 flex-1"><View className="flex-row flex-wrap items-center"><Text className="flex-shrink text-base font-black text-ui-text dark:text-ui-dark-text">{place.name}</Text>{place.community ? <Text className="ml-2 rounded-full bg-ui-primary-soft px-2 py-1 text-[10px] font-black text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary">{language === 'es' ? 'APORTE COMUNITARIO' : 'COMMUNITY CONTRIBUTION'}</Text> : null}{documentedAuthorities.map((authority) => <Text className="ml-2 rounded-full bg-[#0B6B4F] px-2 py-1 text-[10px] font-black text-white" key={authority}>{language === 'es' ? 'FUENTE OFICIAL' : 'OFFICIAL SOURCE'} {authority}</Text>)}</View>{place.community && place.contributor_name ? <View className="mt-1 flex-row items-center"><Text className="flex-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Lugar añadido por' : 'Place added by'} {place.contributor_name}</Text>{!ownContribution ? <Pressable className="ml-2 rounded-full bg-ui-primary-soft px-3 py-1.5 dark:bg-ui-dark-primary-soft" onPress={(event) => { event.stopPropagation(); onFollow(); }}><Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{followed ? (language === 'es' ? 'Siguiendo' : 'Following') : (language === 'es' ? 'Seguir' : 'Follow')}</Text></Pressable> : null}</View> : null}<Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{place.province} · {place.category} · {place.price_national_crc == null ? (language === 'es' ? 'Consultar' : 'Check price') : formatPrice(place.price_national_crc)}</Text></View>{origin ? <Text className="font-black text-ui-secondary dark:text-ui-dark-secondary">{distanceKm(origin, place).toFixed(1)} km</Text> : <MaterialCommunityIcons name="chevron-right" size={23} color="#0077A8" />}</Pressable>;
}

function ProposalModal({ language, onClose, onPublished, open, session }: { language: 'es' | 'en'; onClose: () => void; onPublished: () => void; open: boolean; session: ReturnType<typeof useApp>['session'] }) {
  const [name, setName] = useState(''); const [province, setProvince] = useState('San José'); const [categories, setCategories] = useState<string[]>([]); const [district, setDistrict] = useState(''); const [price, setPrice] = useState('0'); const [difficulty, setDifficulty] = useState('Moderada'); const [description, setDescription] = useState(''); const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps'); const [manualLocation, setManualLocation] = useState<{ latitude: number; longitude: number }>(); const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!session || name.trim().length < 3 || description.trim().length < 10) return Alert.alert('Descubriendo CR', language === 'es' ? 'Agregá un nombre y una descripción de al menos 10 caracteres.' : 'Add a name and a description of at least 10 characters.');
    if (categories.length < 1 || categories.length > 2) return Alert.alert('Descubriendo CR', language === 'es' ? 'Seleccioná una o dos categorías.' : 'Select one or two categories.');
    if (locationMode === 'manual' && !manualLocation) return Alert.alert('Descubriendo CR', language === 'es' ? 'Mové el mapa y tocá el punto donde está el sitio.' : 'Move the map and tap where the place is located.');
    setSending(true);
    try {
      let location = manualLocation;
      if (!location) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Descubriendo CR', language === 'es' ? 'Necesitamos el GPS para guardar la ubicación actual del sitio.' : 'GPS permission is required to save your current location.');
          return;
        }
        location = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
      }
      await publishCommunityPlace({ user_id: session.user.id, name: name.trim(), province, category: categories.join(' / '), district: district.trim() || undefined, description: description.trim(), difficulty, price_national_crc: Math.max(0, Number(price.replace(',', '.')) || 0), latitude: location.latitude, longitude: location.longitude });
      onPublished(); onClose(); setName(''); setDescription(''); setCategories([]); setLocationMode('gps'); setManualLocation(undefined);
    }
    catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : language === 'es' ? 'No se pudo publicar.' : 'Could not publish.'); }
    finally { setSending(false); }
  };
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}><View className="flex-1 items-center justify-center bg-black/60 p-4"><View className="max-h-[92%] w-full max-w-2xl overflow-hidden rounded-modal bg-ui-surface dark:bg-ui-dark-surface"><View className="flex-row items-center border-b border-ui-border p-5 dark:border-ui-dark-border"><MaterialCommunityIcons name="plus-circle-outline" size={27} color="#0B6B4F" /><Text className="ml-3 flex-1 text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Publicar un nuevo lugar' : 'Publish a new place'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} onPress={onClose}><MaterialCommunityIcons name="close" size={26} color="#68737A" /></Pressable></View><ScrollView contentContainerStyle={{ gap: 16, padding: 20 }}><Field label={language === 'es' ? 'Nombre del lugar' : 'Place name'} onChange={setName} placeholder="Ej: Poza Azul" value={name} /><ChoiceField label={language === 'es' ? 'Provincia' : 'Province'} onChange={setProvince} options={provinces.map((item) => item.name)} value={province} /><CategoryChoiceField language={language} onChange={setCategories} value={categories} /><Field label={language === 'es' ? 'Cantón / Pueblo' : 'Town / District'} onChange={setDistrict} placeholder={language === 'es' ? 'Ej: Bajos del Toro' : 'Example: Bajos del Toro'} value={district} /><Field keyboard label={language === 'es' ? 'Precio de entrada (₡)' : 'Entry price (CRC)'} onChange={setPrice} placeholder="0" value={price} /><ChoiceField label={language === 'es' ? 'Dificultad física' : 'Difficulty'} onChange={setDifficulty} options={['Fácil','Moderada','Difícil']} value={difficulty} /><View><Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ubicación del sitio' : 'Place location'}</Text><View className="flex-row gap-2"><Pressable accessibilityRole="radio" accessibilityState={{ selected: locationMode === 'gps' }} className={locationMode === 'gps' ? 'flex-1 rounded-control bg-ui-primary p-3 dark:bg-ui-dark-primary' : 'flex-1 rounded-control bg-ui-muted p-3 dark:bg-ui-dark-muted'} onPress={() => { setLocationMode('gps'); setManualLocation(undefined); }}><Text className={locationMode === 'gps' ? 'text-center text-sm font-black text-white' : 'text-center text-sm font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? '📍 Usar mi GPS' : '📍 Use my GPS'}</Text></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ selected: locationMode === 'manual' }} className={locationMode === 'manual' ? 'flex-1 rounded-control bg-ui-primary p-3 dark:bg-ui-dark-primary' : 'flex-1 rounded-control bg-ui-muted p-3 dark:bg-ui-dark-muted'} onPress={() => setLocationMode('manual')}><Text className={locationMode === 'manual' ? 'text-center text-sm font-black text-white' : 'text-center text-sm font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? '🗺️ Ubicar en mapa' : '🗺️ Pick on map'}</Text></Pressable></View>{locationMode === 'manual' ? <View className="mt-3 overflow-hidden rounded-control border border-ui-border dark:border-ui-dark-border"><Text className="p-3 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Mové el mapa, acercá o alejále y tocá el punto exacto. El pin verde muestra tu selección.' : 'Pan or zoom the map, then tap the exact point. The green pin shows your selection.'}</Text><MapCanvas onLocationPick={setManualLocation} selectedLocation={manualLocation} /><Text className="p-3 text-center text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{manualLocation ? `${manualLocation.latitude.toFixed(5)}, ${manualLocation.longitude.toFixed(5)}` : (language === 'es' ? 'Tocá el mapa para elegir la ubicación.' : 'Tap the map to choose a location.')}</Text></View> : null}</View><Field label={language === 'es' ? 'Descripción y cómo llegar' : 'Description and directions'} multiline onChange={setDescription} placeholder={language === 'es' ? 'Describí el sitio y cómo llegar…' : 'Describe the place and how to get there…'} value={description} /><View className="rounded-control bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="text-sm font-bold leading-5 text-ui-text dark:text-ui-dark-text">{locationMode === 'manual' ? (language === 'es' ? 'Se guardará el punto que seleccionaste en el mapa y aparecerá como aporte de la comunidad.' : 'The point you selected on the map will be saved as a community contribution.') : (language === 'es' ? 'Se publicará inmediatamente con tu ubicación GPS actual y aparecerá como aporte de la comunidad.' : 'It will publish immediately using your current GPS location and appear as a community contribution.')}</Text></View><Pressable accessibilityRole="button" className="items-center rounded-control bg-ui-primary p-4 dark:bg-ui-dark-primary" disabled={sending} onPress={() => void submit()}>{sending ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar ahora' : 'Publish now'}</Text>}</Pressable></ScrollView></View></View></Modal>;
}

function Field({ keyboard, label, multiline, onChange, placeholder, value }: { keyboard?: boolean; label: string; multiline?: boolean; onChange: (value: string) => void; placeholder: string; value: string }) { return <View><Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{label}</Text><TextInput className="rounded-control border border-ui-border bg-ui-muted px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType={keyboard ? 'decimal-pad' : 'default'} multiline={multiline} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#68737A" style={multiline ? { minHeight: 90, textAlignVertical: 'top' } : undefined} value={value} /></View>; }
function ChoiceField({ label, language = 'es', onChange, options, value }: { label: string; language?: 'es' | 'en'; onChange: (value: string) => void; options: string[]; value: string }) { const difficultyLabels = { Fácil: 'Easy', Moderada: 'Moderate', Difícil: 'Difficult' } as Record<string, string>; return <View><Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{label}</Text><ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{options.map((option) => <Pressable className={value === option ? 'rounded-full bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'rounded-full bg-ui-muted px-4 py-3 dark:bg-ui-dark-muted'} key={option} onPress={() => onChange(option)}><Text className={value === option ? 'font-black text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'en' ? (difficultyLabels[option] ?? option) : option}</Text></Pressable>)}</ScrollView></View>; }

const destinationCategoryOptions = activities.map(({ category }) => category);

const destinationCategoryLabels: Record<string, string> = Object.fromEntries(
  activities.map(({ category, title }) => [category, title.en]),
);

function CategoryChoiceField({ language, onChange, value }: { language: 'es' | 'en'; onChange: (value: string[]) => void; value: string[] }) {
  const toggle = (option: string) => {
    if (value.includes(option)) return onChange(value.filter((item) => item !== option));
    if (value.length === 2) return Alert.alert('Descubriendo CR', language === 'es' ? 'Podés seleccionar un máximo de dos categorías.' : 'You can select up to two categories.');
    onChange([...value, option]);
  };
  return <View><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Categorías' : 'Categories'}</Text><Text className="mb-2 mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Elegí una o dos.' : 'Choose one or two.'}</Text><ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{destinationCategoryOptions.map((option) => { const selected = value.includes(option); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} className={selected ? 'rounded-full bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'rounded-full bg-ui-muted px-4 py-3 dark:bg-ui-dark-muted'} key={option} onPress={() => toggle(option)}><Text className={selected ? 'font-black text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? option : destinationCategoryLabels[option]}</Text></Pressable>; })}</ScrollView></View>;
}
