import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { MapCanvas } from '@/components/explore/map-canvas';
import { getVerifiedSanctuaries } from '@/lib/fauna';
import { openNavigation } from '@/lib/logistics';
import { getExplorePlaces, publishCommunityPlace, type ExplorePlace } from '@/lib/places';
import { provinces } from '@/lib/provinces';
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
  { title: { es: 'Experiencia Gastronómica', en: 'Food Experiences' }, subtitle: { es: 'Selección premium', en: 'Premium selection' }, category: 'Experiencia Gastronómica', icon: 'silverware-fork-knife', color: '#d69e2e', premium: true },
  { title: { es: 'Bares / Discotecas', en: 'Bars / Nightclubs' }, subtitle: { es: 'Selección premium', en: 'Premium selection' }, category: 'Bares / Discotecas', icon: 'glass-cocktail', color: '#7c4dff', premium: true },
];

export default function ExploreScreen() {
  const { formatPrice, language, requireAuth, session, t } = useApp();
  const router = useRouter();
  const { reset: resetToken } = useLocalSearchParams<{ reset?: string }>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [proposalOpen, setProposalOpen] = useState(false);
  const wide = width >= 900;
  const places = useQuery({ queryKey: ['explore-places'], queryFn: getExplorePlaces, staleTime: 10 * 60 * 1000 });
  const sanctuaries = useQuery({ queryKey: ['verified-sanctuaries'], queryFn: getVerifiedSanctuaries, staleTime: 30 * 60 * 1000 });
  const resetExplore = useCallback(() => {
    setCategory('');
    setSearch('');
    setCoordinates(undefined);
    setProposalOpen(false);
  }, []);
  useEffect(() => { if (resetToken) resetExplore(); }, [resetExplore, resetToken]);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!category && !coordinates && !proposalOpen && !search) return false;
      resetExplore();
      return true;
    });
    return () => subscription.remove();
  }, [category, coordinates, proposalOpen, resetExplore, search]));
  const visiblePlaces = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(language === 'es' ? 'es' : 'en');
    const filtered = term ? (places.data ?? []).filter((place) => `${place.name} ${place.province} ${place.category} ${place.description ?? ''}`.toLocaleLowerCase().includes(term)) : coordinates ? [...(places.data ?? [])] : [];
    return coordinates ? filtered.sort((a, b) => distanceKm(coordinates, a) - distanceKm(coordinates, b)) : filtered;
  }, [coordinates, language, places.data, search]);

  const discover = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', language === 'es' ? 'Necesitamos tu ubicación para ordenar los sitios cercanos.' : 'Location permission is required to sort nearby places.');
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinates(position.coords);
  };

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ alignItems: 'center', paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View className="w-full px-4 pb-4 pt-5" style={{ maxWidth: 1180 }}>
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
        {search || coordinates ? <View className="mt-4 gap-3">{places.isPending ? <ActivityIndicator color="#0B6B4F" /> : visiblePlaces.slice(0, 20).map((place) => <PlaceResult formatPrice={formatPrice} key={`${place.community ? 'community' : 'official'}-${place.id}`} language={language} origin={coordinates} place={place} />)}{!places.isPending && !visiblePlaces.length ? <Text className="py-6 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'No encontramos sitios con esa búsqueda.' : 'No places matched your search.'}</Text> : null}</View> : null}
      </View>

      <View className="w-full" style={{ maxWidth: 1180, paddingHorizontal: wide ? 20 : 0 }}>
        <MapCanvas />
      </View>

      <View className="-mt-10 w-full rounded-t-[30px] bg-ui-background pb-2 pt-6 dark:bg-ui-dark-background" style={{ maxWidth: 1180 }}>
        <View className="flex-row items-center justify-between px-5">
          <Text className="text-[17px] font-black tracking-tight text-ui-text dark:text-ui-dark-text">{t('today')}</Text>
          <Pressable accessibilityRole="button" className="flex-row items-center rounded-xl bg-ui-primary px-3 py-2 dark:bg-ui-dark-primary" hitSlop={8} onPress={() => { if (requireAuth(language === 'es' ? 'Publicar un nuevo lugar' : 'Publish a new place')) setProposalOpen(true); }}>
            <MaterialCommunityIcons name="plus-circle-outline" size={17} color="white" />
            <Text className="ml-1.5 text-xs font-black text-white">{language === 'es' ? 'Agregar sitio' : 'Add place'}</Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row flex-wrap px-3">
          {activities.map((activity) => {
            const selected = activity.category === category;
            const matchingPlaces = (places.data ?? []).filter((place) => matchesActivityCategory(place.category, activity.category));
            const count = activity.category === 'Santuarios de animales'
              ? (sanctuaries.data?.length ?? 0) + matchingPlaces.filter((place) => place.community).length
              : matchingPlaces.length;
            const countPending = places.isPending || (activity.category === 'Santuarios de animales' && sanctuaries.isPending);
            return (
              <Pressable
                accessibilityLabel={`${activity.title[language]}, ${countPending ? (language === 'es' ? 'cargando cantidad' : 'loading count') : `${count} ${language === 'es' ? 'sitios' : 'places'}`}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                aria-pressed={selected}
                className="items-center px-1 py-3"
                key={activity.title.es}
                onPress={() => activity.category === 'Santuarios de animales' ? setCategory(selected ? '' : activity.category) : router.push({ pathname: '/(aux)/province', params: { category: activity.category } })}
                style={{ width: '33.3333%' }}
              >
                <View className="items-center justify-center rounded-full" style={{ backgroundColor: selected ? activity.color : `${activity.color}20`, height: wide ? 64 : 51, width: wide ? 64 : 51 }}>
                  <MaterialCommunityIcons name={activity.icon} size={wide ? 34 : 27} color={selected ? 'white' : activity.color} />
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

        {category === 'Santuarios de animales' ? <View className="mx-5 mt-5 gap-3">{sanctuaries.isPending ? <ActivityIndicator color="#0B6B4F" /> : sanctuaries.data?.map((sanctuary) => <View className="rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface" key={sanctuary.id}><View className="flex-row items-center"><View className="flex-row items-center rounded-full bg-ui-primary px-3 py-2 dark:bg-ui-dark-primary"><MaterialCommunityIcons name="shield-check" size={18} color="white" /><Text className="ml-2 text-xs font-black text-white">{language === 'es' ? 'Verificado' : 'Verified'}</Text></View></View><Text className="mt-4 text-xl font-black text-ui-text dark:text-ui-dark-text">{sanctuary.name}</Text><Text className="mt-2 font-bold text-ui-primary dark:text-ui-dark-primary">{sanctuary.location_name} · {sanctuary.province}</Text><Text className="mt-3 leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? sanctuary.description_es : sanctuary.description_en}</Text></View>)}</View> : null}

        <Pressable
          accessibilityLabel={t('roadAlert')}
          accessibilityRole="button"
          className="mx-5 mt-6 flex-row items-center rounded-[22px] bg-coral-50 p-4"
          onPress={() => requireAuth(t('roadAlert'))}
          style={{ borderColor: '#ffe1dd', borderWidth: 1 }}
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-coral-500"><MaterialCommunityIcons name="car-brake-alert" size={24} color="white" /></View>
          <View className="ml-4 flex-1"><Text className="font-black text-coral-600">{t('roadAlert')}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{t('roadMessage')}</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={26} color="#ff5d52" />
        </Pressable>
      </View>
      <ProposalModal language={language} onClose={() => setProposalOpen(false)} onPublished={() => void queryClient.invalidateQueries({ queryKey: ['explore-places'] })} open={proposalOpen} session={session} />
    </ScrollView>
  );
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

function PlaceResult({ formatPrice, language, origin, place }: { formatPrice: (value: number) => string; language: 'es' | 'en'; origin?: { latitude: number; longitude: number }; place: ExplorePlace }) {
  return <Pressable accessibilityRole="button" className="flex-row items-center rounded-control border border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface" onPress={() => void openNavigation(place.latitude, place.longitude)}><View className="h-12 w-12 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="map-marker" size={25} color="#0B6B4F" /></View><View className="ml-3 flex-1"><View className="flex-row items-center"><Text className="flex-shrink text-base font-black text-ui-text dark:text-ui-dark-text">{place.name}</Text>{place.community ? <Text className="ml-2 rounded-full bg-ui-primary-soft px-2 py-1 text-[10px] font-black text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary">{language === 'es' ? 'COMUNIDAD' : 'COMMUNITY'}</Text> : null}</View><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{place.province} · {place.category} · {place.price_national_crc == null ? (language === 'es' ? 'Consultar' : 'Check price') : formatPrice(place.price_national_crc)}</Text></View>{origin ? <Text className="font-black text-ui-secondary dark:text-ui-dark-secondary">{distanceKm(origin, place).toFixed(1)} km</Text> : <MaterialCommunityIcons name="navigation-variant" size={23} color="#0077A8" />}</Pressable>;
}

function ProposalModal({ language, onClose, onPublished, open, session }: { language: 'es' | 'en'; onClose: () => void; onPublished: () => void; open: boolean; session: ReturnType<typeof useApp>['session'] }) {
  const [name, setName] = useState(''); const [province, setProvince] = useState('San José'); const [categories, setCategories] = useState<string[]>([]); const [district, setDistrict] = useState(''); const [price, setPrice] = useState('0'); const [difficulty, setDifficulty] = useState('Moderada'); const [description, setDescription] = useState(''); const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!session || name.trim().length < 3 || description.trim().length < 10) return Alert.alert('Descubriendo CR', language === 'es' ? 'Agregá un nombre y una descripción de al menos 10 caracteres.' : 'Add a name and a description of at least 10 characters.');
    if (categories.length < 1 || categories.length > 2) return Alert.alert('Descubriendo CR', language === 'es' ? 'Seleccioná una o dos categorías.' : 'Select one or two categories.');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', language === 'es' ? 'Necesitamos el GPS para guardar la ubicación real del sitio.' : 'GPS permission is required to save the real location.');
    setSending(true);
    try { const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); await publishCommunityPlace({ user_id: session.user.id, name: name.trim(), province, category: categories.join(' / '), district: district.trim() || undefined, description: description.trim(), difficulty, price_national_crc: Math.max(0, Number(price.replace(',', '.')) || 0), latitude: position.coords.latitude, longitude: position.coords.longitude }); onPublished(); onClose(); setName(''); setDescription(''); setCategories([]); }
    catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : language === 'es' ? 'No se pudo publicar.' : 'Could not publish.'); }
    finally { setSending(false); }
  };
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}><View className="flex-1 items-center justify-center bg-black/60 p-4"><View className="max-h-[92%] w-full max-w-2xl overflow-hidden rounded-modal bg-ui-surface dark:bg-ui-dark-surface"><View className="flex-row items-center border-b border-ui-border p-5 dark:border-ui-dark-border"><MaterialCommunityIcons name="plus-circle-outline" size={27} color="#0B6B4F" /><Text className="ml-3 flex-1 text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Publicar un nuevo lugar' : 'Publish a new place'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} onPress={onClose}><MaterialCommunityIcons name="close" size={26} color="#68737A" /></Pressable></View><ScrollView contentContainerStyle={{ gap: 16, padding: 20 }}><Field label={language === 'es' ? 'Nombre del lugar' : 'Place name'} onChange={setName} placeholder="Ej: Poza Azul" value={name} /><ChoiceField label={language === 'es' ? 'Provincia' : 'Province'} onChange={setProvince} options={provinces.map((item) => item.name)} value={province} /><CategoryChoiceField language={language} onChange={setCategories} value={categories} /><Field label={language === 'es' ? 'Cantón / Pueblo' : 'Town / District'} onChange={setDistrict} placeholder={language === 'es' ? 'Ej: Bajos del Toro' : 'Example: Bajos del Toro'} value={district} /><Field keyboard label={language === 'es' ? 'Precio de entrada (₡)' : 'Entry price (CRC)'} onChange={setPrice} placeholder="0" value={price} /><ChoiceField label={language === 'es' ? 'Dificultad física' : 'Difficulty'} onChange={setDifficulty} options={['Fácil','Moderada','Difícil']} value={difficulty} /><Field label={language === 'es' ? 'Descripción y cómo llegar' : 'Description and directions'} multiline onChange={setDescription} placeholder={language === 'es' ? 'Describí el sitio y cómo llegar…' : 'Describe the place and how to get there…'} value={description} /><View className="rounded-control bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="text-sm font-bold leading-5 text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Se publicará inmediatamente con tu ubicación GPS actual y aparecerá como aporte de la comunidad.' : 'It will publish immediately using your current GPS location and appear as a community contribution.'}</Text></View><Pressable accessibilityRole="button" className="items-center rounded-control bg-ui-primary p-4 dark:bg-ui-dark-primary" disabled={sending} onPress={() => void submit()}>{sending ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar ahora' : 'Publish now'}</Text>}</Pressable></ScrollView></View></View></Modal>;
}

function Field({ keyboard, label, multiline, onChange, placeholder, value }: { keyboard?: boolean; label: string; multiline?: boolean; onChange: (value: string) => void; placeholder: string; value: string }) { return <View><Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{label}</Text><TextInput className="rounded-control border border-ui-border bg-ui-muted px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType={keyboard ? 'decimal-pad' : 'default'} multiline={multiline} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#68737A" style={multiline ? { minHeight: 90, textAlignVertical: 'top' } : undefined} value={value} /></View>; }
function ChoiceField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) { return <View><Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{label}</Text><ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{options.map((option) => <Pressable className={value === option ? 'rounded-full bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'rounded-full bg-ui-muted px-4 py-3 dark:bg-ui-dark-muted'} key={option} onPress={() => onChange(option)}><Text className={value === option ? 'font-black text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{option}</Text></Pressable>)}</ScrollView></View>; }

const destinationCategoryOptions = ['Parque Nacional', 'Volcán', 'Catarata', 'Río', 'Mirador', 'Termales', 'Senderismo', 'Pozas / Lagos', 'Playa', 'Cultura', 'Santuarios de animales'];

function CategoryChoiceField({ language, onChange, value }: { language: 'es' | 'en'; onChange: (value: string[]) => void; value: string[] }) {
  const toggle = (option: string) => {
    if (value.includes(option)) return onChange(value.filter((item) => item !== option));
    if (value.length === 2) return Alert.alert('Descubriendo CR', language === 'es' ? 'Podés seleccionar un máximo de dos categorías.' : 'You can select up to two categories.');
    onChange([...value, option]);
  };
  return <View><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Categorías' : 'Categories'}</Text><Text className="mb-2 mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Elegí una o dos.' : 'Choose one or two.'}</Text><ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{destinationCategoryOptions.map((option) => { const selected = value.includes(option); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} className={selected ? 'rounded-full bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'rounded-full bg-ui-muted px-4 py-3 dark:bg-ui-dark-muted'} key={option} onPress={() => toggle(option)}><Text className={selected ? 'font-black text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{option}</Text></Pressable>; })}</ScrollView></View>;
}
