import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused, useScrollToTop } from 'expo-router/react-navigation';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { MapCanvas } from '@/components/explore/map-canvas';
import { AppFooter } from '@/components/app-footer';
import { InformationReportModal } from '@/components/information-report-modal';
import { MotionPressable, Skeleton } from '@/components/motion';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { getAppOptions, type AppOption } from '@/lib/app-options';
import { haptic } from '@/lib/haptics';
import { getLiveRoadAlerts, type RoadTrafficAlert } from '@/lib/logistics';
import { getExplorePlaces, matchesSearchTargets, publishCommunityPlace, type ExplorePlace } from '@/lib/places';
import { provinces } from '@/lib/provinces';
import { getFollowedTravelerIds, toggleTravelerFollow } from '@/lib/travelers';
import { useApp } from '@/providers/app-provider';

const fallbackDestinationThumbnail = require('../../../assets/images/startup-rainforest.gif');
const destinationPlaceholder = { blurhash: 'L9C6cY00M{~q%MxuRjof00ofxuWB' };

const volcanoColor = '#5F9EA0';
const categoryColors = ['#2A7B4C', '#1E5B75', volcanoColor, '#B58A5A', '#7D9E8A', '#6F8FB3'];

export default function ExploreScreen() {
  const { formatPrice, language, requireAuth, session } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const router = useRouter();
  const isFocused = useIsFocused();
  const { reset: resetToken } = useLocalSearchParams<{ reset?: string }>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
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
    refetchInterval: 8 * 60 * 1000,
    staleTime: 8 * 60 * 1000,
  });
  const followed = useQuery({
    queryKey: ['followed-travelers', session?.user.id],
    queryFn: () => getFollowedTravelerIds(session?.user.id),
    staleTime: 60 * 1000,
  });
  const resetExplore = useCallback(() => {
    setSearch('');
    setCoordinates(undefined);
    setProposalOpen(false);
  }, []);
  useEffect(() => {
    if (resetToken) resetExplore();
  }, [resetExplore, resetToken]);
  useEffect(() => {
    if (!isFocused) setSearch('');
  }, [isFocused]);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!proposalOpen && !search && !coordinates) return false;
        resetExplore();
        return true;
      });
      return () => subscription.remove();
    }, [coordinates, proposalOpen, resetExplore, search]),
  );
  const categoryOptions = useMemo(() => destinationCategories.data ?? [], [destinationCategories.data]);
  const rootCategories = useMemo(() => categoryOptions.filter((option) => option.parent_id === null), [categoryOptions]);
  const visiblePlaces = useMemo(() => {
    const term = normalizeSearchText(search);
    const matches = (places.data ?? []).flatMap((place) => {
      const score = term ? nameSearchScore(place.name, term) : 0;
      return score === null || (!term && !coordinates) ? [] : [{ place, score }];
    });
    if (coordinates) return matches.sort((a, b) => distanceKm(coordinates, a.place) - distanceKm(coordinates, b.place) || a.score - b.score).map(({ place }) => place);
    return matches.sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name, language === 'es' ? 'es' : 'en')).map(({ place }) => place);
  }, [coordinates, language, places.data, search]);
  const hasSearch = Boolean(search.trim());

  const discover = async () => {
    if (coordinates) {
      setCoordinates(undefined);
      void haptic('selection');
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', language === 'es' ? 'Necesitamos tu ubicación para ordenar los sitios cercanos.' : 'Location permission is required to sort nearby places.');
    const cachedPosition = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 5000 });
    if (cachedPosition) {
      setCoordinates(cachedPosition.coords);
      void haptic('success');
      void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((position) => setCoordinates(position.coords))
        .catch(() => undefined);
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinates(position.coords);
    void haptic('success');
  };
  const resultContent = (
    <View className="overflow-hidden rounded-control border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface">
      {places.isPending ? (
        <PlaceResultsSkeleton large={false} language={language} />
      ) : (
        visiblePlaces.slice(0, hasSearch ? 5 : 20).map((place) => (
          <PlaceResult
            active={isFocused}
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
              setSearch('');
              router.push({ pathname: '/(aux)/province', params: { category: place.category, destinationId: place.id, direct: '1', ...(place.community ? { community: '1' } : {}) } });
            }}
            origin={coordinates}
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
    <ScrollView ref={scrollRef} className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ alignItems: 'center', paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View className="w-full px-4 pb-4 pt-5" style={{ maxWidth: 1180, zIndex: 10 }}>
        <View className="w-full flex-row items-stretch gap-2">
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(coordinates) }}
            className="relative min-h-12 flex-1 flex-row items-center justify-center overflow-hidden rounded-2xl border border-white/60 px-3 py-3"
            containerStyle={{ flex: 1 }}
            onPress={() => void discover()}
            style={{ backgroundColor: volcanoColor, elevation: 9, shadowColor: '#163D3F', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.34, shadowRadius: 8 }}
          >
            <LinearGradient colors={['rgba(255,255,255,0.40)', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.14)']} locations={[0, 0.48, 1]} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
            <View className="absolute left-4 right-4 top-1 h-[2px] rounded-full bg-white/90" />
            <MaterialCommunityIcons name="crosshairs-gps" size={21} color="white" />
            <Text className="ml-2 flex-shrink text-center text-xs font-black text-white" numberOfLines={2}>{language === 'es' ? 'Destinos Turísticos Cercanos' : 'Nearby Tourist Destinations'}</Text>
          </MotionPressable>
          <MotionPressable
            accessibilityRole="button"
            className="relative min-h-12 flex-row items-center justify-center overflow-hidden rounded-2xl border border-[#5DB990] bg-[#DDF3E8] px-3 py-3 dark:border-[#47C08A] dark:bg-[#164330]"
            containerStyle={{ width: 128 }}
            onPress={() => router.push({ pathname: '/(tabs)/fauna', params: { from: 'explore' } })}
            style={{ elevation: 8, shadowColor: '#07543F', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.3, shadowRadius: 8 }}
          >
            <LinearGradient colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.08)', 'rgba(7,84,63,0.13)']} locations={[0, 0.5, 1]} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
            <View className="absolute left-4 right-4 top-1 h-[2px] rounded-full bg-white/90" />
            <MaterialCommunityIcons name="paw" size={19} color="#07543F" />
            <Text className="ml-1.5 text-xs font-black text-[#07543F] dark:text-[#8DE0B6]">{language === 'es' ? 'Fauna' : 'Wildlife'}</Text>
          </MotionPressable>
        </View>
        <Text className="mb-1.5 mt-3 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Busca un sitio por nombre' : 'Search for a place by name'}</Text>
        <View className="relative">
          <View className="flex-row items-stretch gap-2">
            <View className="min-w-0 flex-1 flex-row items-center rounded-control border border-ui-border bg-ui-surface px-4 dark:border-ui-dark-border dark:bg-ui-dark-surface">
              <MaterialCommunityIcons name="magnify" size={23} color="#68737A" />
              <TextInput accessibilityLabel={language === 'es' ? 'Buscar lugares' : 'Search places'} className="ml-3 flex-1 py-4 text-ui-text dark:text-ui-dark-text" onChangeText={setSearch} placeholder={language === 'es' ? 'Ej. Playa Doña Ana' : 'E.g. Doña Ana Beach'} placeholderTextColor="#68737A" value={search} />
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
                setProposalOpen(true);
              }}
              style={{ elevation: 9, shadowColor: '#073F31', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.36, shadowRadius: 8 }}
            >
              <LinearGradient colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.04)', 'rgba(3,30,24,0.24)']} locations={[0, 0.48, 1]} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
              <View className="absolute left-4 right-4 top-1 h-[2px] rounded-full bg-white/80" />
              <MaterialCommunityIcons name="plus" size={19} color="white" />
              <Text className="ml-1.5 text-center text-xs font-black leading-3 text-white">{language === 'es' ? 'Agregar\nnuevo sitio' : 'Add\nnew place'}</Text>
            </MotionPressable>
          </View>
          {hasSearch ? <View className="absolute left-0 right-0 z-20" style={{ elevation: 20, marginTop: 8, top: '100%' }}>{resultContent}</View> : null}
        </View>
        {coordinates ? <Text className="mt-3 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Ordenados del más cercano al más lejano.' : 'Sorted from nearest to farthest.'}</Text> : null}
        {!coordinates ? (
          <View className="mt-5 flex-row flex-wrap">
            {destinationCategories.isPending ? <CategoryGridSkeleton language={language} wide={wide} /> : null}
            {rootCategories.map((category, index) => {
              const count = (places.data ?? []).filter((place) => matchesOption(place, category)).length;
              const color = categoryColors[index % categoryColors.length];
              return (
                <MotionPressable
                  accessibilityLabel={`${optionLabel(category, language)}, ${places.isPending ? (language === 'es' ? 'cargando cantidad' : 'loading count') : `${count} ${language === 'es' ? 'sitios' : 'places'}`}`}
                  accessibilityRole="button"
                  className="my-1 items-center rounded-card border border-ui-border bg-ui-surface px-1 py-3 shadow-card dark:border-ui-dark-border dark:bg-ui-dark-surface"
                  containerStyle={{ paddingHorizontal: 2, width: '25%' }}
                  key={category.id}
                  onPress={() => { router.push({ pathname: '/(aux)/province', params: { categoryId: category.id } }); void haptic('selection'); }}
                  style={{ elevation: 7, shadowColor: color, shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.24, shadowRadius: 7 }}
                >
                  <View className="items-center justify-center" style={{ backgroundColor: `${color}20`, borderRadius: (wide ? 64 : 51) / 2, height: wide ? 64 : 51, width: wide ? 64 : 51 }}>
                    <MaterialCommunityIcons name={category.icon ?? 'map-marker-outline'} size={wide ? 34 : 27} color={color} />
                    <View className="absolute -bottom-1 -right-1 h-6 min-w-6 items-center justify-center rounded-full border-2 border-ui-background px-1 dark:border-ui-dark-background" style={{ backgroundColor: color }}>
                      <Text className="text-[10px] font-black text-white">{places.isPending ? '…' : count}</Text>
                    </View>
                  </View>
                  <Text className="mt-2 text-center text-[13px] font-black text-ui-text dark:text-ui-dark-text" numberOfLines={2}>{optionLabel(category, language)}</Text>
                </MotionPressable>
              );
            })}
          </View>
        ) : null}
        {coordinates && !hasSearch ? <View className="mt-4 gap-3">{resultContent}</View> : null}
      </View>

      <View className="w-full" style={{ maxWidth: 1180, paddingHorizontal: wide ? 20 : 0 }}>
        <View className="bg-ui-background px-5 pb-2 dark:bg-ui-dark-background">
          <Text className="text-sm font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Mapa interactivo de CR' : 'Interactive map of Costa Rica'}</Text>
          <Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Presioná una provincia para acceder a los destinos.' : 'Tap a province to see its destinations.'}</Text>
        </View>
        {isFocused ? <MapCanvas /> : null}
        <View className="mx-5 mt-4 rounded-card border border-[#ffac16]/40 bg-ui-surface p-4 dark:bg-ui-dark-surface">
          <View className="flex-row items-center"><MaterialCommunityIcons name="alert-outline" size={24} color="#d97706" /><View className="ml-2.5 flex-1"><Text className="text-base font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Alertas viales actuales' : 'Current road alerts'}</Text><Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">Mapbox Traffic · {roadAlerts.data ? new Date(roadAlerts.data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (language === 'es' ? 'actualizando…' : 'updating…')}</Text></View></View>
          {roadAlerts.isPending ? <ActivityIndicator className="my-4" color="#d97706" /> : null}
          {roadAlerts.isError ? <View accessibilityRole="alert" className="mt-3"><Text className="font-bold text-coral-600">{language === 'es' ? 'No se pudo consultar Mapbox Traffic.' : 'Mapbox Traffic could not be reached.'}</Text><Pressable accessibilityRole="button" className="mt-3 min-h-11 justify-center self-start rounded-control border border-ui-border bg-ui-surface px-4 shadow-card dark:border-ui-dark-border dark:bg-ui-dark-surface" style={{ elevation: 6, shadowColor: '#073F31', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }} onPress={() => void roadAlerts.refetch()}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View> : null}
          <View className="mt-2 gap-2">{roadAlerts.data?.alerts.map((alert) => <RoadAlertRow alert={alert} key={alert.id} language={language} onReport={setReportingRoad} />)}</View>
          <Text className="mt-3 text-[10px] leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Congestión, cierres e incidentes de Mapbox. Actualización aproximada cada 8 minutos.' : 'Congestion, closures, and incidents from Mapbox. Updated approximately every 8 minutes.'}</Text>
        </View>
        <Pressable accessibilityRole="button" className="mx-5 mb-5 mt-3 min-h-12 flex-row items-center justify-center rounded-control border border-coral-500/40 bg-ui-surface px-5 py-3 shadow-card dark:bg-ui-dark-surface" style={{ elevation: 7, shadowColor: '#B42318', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.2, shadowRadius: 7 }} onPress={() => setRoadReportOpen(true)}>
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
  const size = wide ? 64 : 51;
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

function matchesOption(place: ExplorePlace, option: AppOption) {
  const terms = option.allowed_targets?.length ? option.allowed_targets : [option.label_es, option.label_en];
  return matchesSearchTargets(place.category, terms);
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

function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const lat = rad(to.latitude - from.latitude);
  const lng = rad(to.longitude - from.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


function DestinationPreviewCarousel({ active, large, place }: { active: boolean; large: boolean; place: ExplorePlace }) {
  const photos = [...new Set([place.cover_image_url, ...place.photos].filter((url): url is string => Boolean(url)))];
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [place.id]);
  const source = !failed && photos[0] ? { uri: photos[0] } : fallbackDestinationThumbnail;
  return <Image accessibilityLabel={place.name} cachePolicy="memory-disk" contentFit="cover" onError={() => setFailed(true)} placeholder={destinationPlaceholder} placeholderContentFit="cover" priority={active ? 'high' : 'normal'} source={source} style={large ? { height: 180, width: '100%' } : { borderRadius: 16, flexShrink: 0, height: 52, width: 52 }} transition={160} />;
}

function PlaceResult({ active, followed, formatPrice, language, large, onFollow, onPress, origin, ownContribution, place }: { active: boolean; followed: boolean; formatPrice: (value: number) => string; language: 'es' | 'en'; large: boolean; onFollow: () => void; onPress: () => void; origin?: { latitude: number; longitude: number }; ownContribution: boolean; place: ExplorePlace }) {
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
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-sm font-black text-ui-primary dark:text-ui-dark-primary">{place.price_national_crc == null ? (language === 'es' ? 'Consultar precio' : 'Check price') : formatPrice(place.price_national_crc)}</Text>
            {origin ? <Text className="font-black text-ui-secondary dark:text-ui-dark-secondary">{distanceKm(origin, place).toFixed(1)} km</Text> : <MaterialCommunityIcons name="arrow-right" size={21} color="#0077A8" />}
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
      </View>
      {origin ? <Text className="ml-2 font-black text-ui-secondary dark:text-ui-dark-secondary">{distanceKm(origin, place).toFixed(1)} km</Text> : <MaterialCommunityIcons name="chevron-right" size={23} color="#0077A8" />}
    </Pressable>
  );
}

function ProposalModal({ language, onClose, onPublished, open, session }: { language: 'es' | 'en'; onClose: () => void; onPublished: () => void; open: boolean; session: ReturnType<typeof useApp>['session'] }) {
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
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps');
  const [manualLocation, setManualLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [sending, setSending] = useState(false);
  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - photos.length,
      quality: 0.9,
    });
    if (!result.canceled) setPhotos((current) => [...current, ...result.assets].slice(0, 10));
  };
  useEffect(() => {
    if (!difficulty && difficultyOptions.data?.[0]) setDifficulty(difficultyOptions.data[0].id);
  }, [difficulty, difficultyOptions.data]);
  const submit = async () => {
    if (!session || name.trim().length < 3 || description.trim().length < 10) return Alert.alert('Descubriendo CR', language === 'es' ? 'Agregá un nombre y una descripción de al menos 10 caracteres.' : 'Add a name and a description of at least 10 characters.');
    if (categories.length < 1 || categories.length > 3) return Alert.alert('Descubriendo CR', language === 'es' ? 'Seleccioná entre una y tres categorías.' : 'Select between one and three categories.');
    if (photos.length < 1 || photos.length > 10) return Alert.alert('Descubriendo CR', language === 'es' ? 'Seleccioná entre 1 y 10 imágenes del sitio.' : 'Select between 1 and 10 place images.');
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
        location = (
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
        ).coords;
      }
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
      setLocationMode('gps');
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
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: locationMode === 'gps' }}
                  className={locationMode === 'gps' ? 'flex-1 rounded-control bg-ui-primary p-3 dark:bg-ui-dark-primary' : 'flex-1 rounded-control bg-ui-muted p-3 dark:bg-ui-dark-muted'}
                  onPress={() => {
                    void haptic('selection');
                    setLocationMode('gps');
                    setManualLocation(undefined);
                  }}
                >
                  <Text className={locationMode === 'gps' ? 'text-center text-sm font-black text-white' : 'text-center text-sm font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? '📍 Usar mi GPS' : '📍 Use my GPS'}</Text>
                </Pressable>
                <Pressable accessibilityRole="radio" accessibilityState={{ selected: locationMode === 'manual' }} className={locationMode === 'manual' ? 'flex-1 rounded-control bg-ui-primary p-3 dark:bg-ui-dark-primary' : 'flex-1 rounded-control bg-ui-muted p-3 dark:bg-ui-dark-muted'} onPress={() => { void haptic('selection'); setLocationMode('manual'); }}>
                  <Text className={locationMode === 'manual' ? 'text-center text-sm font-black text-white' : 'text-center text-sm font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? '🗺️ Ubicar en mapa' : '🗺️ Pick on map'}</Text>
                </Pressable>
              </View>
              {locationMode === 'manual' ? (
                <View className="mt-3 overflow-hidden rounded-control border border-ui-border dark:border-ui-dark-border">
                  <Text className="p-3 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Mové el mapa, acercá o alejále y tocá el punto exacto. El pin verde muestra tu selección.' : 'Pan or zoom the map, then tap the exact point. The green pin shows your selection.'}</Text>
                  <MapCanvas onLocationPick={setManualLocation} selectedLocation={manualLocation} />
                  <Text className="p-3 text-center text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{manualLocation ? `${manualLocation.latitude.toFixed(5)}, ${manualLocation.longitude.toFixed(5)}` : language === 'es' ? 'Tocá el mapa para elegir la ubicación.' : 'Tap the map to choose a location.'}</Text>
                </View>
              ) : null}
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
              <Text className="text-sm font-bold leading-5 text-ui-text dark:text-ui-dark-text">{locationMode === 'manual' ? (language === 'es' ? 'Se guardará el punto que seleccionaste en el mapa y aparecerá como aporte de la comunidad.' : 'The point you selected on the map will be saved as a community contribution.') : language === 'es' ? 'Se publicará inmediatamente con tu ubicación GPS actual y aparecerá como aporte de la comunidad.' : 'It will publish immediately using your current GPS location and appear as a community contribution.'}</Text>
            </View>
            <MotionPressable accessibilityRole="button" className="items-center rounded-control bg-ui-primary p-4 dark:bg-ui-dark-primary" disabled={sending} onPress={() => void submit()}>
              {sending ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar ahora' : 'Publish now'}</Text>}
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
