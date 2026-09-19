import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused, useScrollToTop } from 'expo-router/react-navigation';
import { distanceKm, roadRouteLabel } from '@/lib/location-quality';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { MapCanvas } from '@/components/explore/map-canvas';
import { LocationPickerModal } from '@/components/location-picker-modal';
import { AppFooter } from '@/components/app-footer';
import { InformationReportModal } from '@/components/information-report-modal';
import { AnimatedShine, MotionPressable, Skeleton } from '@/components/motion';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { getAppOptions, type AppOption } from '@/lib/app-options';
import { getMySubscriptions, hasActiveBusinessPlan } from '@/lib/billing';
import { haptic } from '@/lib/haptics';
import { getPreciseCurrentLocation } from '@/lib/current-location';
import { getLiveRoadAlerts, getWeather, WEATHER_STALE_TIME, type RoadTrafficAlert } from '@/lib/logistics';
import { getMarineConditionsMany, isBeachPlace, MARINE_WEATHER_STALE_TIME, OPEN_METEO_MARINE_URL } from '@/lib/marine-weather';
import { getExplorePlaces, matchesPrimaryCategory, publishCommunityPlace, type ExplorePlace } from '@/lib/places';
import { provinces } from '@/lib/provinces';
import { getFollowedTravelerIds, toggleTravelerFollow } from '@/lib/travelers';
import { markExploreStartupReady } from '@/lib/startup-gate';
import { getRoadRoutes, type RoadRoute } from '@/lib/road-routing';
import { useApp } from '@/providers/app-provider';

import { useScreenActive } from '@/hooks/use-screen-active';
import { FrogLoader } from '@/components/frog-loader';
import { SubscriptionRequired, usePaidAccess } from '@/components/subscription-required';
const fallbackDestinationThumbnail = require('../../../assets/images/startup-rainforest.gif');
const destinationPlaceholder = { blurhash: 'L9C6cY00M{~q%MxuRjof00ofxuWB' };

const volcanoColor = '#5F9EA0';
const categoryColors = ['#2A7B4C', '#1E5B75', volcanoColor, '#B58A5A', '#7D9E8A', '#6F8FB3'];
const weatherIcons = { '01': 'weather-sunny', '02': 'weather-partly-cloudy', '03': 'weather-cloudy', '04': 'weather-cloudy', '09': 'weather-pouring', '10': 'weather-rainy', '11': 'weather-lightning-rainy', '13': 'weather-snowy', '50': 'weather-fog' } as const;

export default function ExploreScreen() {
  const { formatPrice, language, requireAuth, session, userLocation, refreshUserLocation, locating, locationError } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const router = useRouter();
  const isFocused = useIsFocused();
  const isActive = useScreenActive();
  const { reset: resetToken } = useLocalSearchParams<{ reset?: string }>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [showNearbyPaywall, setShowNearbyPaywall] = useState(false);
  const paidAccess = usePaidAccess();
  const coordinates = nearbyEnabled ? userLocation ?? undefined : undefined;
  const [proposalOpen, setProposalOpen] = useState(false);
  const [roadReportOpen, setRoadReportOpen] = useState(false);
  const [reportingRoad, setReportingRoad] = useState<RoadTrafficAlert | null>(null);
  const wide = width >= 900;
  const places = useQuery({
    queryKey: ['explore-places', 'v3'],
    queryFn: getExplorePlaces,
    networkMode: 'always',
    staleTime: 5 * 60 * 1000,
  });
  const destinationCategories = useQuery({
    queryKey: ['app-options', 'destination_category', 'v2'],
    queryFn: () => getAppOptions('destination_category'),
    staleTime: 5 * 60 * 1000,
  });
  const roadAlerts = useQuery({
    queryKey: ['mapbox-road-alerts', language],
    queryFn: () => getLiveRoadAlerts(language),
    enabled: isActive,
    refetchInterval: 8 * 60 * 1000,
    staleTime: 8 * 60 * 1000,
  });
  const followed = useQuery({
    queryKey: ['followed-travelers', session?.user.id],
    queryFn: () => getFollowedTravelerIds(session?.user.id),
    staleTime: 60 * 1000,
  });
  const beaches = useMemo(() => (places.data ?? []).filter(isBeachPlace), [places.data]);
  const marineAlerts = useQuery({
    queryKey: ['marine-alerts', beaches.map(({ id }) => id).join(',')],
    queryFn: async () => {
      const conditions = await getMarineConditionsMany(beaches);
      return beaches.flatMap((beach, index) => conditions[index]?.dangerous ? [{ ...beach, conditions: conditions[index] }] : []);
    },
    enabled: isActive && beaches.length > 0,
    staleTime: MARINE_WEATHER_STALE_TIME,
  });
  useEffect(() => {
    if (!places.isPending && !destinationCategories.isPending) markExploreStartupReady();
  }, [destinationCategories.isPending, places.isPending]);
  const resetExplore = useCallback(() => {
    setSearch('');
    setNearbyEnabled(false);
    setNearbyLoading(false);
    setProposalOpen(false);
  }, []);
  useEffect(() => {
    if (resetToken) resetExplore();
  }, [resetExplore, resetToken]);
  useEffect(() => {
    if (!isFocused) resetExplore();
  }, [isFocused, resetExplore]);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (proposalOpen || search || coordinates) resetExplore();
        return true;
      });
      return () => subscription.remove();
    }, [coordinates, proposalOpen, resetExplore, search]),
  );
  const categoryOptions = useMemo(() => destinationCategories.data ?? [], [destinationCategories.data]);
  const rootCategories = useMemo(() => categoryOptions.filter((option) => option.parent_id === null), [categoryOptions]);
  const categoryCounts = useMemo(() => new Map(rootCategories.map((category) => [
    category.id,
    (places.data ?? []).reduce((count, place) => count + Number(matchesPrimaryCategory(place.category, category.allowed_targets?.length ? category.allowed_targets : [category.label_es, category.label_en])), 0),
  ])), [places.data, rootCategories]);
  const matchedPlaces = useMemo(() => {
    const term = normalizeSearchText(search);
    if (!term && !coordinates) return [];
    return (places.data ?? []).flatMap((place) => {
      const score = term ? nameSearchScore(place.name, term) : 0;
      return score === null ? [] : [{ place, score }];
    });
  }, [coordinates, places.data, search]);
  const routingOrigin = useMemo(() => userLocation ? {
    latitude: Number(userLocation.latitude.toFixed(3)),
    longitude: Number(userLocation.longitude.toFixed(3)),
  } : null, [userLocation]);
  // ponytail: 24 road candidates keep nearby results responsive; raise only if field data shows missed nearby destinations.
  const routingCandidates = useMemo(() => routingOrigin && coordinates
    ? [...matchedPlaces].sort((a, b) => distanceKm(routingOrigin, a.place) - distanceKm(routingOrigin, b.place)).slice(0, 24)
    : matchedPlaces.slice(0, 24), [coordinates, matchedPlaces, routingOrigin]);
  const roadRoutes = useQuery({
    queryKey: ['mapbox-road-routes-v3', routingOrigin?.latitude, routingOrigin?.longitude, routingCandidates.map(({ place }) => place.id).join(',')],
    queryFn: () => getRoadRoutes(routingOrigin!, routingCandidates.map(({ place }) => place)),
    enabled: isActive && Boolean(routingOrigin && routingCandidates.length),
    staleTime: 10 * 60 * 1000,
  });
  const visiblePlaces = useMemo(() => [...routingCandidates]
    .sort((a, b) => coordinates
      ? (roadRoutes.data?.get(a.place.id)?.distanceKm ?? Infinity) - (roadRoutes.data?.get(b.place.id)?.distanceKm ?? Infinity) || a.score - b.score
      : a.score - b.score || a.place.name.localeCompare(b.place.name, language === 'es' ? 'es' : 'en'))
    .map(({ place }) => place), [coordinates, language, roadRoutes.data, routingCandidates]);
  const hasSearch = Boolean(search.trim());

  useEffect(() => {
    if (!nearbyLoading || locating || places.isPending) return;
    if (locationError || !userLocation) {
      setNearbyLoading(false);
      return;
    }
    if (routingCandidates.length && (roadRoutes.isPending || roadRoutes.isFetching)) return;
    setNearbyLoading(false);
    void haptic('success');
  }, [locating, locationError, nearbyLoading, places.isPending, roadRoutes.isFetching, roadRoutes.isPending, routingCandidates.length, userLocation]);

  const discover = async () => {
    if (!requireAuth(language === 'es' ? 'ver destinos turísticos cercanos' : 'view nearby tourist destinations')) return;
    if (!paidAccess.hasPaidAccess) {
      setShowNearbyPaywall(true);
      setNearbyEnabled(false);
      return;
    }
    if (coordinates) {
      setNearbyEnabled(false);
      setNearbyLoading(false);
      void haptic('selection');
      return;
    }
    setNearbyLoading(true);
    setNearbyEnabled(true);
    await refreshUserLocation();
  };
  const resultContent = (
    <View className="overflow-hidden rounded-control border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface">
      {places.isPending ? (
        <PlaceResultsSkeleton large={false} language={language} />
      ) : (
        visiblePlaces.slice(0, hasSearch ? 5 : 20).map((place) => (
          <PlaceResult
            active={isActive}
            followed={Boolean(place.contributor_id && followed.data?.has(place.contributor_id))}
            formatPrice={formatPrice}
            key={`${place.community ? 'community' : 'official'}-${place.id}`}
            large={false}
            language={language}
            onFollow={async () => {
              if (!place.contributor_id || !requireAuth(language === 'es' ? 'Seguir a un viajero' : 'Follow a traveler') || !session) return;
              try {
                await toggleTravelerFollow(session.user.id, place.contributor_id, Boolean(followed.data?.has(place.contributor_id)));
                await queryClient.invalidateQueries({ queryKey: ['followed-travelers', session.user.id] });
                void haptic('success');
              } catch (reason) {
                Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : language === 'es' ? 'No se pudo actualizar el seguimiento.' : 'Could not update follow.');
              }
            }}
            onPress={() => {
              resetExplore();
              router.push({ pathname: '/(aux)/province', params: { category: place.category, destinationId: place.id, direct: '1', ...(place.community ? { community: '1' } : {}) } });
            }}
            route={roadRoutes.data?.get(place.id) ?? null}
            ownContribution={place.contributor_id === session?.user.id}
            place={place}
          />
        ))
      )}
      {places.isError ? (
        <Pressable accessibilityRole="button" className="items-center bg-ui-primary p-4 shadow-card dark:bg-ui-dark-primary" style={{ elevation: 7, shadowColor: '#073F31', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.28, shadowRadius: 7 }} onPress={() => void places.refetch()}>
          <Text className="font-black text-white">{language === 'es' ? 'Reintentar cargar destinos' : 'Retry loading destinations'}</Text>
        </Pressable>
      ) : !places.isPending && !visiblePlaces.length ? (
        <Text className="py-6 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'No encontramos sitios con esa búsqueda.' : 'No places matched your search.'}</Text>
      ) : null}
    </View>
  );

  return (
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ alignItems: 'center', paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View className="w-full px-4 pb-4 pt-5" style={{ maxWidth: 1180, zIndex: 10 }}>
        {showNearbyPaywall && !paidAccess.hasPaidAccess ? <SubscriptionRequired compact /> : null}
        <View className="w-full flex-row items-stretch gap-2">
          <NearbyButton enabled={nearbyEnabled} language={language} loading={nearbyLoading} onPress={() => void discover()} />
          <MotionPressable
            accessibilityRole="button"
            className="relative min-h-12 flex-row items-center justify-center overflow-hidden rounded-2xl border border-[#5DB990] bg-[#DDF3E8] px-3 py-3 dark:border-[#47C08A] dark:bg-[#164330]"
            containerStyle={{ width: 128 }}
            onPress={() => { resetExplore(); void haptic('selection'); router.push({ pathname: '/(tabs)/fauna', params: { from: 'explore' } }); }}
            style={{ elevation: 8, shadowColor: '#07543F', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.3, shadowRadius: 8 }}
          >
            <LinearGradient colors={['rgba(255,255,255,0.20)', 'rgba(7,84,63,0.10)']} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
            <AnimatedShine travel={210} />
            <MaterialCommunityIcons name="paw" size={19} color="#07543F" />
            <Text className="ml-1.5 text-xs font-black text-[#07543F] dark:text-[#8DE0B6]">{language === 'es' ? 'Fauna CR' : 'CR Wildlife'}</Text>
          </MotionPressable>
        </View>
{nearbyEnabled && !userLocation ? <Text accessibilityRole={locationError ? 'alert' : 'text'} className="mt-3 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{nearbyLoading ? (language === 'es' ? 'Obteniendo ubicación precisa…' : 'Getting precise location…') : (language === 'es' ? 'Activá la ubicación precisa y tocá Destinos Turísticos Cercanos para reintentar.' : 'Enable precise location and tap Nearby Tourist Destinations to retry.')}</Text> : null}
        <Text className="mb-1.5 mt-3 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Busca un sitio por nombre' : 'Search for a place by name'}</Text>
        <View className="relative z-20">
          <View className="flex-row items-stretch gap-2">
            <View className="min-w-0 flex-1 flex-row items-center rounded-control border border-ui-border bg-ui-surface px-4 dark:border-ui-dark-border dark:bg-ui-dark-surface">
              <MaterialCommunityIcons name="magnify" size={23} color="#68737A" />
              <TextInput accessibilityLabel={language === 'es' ? 'Buscar lugares' : 'Search places'} className="ml-3 flex-1 py-4 text-ui-text dark:text-ui-dark-text" onChangeText={setSearch} onFocus={() => setNearbyEnabled(false)} placeholder={language === 'es' ? 'Ej. Playa Doña Ana' : 'E.g. Doña Ana Beach'} placeholderTextColor="#68737A" value={search} />
              {search ? (
                <Pressable accessibilityLabel={language === 'es' ? 'Limpiar búsqueda' : 'Clear search'} accessibilityRole="button" className="rounded-full bg-ui-muted p-1 shadow-card dark:bg-ui-dark-muted" hitSlop={10} style={{ elevation: 4, shadowColor: '#073F31', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.18, shadowRadius: 4 }} onPress={() => setSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={21} color="#68737A" />
                </Pressable>
              ) : null}
            </View>
            <MotionPressable
              accessibilityLabel={language === 'es' ? 'Agregar sitio' : 'Add place'}
              accessibilityRole="button"
              className="relative min-h-12 flex-row items-center justify-center overflow-hidden rounded-control border border-[#67BC8B] bg-[#2A7B4C] px-3"
              containerStyle={{ width: 128 }}
              onPress={() => {
                if (!requireAuth(language === 'es' ? 'Agregar un sitio' : 'Add a place') || !session) return;
                void haptic('selection');
                setNearbyEnabled(false);
                setProposalOpen(true);
              }}
              style={{ elevation: 9, shadowColor: '#073F31', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.36, shadowRadius: 8 }}
            >
              <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(3,30,24,0.20)']} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
              <AnimatedShine travel={210} />
              <MaterialCommunityIcons name="plus" size={19} color="white" />
              <Text className="ml-1.5 text-center text-xs font-black leading-3 text-white">{language === 'es' ? 'Agregar\nnuevo sitio' : 'Add\nnew place'}</Text>
            </MotionPressable>
          </View>
          {hasSearch ? <View className="absolute left-0 right-0 z-20" style={{ elevation: 20, marginTop: 8, top: '100%' }}>{resultContent}</View> : null}
        </View>
        {coordinates && !nearbyLoading ? <Text className="mt-3 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Ordenados del más cercano al más lejano.' : 'Sorted from nearest to farthest.'}</Text> : null}
        {!coordinates ? (
          <View className="mt-5 flex-row flex-wrap">
            {destinationCategories.isPending ? <CategoryGridSkeleton language={language} wide={wide} /> : null}
            {rootCategories.map((category, index) => {
              const count = categoryCounts.get(category.id) ?? 0;
              const color = categoryColors[index % categoryColors.length];
              return (
                <MotionPressable
                  accessibilityLabel={`${optionLabel(category, language)}, ${places.isPending ? (language === 'es' ? 'cargando cantidad' : 'loading count') : `${count} ${language === 'es' ? 'sitios' : 'places'}`}`}
                  accessibilityRole="button"
                  className="w-full items-center px-0.5 py-2"
                  containerStyle={{ paddingHorizontal: 2, width: '25%' }}
                  key={category.id}
                  onPress={() => { resetExplore(); router.push({ pathname: '/(aux)/province', params: { categoryId: category.id } }); void haptic('selection'); }}
                >
                  <View
                    className="items-center justify-center border border-white/80 shadow-card"
                    style={{
                      backgroundColor: `${color}20`,
                      borderRadius: (wide ? 72 : 62) / 2,
                      elevation: 8,
                      height: wide ? 72 : 62,
                      shadowColor: color,
                      shadowOffset: { height: 5, width: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 7,
                      width: wide ? 72 : 62,
                    }}
                  >
                    <View className="items-center justify-center" style={{ height: wide ? 40 : 34, width: wide ? 40 : 34 }}>
                      <MaterialCommunityIcons
                        color={color}
                        name={category.icon ?? 'map-marker-outline'}
                        size={wide ? 34 : 27}
                        style={{ includeFontPadding: false }}
                      />
                    </View>
                    <View className="absolute -bottom-1 -right-1 h-6 min-w-6 items-center justify-center rounded-full border-2 border-ui-background px-1 dark:border-ui-dark-background" style={{ backgroundColor: color }}>
                      <Text className="text-[10px] font-black text-white" style={{ includeFontPadding: false, lineHeight: 12, textAlignVertical: 'center' }}>{places.isPending ? '…' : count}</Text>
                    </View>
                  </View>
                  <Text className="mt-2 w-full text-center text-[13px] font-black leading-4 text-ui-text dark:text-ui-dark-text" numberOfLines={2} style={{ minHeight: 32 }}>{optionLabel(category, language)}</Text>
                </MotionPressable>
              );
            })}
          </View>
        ) : null}
        {coordinates && !hasSearch && !nearbyLoading ? <View className="mt-4 gap-3">{resultContent}</View> : null}
      </View>

      <View className="w-full" style={{ maxWidth: 1180, paddingHorizontal: wide ? 20 : 0 }}>
        <View className="bg-ui-background px-5 pb-2 dark:bg-ui-dark-background">
          <Text className="text-sm font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Mapa interactivo de CR' : 'Interactive map of Costa Rica'}</Text>
          <Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Presioná una provincia para acceder a los destinos.' : 'Tap a province to see its destinations.'}</Text>
        </View>
        {isFocused ? <MapCanvas /> : null}
        <View accessibilityRole={marineAlerts.data?.length ? 'alert' : undefined} className={`mx-5 mt-4 rounded-card border p-4 ${marineAlerts.data?.length ? 'border-coral-500/50 bg-red-50 dark:bg-red-950' : 'border-caribbean-200 bg-caribbean-50 dark:border-caribbean-800 dark:bg-caribbean-900/30'}`}><View className="flex-row items-center"><MaterialCommunityIcons name={marineAlerts.data?.length ? 'waves-arrow-up' : 'waves'} size={24} color={marineAlerts.data?.length ? '#B42318' : '#0077A8'} /><Text className={`ml-2 flex-1 text-base font-black ${marineAlerts.data?.length ? 'text-coral-600' : 'text-ui-text dark:text-ui-dark-text'}`}>{language === 'es' ? 'Alertas por oleaje elevado' : 'High surf alerts'}</Text></View>{marineAlerts.isPending ? <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Consultando las condiciones de las playas…' : 'Checking beach conditions…'}</Text> : marineAlerts.isError ? <Text accessibilityRole="alert" className="mt-2 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'El oleaje no está disponible en este momento. La app continúa funcionando.' : 'Surf data is unavailable right now. The app remains available.'}</Text> : marineAlerts.data?.length ? marineAlerts.data.map(({ conditions, id, name }) => <View className="mt-3" key={id}><Text className="font-black text-ui-text dark:text-ui-dark-text">{name}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Ola significativa' : 'Significant wave'}: {conditions.waveHeight?.toFixed(1) ?? '—'} m · {language === 'es' ? 'marejada' : 'swell'}: {conditions.swellHeight?.toFixed(1) ?? '—'} m / {conditions.swellPeriod?.toFixed(0) ?? '—'} s</Text></View>) : <Text className="mt-2 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Sin oleaje peligroso detectado en este momento.' : 'No dangerous surf detected right now.'}</Text>}<Pressable accessibilityRole="link" className="mt-2 min-h-11 justify-center self-start" onPress={() => void Linking.openURL(OPEN_METEO_MARINE_URL)}><Text className={`text-xs font-black ${marineAlerts.data?.length ? 'text-coral-600' : 'text-caribbean-700 dark:text-caribbean-100'}`}>{language === 'es' ? 'Datos: Open-Meteo · DWD (CC BY 4.0)' : 'Data: Open-Meteo · DWD (CC BY 4.0)'}</Text></Pressable></View>
        <View className="mx-5 mt-4 rounded-card border border-[#ffac16]/40 bg-ui-surface p-4 dark:bg-ui-dark-surface">
          <View className="flex-row items-center"><MaterialCommunityIcons name="alert-outline" size={24} color="#d97706" /><View className="ml-2.5 flex-1"><Text className="text-base font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Alertas viales actuales' : 'Current road alerts'}</Text><Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">Mapbox Traffic · {roadAlerts.data ? new Date(roadAlerts.data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (language === 'es' ? 'actualizando…' : 'updating…')}</Text></View></View>
          {roadAlerts.isPending ? <FrogLoader className="my-4" color="#d97706" /> : null}
          {roadAlerts.isError ? <View accessibilityRole="alert" className="mt-3"><Text className="font-bold text-coral-600">{language === 'es' ? 'No se pudo consultar Mapbox Traffic.' : 'Mapbox Traffic could not be reached.'}</Text><Pressable accessibilityRole="button" className="mt-3 min-h-11 justify-center self-start rounded-control border border-ui-border bg-ui-surface px-4 shadow-card dark:border-ui-dark-border dark:bg-ui-dark-surface" style={{ elevation: 6, shadowColor: '#073F31', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }} onPress={() => void roadAlerts.refetch()}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View> : null}
          <View className="mt-2 gap-2">{roadAlerts.data?.alerts.map((alert) => <RoadAlertRow alert={alert} key={alert.id} language={language} onReport={setReportingRoad} />)}</View>
          <Text className="mt-3 text-[10px] leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Congestión, cierres e incidentes de Mapbox. Actualización aproximada cada 8 minutos.' : 'Congestion, closures, and incidents from Mapbox. Updated approximately every 8 minutes.'}</Text>
        </View>
        <Pressable accessibilityRole="button" className="mx-5 mb-5 mt-3 min-h-12 flex-row items-center justify-center rounded-control border border-coral-500/40 bg-ui-surface px-5 py-3 shadow-card dark:bg-ui-dark-surface" style={{ elevation: 7, shadowColor: '#B42318', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.2, shadowRadius: 7 }} onPress={() => { setNearbyEnabled(false); setRoadReportOpen(true); }}>
          <MaterialCommunityIcons name="road-variant" size={21} color="#B42318" />
          <Text className="ml-2 font-black text-coral-600">{language === 'es' ? 'Reportar carretera afectada' : 'Report an affected road'}</Text>
        </Pressable>
      </View>

      <AppFooter language={language} />

      <ProposalModal language={language} onClose={() => setProposalOpen(false)} onPublished={() => void queryClient.invalidateQueries({ queryKey: ['explore-places'] })} open={proposalOpen} session={session} />
      <InformationReportModal language={language} onClose={() => { setRoadReportOpen(false); setReportingRoad(null); }} open={roadReportOpen || Boolean(reportingRoad)} targetKey={reportingRoad?.id ?? 'costa-rica-road-network'} targetLabel={reportingRoad?.name ?? (language === 'es' ? 'Carreteras de Costa Rica' : 'Costa Rica road network')} targetType="road" />
    </ScrollView>
  );
}

function NearbyButton({ enabled, language, loading, onPress }: { enabled: boolean; language: 'es' | 'en'; loading: boolean; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const wasLoading = useRef(false);
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (loading) {
      wasLoading.current = true;
      progress.value = reduceMotion ? 0.65 : withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, false);
      return () => cancelAnimation(progress);
    }
    progress.value = withTiming(0, { duration: 100 });
    if (wasLoading.current && !reduceMotion) scale.value = withSequence(withSpring(1.045, { damping: 14, stiffness: 320 }), withSpring(1, { damping: 13, stiffness: 280 }));
    wasLoading.current = false;
    return undefined;
  }, [loading, progress, reduceMotion, scale]);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const progressStyle = useAnimatedStyle(() => ({ width: progress.value * width }));

  return (
    <Animated.View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[{ flex: 1 }, buttonStyle]}>
      <MotionPressable
        accessibilityLabel={loading ? (language === 'es' ? 'Cargando destinos turísticos cercanos' : 'Loading nearby tourist destinations') : undefined}
        accessibilityRole="button"
        accessibilityState={{ selected: enabled, busy: loading, disabled: loading }}
        disabled={loading}
        className="relative min-h-12 flex-1 flex-row items-center justify-center overflow-hidden rounded-2xl border border-white/60 px-3 py-3"
        containerStyle={{ flex: 1 }}
        onPress={onPress}
        style={{ backgroundColor: volcanoColor, elevation: 9, shadowColor: '#163D3F', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.34, shadowRadius: 8 }}
      >
        <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(0,0,0,0.12)']} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
        {!loading ? <AnimatedShine travel={420} /> : null}
        <MaterialCommunityIcons name="crosshairs-gps" size={21} color="white" />
        <Text className="ml-2 flex-shrink text-center text-xs font-black text-white" numberOfLines={2}>{loading ? (language === 'es' ? 'Cargando cercanos…' : 'Loading nearby…') : (language === 'es' ? 'Destinos Turísticos Cercanos' : 'Nearby Tourist Destinations')}</Text>
        {loading ? <View className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#7DD3FC]"><Animated.View className="h-full bg-[#F97316]" style={progressStyle} /></View> : null}
      </MotionPressable>
    </Animated.View>
  );
}

function RoadAlertRow({ alert, language, onReport }: { alert: RoadTrafficAlert; language: 'es' | 'en'; onReport: (alert: RoadTrafficAlert) => void }) {
  const colors = alert.status === 'closed' ? ['#7f1d1d', '#fee2e2'] : alert.status === 'heavy' ? ['#b45309', '#fff7ed'] : alert.status === 'moderate' ? ['#a16207', '#fefce8'] : ['#047857', '#ecfdf5'];
  return <View className="rounded-2xl border border-ui-border bg-ui-muted p-3 dark:border-ui-dark-border dark:bg-ui-dark-muted"><View className="flex-row items-start"><Text className="flex-1 font-black text-ui-text dark:text-ui-dark-text">{alert.name}</Text><View className="ml-2 rounded-xl px-2.5 py-1.5" style={{ backgroundColor: colors[1] }}><Text className="text-xs font-black" style={{ color: colors[0] }}>{alert.statusLabel}</Text></View></View><Text className="mt-1 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{alert.detail}</Text><Pressable accessibilityRole="button" className="mt-2 min-h-11 justify-center self-start rounded-xl border border-ui-border bg-ui-surface px-3 shadow-card dark:border-ui-dark-border dark:bg-ui-dark-surface" style={{ elevation: 6, shadowColor: colors[0], shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }} onPress={() => onReport(alert)}><Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Reportar carretera afectada' : 'Report affected road'}</Text></Pressable></View>;
}

function PlaceResultsSkeleton({ language, large }: { language: 'es' | 'en'; large: boolean }) {
  return (
    <View accessibilityLabel={language === 'es' ? 'Cargando destinos' : 'Loading destinations'} accessibilityRole="progressbar" className="gap-3">
      {[0, 1, 2].map((item) => (
        <View className={large ? 'overflow-hidden rounded-card border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface' : 'h-[78px] flex-row items-center rounded-control border border-ui-border bg-ui-surface p-3 dark:border-ui-dark-border dark:bg-ui-dark-surface'} key={item}>
          {large ? (
            <>
              <Skeleton style={{ height: 180, width: '100%' }} />
              <View className="gap-2 p-4">
                <Skeleton style={{ height: 18, width: '64%' }} />
                <Skeleton style={{ height: 12, width: '92%' }} />
                <Skeleton style={{ height: 12, width: '72%' }} />
              </View>
            </>
          ) : (
            <>
              <Skeleton style={{ borderRadius: 16, height: 52, width: 52 }} />
              <View className="ml-3 flex-1 gap-2">
                <Skeleton style={{ height: 16, width: '68%' }} />
                <Skeleton style={{ height: 12, width: '88%' }} />
              </View>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

function CategoryGridSkeleton({ language, wide }: { language: 'es' | 'en'; wide: boolean }) {
  const size = wide ? 72 : 62;
  return (
    <View accessibilityLabel={language === 'es' ? 'Cargando categorías' : 'Loading categories'} accessibilityRole="progressbar" className="w-full flex-row flex-wrap">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <View className="items-center px-1 py-3" key={item} style={{ width: '25%' }}>
          <Skeleton style={{ borderRadius: size / 2, height: size, width: size }} />
          <Skeleton style={{ height: 12, marginTop: 10, width: 72 }} />
        </View>
      ))}
    </View>
  );
}

function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

function nameSearchScore(name: string, term: string) {
  const normalizedName = normalizeSearchText(name);
  const nameWords = normalizedName.split(/[^a-z0-9]+/).filter(Boolean);
  const termWords = term.split(/[^a-z0-9]+/).filter(Boolean);
  if (!termWords.length) return null;
  if (normalizedName === term) return 0;
  if (normalizedName.startsWith(term)) return 1;
  if (termWords.every((word) => nameWords.includes(word))) return 2;
  if (termWords.every((word) => nameWords.some((nameWord) => nameWord.startsWith(word)))) return 3;
  return normalizedName.includes(term) ? 4 : null;
}

function DestinationPreviewCarousel({ active, large, place }: { active: boolean; large: boolean; place: ExplorePlace }) {
  const photos = [...new Set([place.cover_image_url, ...place.photos].filter((url): url is string => Boolean(url)))];
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [place.id]);
  const source = !failed && photos[0] ? { uri: photos[0] } : fallbackDestinationThumbnail;
  return <Image accessibilityLabel={place.name} cachePolicy="memory-disk" contentFit="cover" onError={() => setFailed(true)} placeholder={destinationPlaceholder} placeholderContentFit="cover" priority={active ? 'high' : 'normal'} source={source} style={large ? { height: 180, width: '100%' } : { borderRadius: 16, flexShrink: 0, height: 52, width: 52 }} transition={160} />;
}

function PlaceResult({ active, followed, formatPrice, language, large, onFollow, onPress, ownContribution, place, route }: { active: boolean; followed: boolean; formatPrice: (value: number) => string; language: 'es' | 'en'; large: boolean; onFollow: () => void; onPress: () => void; ownContribution: boolean; place: ExplorePlace; route: RoadRoute | null }) {
  const weather = useQuery({ queryKey: ['weather', 'destination', place.id, language], queryFn: () => getWeather(place, language), enabled: active, staleTime: WEATHER_STALE_TIME });
  const weatherIcon = weather.data ? weatherIcons[weather.data.icon.slice(0, 2) as keyof typeof weatherIcons] ?? 'weather-cloudy' : null;
  const documentedAuthorities = place.verification_evidence_url && place.verification_checked_at ? place.validated_by : [];
  const description = language === 'es' ? place.description : place.description_en;
  if (large) {
    return (
      <Pressable accessibilityRole="button" className="overflow-hidden rounded-card border border-ui-border bg-ui-surface shadow-card active:opacity-85 dark:border-ui-dark-border dark:bg-ui-dark-surface" style={{ elevation: 7, shadowColor: '#073F31', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.18, shadowRadius: 7 }} onPress={onPress}>
        <DestinationPreviewCarousel active={active} large place={place} />
        <View className="p-4">
          <View className="flex-row flex-wrap items-center">
            <Text className="flex-shrink text-lg font-black text-ui-text dark:text-ui-dark-text" numberOfLines={2}>{place.name}</Text>
            {place.community ? <Text className="ml-2 rounded-full bg-ui-primary-soft px-2 py-1 text-[10px] font-black text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary">{language === 'es' ? 'APORTE DE VIAJERO' : 'TRAVELLER CONTRIBUTION'}</Text> : null}
            {place.community && place.community_verified_at ? <Text className="ml-2 rounded-full bg-[#0B6B4F] px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'UBICACIÓN VERIFICADA' : 'LOCATION VERIFIED'}</Text> : null}
            {documentedAuthorities.map((authority) => <Text className="ml-2 rounded-full bg-ui-primary px-2 py-1 text-[10px] font-black text-white dark:bg-ui-dark-primary" key={authority}>{language === 'es' ? 'FUENTE OFICIAL' : 'OFFICIAL SOURCE'} {authority}</Text>)}
          </View>
          <Text className="mt-2 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={2}>{description ?? (language === 'es' ? 'Descubrí este destino y planificá tu visita.' : 'Discover this destination and plan your visit.')}</Text>
          <Text className="mt-3 text-sm font-bold text-ui-text dark:text-ui-dark-text">{place.province} · {place.category}</Text>
          {weather.data && weatherIcon ? <View className="mt-2 flex-row items-center"><MaterialCommunityIcons accessibilityElementsHidden name={weatherIcon} size={20} color="#0077A8" /><Text className="ml-1 text-xs font-black capitalize text-caribbean-700 dark:text-caribbean-100">{weather.data.temperature}°{weather.data.temperatureUnit} · {weather.data.description}</Text></View> : null}
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-sm font-black text-ui-primary dark:text-ui-dark-primary">{place.price_national_crc == null ? (language === 'es' ? 'Consultar precio' : 'Check price') : formatPrice(place.price_national_crc)}</Text>
            {route ? <Text className="ml-2 flex-1 text-right text-xs font-black text-ui-secondary dark:text-ui-dark-secondary">{roadRouteLabel(route, language)}</Text> : <MaterialCommunityIcons name="arrow-right" size={21} color="#0077A8" />}
          </View>
          {place.community && place.contributor_name && !ownContribution ? <Pressable className="mt-3 self-start rounded-full bg-ui-primary-soft px-3 py-2 shadow-card dark:bg-ui-dark-primary-soft" style={{ elevation: 5, shadowColor: '#073F31', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.2, shadowRadius: 5 }} onPress={(event) => { event.stopPropagation(); onFollow(); }}><Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{followed ? (language === 'es' ? 'Siguiendo' : 'Following') : language === 'es' ? `Seguir a ${place.contributor_name}` : `Follow ${place.contributor_name}`}</Text></Pressable> : null}
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityLabel={`${language === 'es' ? 'Abrir ficha de' : 'Open details for'} ${place.name}`} accessibilityRole="button" className="flex-row items-center border-b border-ui-border p-3 active:bg-ui-muted last:border-b-0 dark:border-ui-dark-border dark:active:bg-ui-dark-muted" onPress={onPress}>
      <DestinationPreviewCarousel active={active} large={false} place={place} />
      <View className="ml-3 flex-1">
        <View className="flex-row flex-wrap items-center">
          <Text className="flex-shrink text-base font-black text-ui-text dark:text-ui-dark-text" numberOfLines={2}>
            {place.name}
          </Text>
          {place.community ? <Text className="ml-2 rounded-full bg-ui-primary-soft px-2 py-1 text-[10px] font-black text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary">{language === 'es' ? 'APORTE DE VIAJERO' : 'TRAVELLER CONTRIBUTION'}</Text> : null}
          {place.community && place.community_verified_at ? <Text className="ml-2 rounded-full bg-[#0B6B4F] px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'UBICACIÓN VERIFICADA' : 'LOCATION VERIFIED'}</Text> : null}
          {documentedAuthorities.map((authority) => (
            <Text className="ml-2 rounded-full bg-[#0B6B4F] px-2 py-1 text-[10px] font-black text-white" key={authority}>
              {language === 'es' ? 'FUENTE OFICIAL' : 'OFFICIAL SOURCE'} {authority}
            </Text>
          ))}
        </View>
        {place.community && place.contributor_name ? (
          <View className="mt-1 flex-row items-center">
            <Text className="flex-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary">
              {language === 'es' ? 'Lugar añadido por' : 'Place added by'} {place.contributor_name}
            </Text>
            {!ownContribution ? (
              <Pressable
                className="ml-2 rounded-full bg-ui-primary-soft px-3 py-1.5 dark:bg-ui-dark-primary-soft"
                onPress={(event) => {
                  event.stopPropagation();
                  onFollow();
                }}
              >
                <Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{followed ? (language === 'es' ? 'Siguiendo' : 'Following') : language === 'es' ? 'Seguir' : 'Follow'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>
          {place.province} · {place.category} · {place.price_national_crc == null ? (language === 'es' ? 'Consultar' : 'Check price') : formatPrice(place.price_national_crc)}
        </Text>
        {weather.data && weatherIcon ? <View className="mt-1 flex-row items-center"><MaterialCommunityIcons accessibilityElementsHidden name={weatherIcon} size={18} color="#0077A8" /><Text className="ml-1 flex-shrink text-xs font-black capitalize text-caribbean-700 dark:text-caribbean-100" numberOfLines={1}>{weather.data.temperature}°{weather.data.temperatureUnit} · {weather.data.description}</Text></View> : null}
      </View>
      {route ? <Text className="ml-2 max-w-36 flex-shrink text-right text-xs font-black text-ui-secondary dark:text-ui-dark-secondary">{roadRouteLabel(route, language)}</Text> : <MaterialCommunityIcons name="chevron-right" size={23} color="#0077A8" />}
    </Pressable>
  );
}

function ProposalModal({ language, onClose, onPublished, open, session }: { language: 'es' | 'en'; onClose: () => void; onPublished: () => void; open: boolean; session: ReturnType<typeof useApp>['session'] }) {
  const router = useRouter();
  const subscriptions = useQuery({ queryKey: ['my-subscriptions'], queryFn: getMySubscriptions, enabled: open && Boolean(session) });
  const categoryOptions = useQuery({
    queryKey: ['app-options', 'destination_category', 'v2'],
    queryFn: () => getAppOptions('destination_category'),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const difficultyOptions = useQuery({
    queryKey: ['app-options', 'destination_difficulty'],
    queryFn: () => getAppOptions('destination_difficulty'),
    enabled: open,
    staleTime: Infinity,
  });
  const [name, setName] = useState('');
  const [province, setProvince] = useState('San José');
  const [categories, setCategories] = useState<string[]>([]);
  const [district, setDistrict] = useState('');
  const [price, setPrice] = useState('0');
  const [difficulty, setDifficulty] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [manualLocation, setManualLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [manualPickerOpen, setManualPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const selectCurrentLocation = async () => {
    try {
      setLocating(true);
      const current = await getPreciseCurrentLocation(language);
      setManualLocation({ latitude: current.latitude, longitude: current.longitude });
      void haptic('success');
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : language === 'es' ? 'No se pudo obtener la ubicación.' : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };
  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - photos.length,
      quality: 0.85,
    });
    if (!result.canceled) setPhotos((current) => [...current, ...result.assets].slice(0, 10));
  };
  useEffect(() => {
    if (!difficulty && difficultyOptions.data?.[0]) setDifficulty(difficultyOptions.data[0].id);
  }, [difficulty, difficultyOptions.data]);
  const submit = async () => {
    if (!session || name.trim().length < 3 || description.trim().length < 10) return Alert.alert('Descubriendo CR', language === 'es' ? 'Agregá un nombre y una descripción de al menos 10 caracteres.' : 'Add a name and a description of at least 10 characters.');
    if (categories.length < 1 || categories.length > 3) return Alert.alert('Descubriendo CR', language === 'es' ? 'Seleccioná entre una y tres categorías.' : 'Select between one and three categories.');
    const commercialCategory = categories.includes('gastronomy') ? 'food' : categories.includes('nightlife') ? 'nightlife' : null;
    if (commercialCategory) {
      const goToRegistration = () => { onClose(); router.push({ pathname: '/(tabs)/commerce', params: { openRegistration: '1', registerCategory: commercialCategory } }); };
      const currentSubscriptions = subscriptions.isLoading ? (await subscriptions.refetch()).data ?? [] : subscriptions.data ?? [];
      if (hasActiveBusinessPlan(currentSubscriptions)) return goToRegistration();
      return Alert.alert(
        language === 'es' ? 'Suscripción de comercio requerida' : 'Business subscription required',
        language === 'es'
          ? 'Para agregar sitios en Experiencia gastronómica o Vida nocturna primero debés adquirir la suscripción Comercio o servicio.'
          : 'To add places under Gastronomic experience or Nightlife, you must first purchase the Business or service subscription.',
        [
          { text: language === 'es' ? 'Ahora no' : 'Not now', style: 'cancel' },
          { text: language === 'es' ? 'Ver suscripción' : 'View subscription', onPress: () => { onClose(); router.push({ pathname: '/subscriptions', params: { intent: 'business' } }); } },
        ],
      );
    }
    if (photos.length < 1 || photos.length > 10) return Alert.alert('Descubriendo CR', language === 'es' ? 'Seleccioná entre 1 y 10 imágenes del sitio.' : 'Select between 1 and 10 place images.');
    if (!manualLocation) return Alert.alert('Descubriendo CR', language === 'es' ? 'Ubicá el sitio en el mapa antes de publicarlo.' : 'Place the site on the map before publishing it.');
    setSending(true);
    try {
      const location = manualLocation;
      await publishCommunityPlace({
        user_id: session.user.id,
        name: name.trim(),
        province,
        category: categories
          .map((categoryId) => categoryOptions.data?.find((option) => option.id === categoryId)?.label_es ?? categoryId)
          .join(' / '),
        district: district.trim() || undefined,
        description: description.trim(),
        difficulty,
        price_national_crc: Math.max(0, Number(price.replace(',', '.')) || 0),
        latitude: location.latitude,
        longitude: location.longitude,
        photo_assets: photos,
      });
      void haptic('success');
      onPublished();
      onClose();
      setName('');
      setDescription('');
      setPhotos([]);
      setCategories([]);
      setManualLocation(undefined);
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : language === 'es' ? 'No se pudo publicar.' : 'Could not publish.');
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}>
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <View className="max-h-[92%] w-full max-w-2xl overflow-hidden rounded-modal bg-ui-surface dark:bg-ui-dark-surface">
          <View className="flex-row items-center border-b border-ui-border p-5 dark:border-ui-dark-border">
            <MaterialCommunityIcons name="plus-circle-outline" size={27} color="#0B6B4F" />
            <Text className="ml-3 flex-1 text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Publicar un nuevo lugar' : 'Publish a new place'}</Text>
            <Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} accessibilityRole="button" onPress={onClose}>
              <MaterialCommunityIcons name="close" size={26} color="#68737A" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 16, padding: 20 }}>
            <Field label={language === 'es' ? 'Nombre del lugar' : 'Place name'} onChange={setName} placeholder="Ej: Poza Azul" value={name} />
            <ChoiceField label={language === 'es' ? 'Provincia' : 'Province'} onChange={setProvince} options={provinces.map((item) => item.name)} value={province} />
            <CategoryChoiceField language={language} onChange={setCategories} options={(categoryOptions.data ?? []).filter((option) => option.parent_id === null)} value={categories} />
            <Field label={language === 'es' ? 'Cantón / Pueblo' : 'Town / District'} onChange={setDistrict} placeholder={language === 'es' ? 'Ej: Bajos del Toro' : 'Example: Bajos del Toro'} value={district} />
            <Field keyboard label={language === 'es' ? 'Precio de entrada (₡)' : 'Entry price (CRC)'} onChange={setPrice} placeholder="0" value={price} />
            <OptionChoiceField label={language === 'es' ? 'Dificultad física' : 'Difficulty'} language={language} onChange={setDifficulty} options={difficultyOptions.data ?? []} value={difficulty} />
            <View>
              <Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ubicación del sitio' : 'Place location'}</Text>
              <View className="rounded-control border border-ui-border bg-ui-muted p-4 dark:border-ui-dark-border dark:bg-ui-dark-muted">
                  <Text className="text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{manualLocation ? `${manualLocation.latitude.toFixed(5)}, ${manualLocation.longitude.toFixed(5)}` : language === 'es' ? 'Abrí el mapa para buscar y elegir el punto exacto.' : 'Open the map to search and choose the exact point.'}</Text>
                  <Pressable accessibilityRole="button" className="mt-3 min-h-12 flex-row items-center justify-center rounded-control bg-ui-primary px-4 disabled:opacity-50 dark:bg-ui-dark-primary" disabled={locating} onPress={() => void selectCurrentLocation()}><MaterialCommunityIcons name="crosshairs-gps" size={21} color="white" /><Text className="ml-2 font-black text-white">{locating ? (language === 'es' ? 'Obteniendo ubicación…' : 'Getting location…') : (language === 'es' ? 'Usar ubicación actual' : 'Use current location')}</Text></Pressable>
                  <Pressable accessibilityRole="button" className="mt-3 min-h-12 flex-row items-center justify-center rounded-control bg-ui-secondary px-4 dark:bg-ui-dark-secondary" onPress={() => setManualPickerOpen(true)}><MaterialCommunityIcons name="map-search-outline" size={21} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? (manualLocation ? 'Cambiar ubicación en el mapa' : 'Ubicar en el mapa') : (manualLocation ? 'Change map location' : 'Pick on map')}</Text></Pressable>
                  {manualLocation ? <Pressable accessibilityRole="link" className="mt-3 min-h-12 flex-row items-center justify-center rounded-control border border-ui-primary px-4 dark:border-ui-dark-primary" onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${manualLocation.latitude},${manualLocation.longitude}`)}><MaterialCommunityIcons name="map-marker-radius" size={21} color="#0B6B4F" /><Text className="ml-2 font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Previsualizar ubicación' : 'Preview location'}</Text><MaterialCommunityIcons name="open-in-new" size={18} color="#0B6B4F" /></Pressable> : null}
                  <LocationPickerModal initialLocation={manualLocation} language={language} onClose={() => setManualPickerOpen(false)} onConfirm={setManualLocation} open={manualPickerOpen} title={language === 'es' ? 'Ubicación del sitio' : 'Place location'} />
              </View>
            </View>
            <Field label={language === 'es' ? 'Descripción y cómo llegar' : 'Description and directions'} multiline onChange={setDescription} placeholder={language === 'es' ? 'Describí el sitio y cómo llegar…' : 'Describe the place and how to get there…'} value={description} />
            <View>
              <Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Fotos del sitio' : 'Place photos'}</Text>
              <Pressable accessibilityLabel={language === 'es' ? 'Seleccionar fotos del dispositivo' : 'Select photos from device'} accessibilityRole="button" className="min-h-12 flex-row items-center justify-center rounded-control border border-dashed border-ui-primary bg-ui-primary-soft px-4 dark:bg-ui-dark-primary-soft" disabled={photos.length >= 10 || sending} onPress={() => void pickPhotos()}>
                <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#0B6B4F" />
                <Text className="ml-2 font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? `Agregar imágenes (${photos.length}/10)` : `Add images (${photos.length}/10)`}</Text>
              </Pressable>
              <Text className="mt-2 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Mínimo 1, máximo 10. JPG, PNG o WebP; hasta 6 MB por imagen.' : 'Minimum 1, maximum 10. JPG, PNG or WebP; up to 6 MB each.'}</Text>
              {photos.length ? <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>{photos.map((photo, index) => <View className="relative" key={`${photo.assetId ?? photo.uri}-${index}`}><Image contentFit="cover" source={{ uri: photo.uri }} style={{ borderRadius: 12, height: 88, width: 110 }} /><Pressable accessibilityLabel={language === 'es' ? `Quitar imagen ${index + 1}` : `Remove image ${index + 1}`} accessibilityRole="button" className="absolute right-1 top-1 h-8 w-8 items-center justify-center rounded-full bg-black/70" disabled={sending} onPress={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}><MaterialCommunityIcons name="close" size={18} color="white" /></Pressable></View>)}</ScrollView> : null}
            </View>
            <View className="rounded-control bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft">
              <Text className="text-sm font-bold leading-5 text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Se guardará el punto que seleccionaste en el mapa y aparecerá como aporte de la comunidad.' : 'The point you selected on the map will be saved as a community contribution.'}</Text>
            </View>
            <MotionPressable accessibilityRole="button" className="items-center rounded-control bg-ui-primary p-4 dark:bg-ui-dark-primary" disabled={sending} onPress={() => void submit()}>
              {sending ? <FrogLoader color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar ahora' : 'Publish now'}</Text>}
            </MotionPressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ keyboard, label, multiline, onChange, placeholder, value }: { keyboard?: boolean; label: string; multiline?: boolean; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <View>
      <Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{label}</Text>
      <TextInput className="rounded-control border border-ui-border bg-ui-muted px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType={keyboard ? 'decimal-pad' : 'default'} multiline={multiline} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#68737A" style={multiline ? { minHeight: 90, textAlignVertical: 'top' } : undefined} value={value} />
    </View>
  );
}
function ChoiceField({ label, language = 'es', onChange, options, value }: { label: string; language?: 'es' | 'en'; onChange: (value: string) => void; options: string[]; value: string }) {
  const difficultyLabels = {
    Fácil: 'Easy',
    Moderada: 'Moderate',
    Difícil: 'Difficult',
  } as Record<string, string>;
  return (
    <View>
      <Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{label}</Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
        {options.map((option) => (
          <MotionPressable className={value === option ? 'rounded-full bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'rounded-full bg-ui-muted px-4 py-3 dark:bg-ui-dark-muted'} key={option} onPress={() => { void haptic('selection'); onChange(option); }}>
            <Text className={value === option ? 'font-black text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'en' ? (difficultyLabels[option] ?? option) : option}</Text>
          </MotionPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function OptionChoiceField({ label, language, onChange, options, value }: { label: string; language: 'es' | 'en'; onChange: (value: string) => void; options: AppOption[]; value: string }) {
  return (
    <View>
      <Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{label}</Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
        {options.map((option) => (
          <MotionPressable className={value === option.id ? 'rounded-full bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'rounded-full bg-ui-muted px-4 py-3 dark:bg-ui-dark-muted'} key={option.id} onPress={() => { void haptic('selection'); onChange(option.id); }}>
            <Text className={value === option.id ? 'font-black text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{optionLabel(option, language)}</Text>
          </MotionPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function CategoryChoiceField({ language, onChange, options, value }: { language: 'es' | 'en'; onChange: (value: string[]) => void; options: AppOption[]; value: string[] }) {
  const toggle = (option: string) => {
    void haptic('selection');
    if (value.includes(option)) return onChange(value.filter((item) => item !== option));
    if (value.length === 3) return Alert.alert('Descubriendo CR', language === 'es' ? 'Podés seleccionar un máximo de tres categorías.' : 'You can select up to three categories.');
    onChange([...value, option]);
  };
  return (
    <View>
      <Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Categorías' : 'Categories'}</Text>
      <Text className="mb-2 mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Elegí hasta tres.' : 'Choose up to three.'}</Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
        {options.map((option) => {
          const selected = value.includes(option.id);
          return (
            <MotionPressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} className={selected ? 'rounded-full bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'rounded-full bg-ui-muted px-4 py-3 dark:bg-ui-dark-muted'} key={option.id} onPress={() => toggle(option.id)}>
              <Text className={selected ? 'font-black text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{optionLabel(option, language)}</Text>
            </MotionPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function optionLabel(option: AppOption, language: 'es' | 'en') {
  return language === 'es' ? option.label_es : option.label_en;
}
