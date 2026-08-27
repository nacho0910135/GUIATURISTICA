import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

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
  image: number;
  premium?: boolean;
};

const activities: Activity[] = [
  { title: { es: 'Playas', en: 'Beaches' }, subtitle: { es: 'Relajate', en: 'Unwind' }, category: 'Playa', icon: 'waves', color: '#159ed1', image: require('@/assets/destinations/beach.jpg') },
  { title: { es: 'Cataratas', en: 'Waterfalls' }, subtitle: { es: 'Naturaleza', en: 'Nature' }, category: 'Catarata', icon: 'leaf', color: '#087443', image: require('@/assets/destinations/waterfall.jpg') },
  { title: { es: 'Volcanes', en: 'Volcanoes' }, subtitle: { es: 'Aventura', en: 'Adventure' }, category: 'Volcán', icon: 'image-filter-hdr', color: '#087443', image: require('@/assets/destinations/volcano.jpg') },
  { title: { es: 'Cultura', en: 'Culture' }, subtitle: { es: 'Descubrí', en: 'Discover' }, category: 'Cultura', icon: 'bank-outline', color: '#ff5d52', image: require('@/assets/destinations/culture.jpg') },
  { title: { es: 'Ríos', en: 'Rivers' }, subtitle: { es: 'Refrescate', en: 'Refresh' }, category: 'Río', icon: 'waves', color: '#159ed1', image: require('@/assets/destinations/waterfall.jpg') },
  { title: { es: 'Miradores', en: 'Viewpoints' }, subtitle: { es: 'Admirá', en: 'Take it in' }, category: 'Mirador', icon: 'binoculars', color: '#087443', image: require('@/assets/destinations/volcano.jpg') },
  { title: { es: 'Termales', en: 'Hot springs' }, subtitle: { es: 'Relajate', en: 'Unwind' }, category: 'Termales', icon: 'hot-tub', color: '#ff8f52', image: require('@/assets/destinations/waterfall.jpg') },
  { title: { es: 'Santuarios de animales', en: 'Animal Sanctuaries' }, subtitle: { es: 'Centros verificados', en: 'Verified centers' }, category: 'Santuarios de animales', icon: 'paw', color: '#087443', image: require('@/assets/destinations/waterfall.jpg') },
  { title: { es: 'Experiencia Gastronómica', en: 'Food Experiences' }, subtitle: { es: 'Selección premium', en: 'Premium selection' }, category: 'Experiencia Gastronómica', icon: 'silverware-fork-knife', color: '#d69e2e', image: require('@/assets/destinations/culture.jpg'), premium: true },
  { title: { es: 'Bares / Discotecas', en: 'Bars / Nightclubs' }, subtitle: { es: 'Selección premium', en: 'Premium selection' }, category: 'Bares / Discotecas', icon: 'glass-cocktail', color: '#7c4dff', image: require('@/assets/destinations/culture.jpg'), premium: true },
];

export default function ExploreScreen() {
  const { formatPrice, language, requireAuth, session, t } = useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [proposalOpen, setProposalOpen] = useState(false);
  const wide = width >= 900;
  const cardWidth = wide ? 250 : 142;
  const places = useQuery({ queryKey: ['explore-places'], queryFn: getExplorePlaces, staleTime: 10 * 60 * 1000 });
  const sanctuaries = useQuery({ queryKey: ['verified-sanctuaries'], queryFn: getVerifiedSanctuaries, enabled: category === 'Santuarios de animales', staleTime: 30 * 60 * 1000 });
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
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ alignItems: 'center', paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <View className="w-full px-4 pb-4 pt-5" style={{ maxWidth: 1180 }}>
        <View className="flex-row items-center rounded-2xl bg-[#243349] px-4"><MaterialCommunityIcons name="magnify" size={23} color="#8ea4c0" /><TextInput accessibilityLabel={language === 'es' ? 'Buscar lugares' : 'Search places'} className="ml-3 flex-1 py-4 text-white" onChangeText={setSearch} placeholder={language === 'es' ? 'Buscar playas, cataratas, miradores, volcanes o senderos…' : 'Search beaches, waterfalls, viewpoints, volcanoes or trails…'} placeholderTextColor="#8ea4c0" value={search} /></View>
        <View className="mt-3 flex-row gap-3"><Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#13aee8] px-4 py-4" onPress={() => void discover()}><MaterialCommunityIcons name="crosshairs-gps" size={23} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Descubrir' : 'Discover'}</Text></Pressable><Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#00b981] px-4 py-4" onPress={() => { if (requireAuth(language === 'es' ? 'Publicar un nuevo lugar' : 'Publish a new place')) setProposalOpen(true); }}><MaterialCommunityIcons name="plus-circle-outline" size={24} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Agregar sitio' : 'Add place'}</Text></Pressable></View>
        {coordinates ? <Text className="mt-3 text-sm font-bold text-forest-700">{language === 'es' ? 'Ordenados del más cercano al más lejano.' : 'Sorted from nearest to farthest.'}</Text> : null}
        {search || coordinates ? <View className="mt-4 gap-3">{places.isPending ? <ActivityIndicator color="#087443" /> : visiblePlaces.slice(0, 20).map((place) => <PlaceResult formatPrice={formatPrice} key={`${place.community ? 'community' : 'official'}-${place.id}`} language={language} origin={coordinates} place={place} />)}{!places.isPending && !visiblePlaces.length ? <Text className="py-6 text-center font-bold text-forest-500">{language === 'es' ? 'No encontramos sitios con esa búsqueda.' : 'No places matched your search.'}</Text> : null}</View> : null}
      </View>

      <View className="w-full" style={{ maxWidth: 1180, paddingHorizontal: wide ? 20 : 0 }}>
        <MapCanvas />
      </View>

      <View className="-mt-7 w-full rounded-t-[30px] bg-white pb-2 pt-6" style={{ maxWidth: 1180 }}>
        <View className="flex-row items-center justify-between px-5">
          <Text className="text-2xl font-black tracking-tight text-forest-950">{t('today')}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setCategory('')}>
            <Text className="font-extrabold text-caribbean-600">{t('seeAll')}  ›</Text>
          </Pressable>
        </View>

        <ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}>
          {activities.map((activity) => {
            const selected = activity.category === category;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                aria-pressed={selected}
                className={`overflow-hidden rounded-[22px] border bg-white ${selected ? 'border-forest-600' : 'border-[#e5ebe7]'}`}
                key={activity.title.es}
                onPress={() => activity.category === 'Santuarios de animales' ? setCategory(selected ? '' : activity.category) : router.push({ pathname: '/(aux)/province', params: { category: activity.category } })}
                style={{ boxShadow: '0 5px 12px rgba(18, 60, 44, 0.1)', width: cardWidth }}
              >
                <View>
                  <Image contentFit="cover" source={activity.image} style={{ height: wide ? 150 : 112, width: '100%' }} transition={180} />
                  {activity.premium ? <View className="absolute right-2 top-2 flex-row items-center rounded-full bg-[#d69e2e] px-2 py-1"><MaterialCommunityIcons name="crown" size={13} color="white" /><Text className="ml-1 text-[10px] font-black text-white">PREMIUM</Text></View> : null}
                  <View className="absolute -bottom-5 left-3 h-11 w-11 items-center justify-center rounded-full border-2 border-white" style={{ backgroundColor: activity.color }}>
                    <MaterialCommunityIcons name={activity.icon} size={22} color="white" />
                  </View>
                </View>
                <View className="px-3 pb-3 pt-7">
                  <Text className="text-base font-black text-forest-950">{activity.title[language]}</Text>
                  <Text className="mt-0.5 text-sm text-[#7b8580]">{activity.subtitle[language]}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {category === 'Santuarios de animales' ? <View className="mx-5 mt-5 gap-3">{sanctuaries.isPending ? <ActivityIndicator color="#087443" /> : sanctuaries.data?.map((sanctuary) => <View className="rounded-3xl bg-forest-900 p-5" key={sanctuary.id}><View className="flex-row items-center"><View className="flex-row items-center rounded-full bg-[#00b981] px-3 py-2"><MaterialCommunityIcons name="shield-check" size={18} color="white" /><Text className="ml-2 text-xs font-black text-white">{language === 'es' ? 'Verificado' : 'Verified'}</Text></View></View><Text className="mt-4 text-xl font-black text-white">{sanctuary.name}</Text><Text className="mt-2 font-bold text-[#8cebcf]">{sanctuary.location_name} · {sanctuary.province}</Text><Text className="mt-3 leading-6 text-mint-100">{language === 'es' ? sanctuary.description_es : sanctuary.description_en}</Text></View>)}</View> : null}

        <Pressable
          accessibilityLabel={t('roadAlert')}
          accessibilityRole="button"
          className="mx-5 mt-6 flex-row items-center rounded-[22px] bg-coral-50 p-4"
          onPress={() => requireAuth(t('roadAlert'))}
          style={{ borderColor: '#ffe1dd', borderWidth: 1 }}
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-coral-500"><MaterialCommunityIcons name="car-brake-alert" size={24} color="white" /></View>
          <View className="ml-4 flex-1"><Text className="font-black text-coral-600">{t('roadAlert')}</Text><Text className="mt-1 text-sm text-forest-700">{t('roadMessage')}</Text></View>
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

function PlaceResult({ formatPrice, language, origin, place }: { formatPrice: (value: number) => string; language: 'es' | 'en'; origin?: { latitude: number; longitude: number }; place: ExplorePlace }) {
  return <Pressable accessibilityRole="button" className="flex-row items-center rounded-2xl border border-[#dfe8e3] bg-white p-4" onPress={() => void openNavigation(place.latitude, place.longitude)}><View className="h-12 w-12 items-center justify-center rounded-2xl bg-mint-100"><MaterialCommunityIcons name="map-marker" size={25} color="#087443" /></View><View className="ml-3 flex-1"><View className="flex-row items-center"><Text className="flex-shrink text-base font-black text-forest-950">{place.name}</Text>{place.community ? <Text className="ml-2 rounded-full bg-[#dff7ec] px-2 py-1 text-[10px] font-black text-[#087443]">{language === 'es' ? 'COMUNIDAD' : 'COMMUNITY'}</Text> : null}</View><Text className="mt-1 text-sm text-forest-500">{place.province} · {place.category} · {place.price_national_crc == null ? (language === 'es' ? 'Consultar' : 'Check price') : formatPrice(place.price_national_crc)}</Text></View>{origin ? <Text className="font-black text-caribbean-600">{distanceKm(origin, place).toFixed(1)} km</Text> : <MaterialCommunityIcons name="navigation-variant" size={23} color="#159ed1" />}</Pressable>;
}

function ProposalModal({ language, onClose, onPublished, open, session }: { language: 'es' | 'en'; onClose: () => void; onPublished: () => void; open: boolean; session: ReturnType<typeof useApp>['session'] }) {
  const [name, setName] = useState(''); const [province, setProvince] = useState('San José'); const [category, setCategory] = useState('Naturaleza'); const [district, setDistrict] = useState(''); const [price, setPrice] = useState('0'); const [difficulty, setDifficulty] = useState('Moderada'); const [description, setDescription] = useState(''); const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!session || name.trim().length < 3 || description.trim().length < 10) return Alert.alert('Descubriendo CR', language === 'es' ? 'Agregá un nombre y una descripción de al menos 10 caracteres.' : 'Add a name and a description of at least 10 characters.');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', language === 'es' ? 'Necesitamos el GPS para guardar la ubicación real del sitio.' : 'GPS permission is required to save the real location.');
    setSending(true);
    try { const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); await publishCommunityPlace({ user_id: session.user.id, name: name.trim(), province, category, district: district.trim() || undefined, description: description.trim(), difficulty, price_national_crc: Math.max(0, Number(price.replace(',', '.')) || 0), latitude: position.coords.latitude, longitude: position.coords.longitude }); onPublished(); onClose(); setName(''); setDescription(''); }
    catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : language === 'es' ? 'No se pudo publicar.' : 'Could not publish.'); }
    finally { setSending(false); }
  };
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}><View className="flex-1 items-center justify-center bg-black/60 p-4"><View className="max-h-[92%] w-full max-w-2xl overflow-hidden rounded-[28px] bg-white"><View className="flex-row items-center border-b border-mint-200 p-5"><MaterialCommunityIcons name="plus-circle-outline" size={27} color="#00a878" /><Text className="ml-3 flex-1 text-xl font-black text-forest-950">{language === 'es' ? 'Publicar un nuevo lugar' : 'Publish a new place'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} onPress={onClose}><MaterialCommunityIcons name="close" size={26} color="#6d746f" /></Pressable></View><ScrollView contentContainerStyle={{ gap: 16, padding: 20 }}><Field label={language === 'es' ? 'Nombre del lugar' : 'Place name'} onChange={setName} placeholder="Ej: Poza Azul" value={name} /><ChoiceField label={language === 'es' ? 'Provincia' : 'Province'} onChange={setProvince} options={provinces.map((item) => item.name)} value={province} /><ChoiceField label={language === 'es' ? 'Categoría' : 'Category'} onChange={setCategory} options={['Naturaleza','Catarata','Río','Mirador','Termales','Playa','Cultura','Aventura']} value={category} /><Field label={language === 'es' ? 'Cantón / Pueblo' : 'Town / District'} onChange={setDistrict} placeholder={language === 'es' ? 'Ej: Bajos del Toro' : 'Example: Bajos del Toro'} value={district} /><Field keyboard label={language === 'es' ? 'Precio de entrada (₡)' : 'Entry price (CRC)'} onChange={setPrice} placeholder="0" value={price} /><ChoiceField label={language === 'es' ? 'Dificultad física' : 'Difficulty'} onChange={setDifficulty} options={['Fácil','Moderada','Difícil']} value={difficulty} /><Field label={language === 'es' ? 'Descripción y cómo llegar' : 'Description and directions'} multiline onChange={setDescription} placeholder={language === 'es' ? 'Describí el sitio y cómo llegar…' : 'Describe the place and how to get there…'} value={description} /><View className="rounded-2xl bg-mint-100 p-4"><Text className="text-sm font-bold leading-5 text-forest-700">{language === 'es' ? 'Se publicará inmediatamente con tu ubicación GPS actual y aparecerá como aporte de la comunidad.' : 'It will publish immediately using your current GPS location and appear as a community contribution.'}</Text></View><Pressable accessibilityRole="button" className="items-center rounded-2xl bg-[#00b981] p-4" disabled={sending} onPress={() => void submit()}>{sending ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar ahora' : 'Publish now'}</Text>}</Pressable></ScrollView></View></View></Modal>;
}

function Field({ keyboard, label, multiline, onChange, placeholder, value }: { keyboard?: boolean; label: string; multiline?: boolean; onChange: (value: string) => void; placeholder: string; value: string }) { return <View><Text className="mb-2 font-black text-forest-800">{label}</Text><TextInput className="rounded-2xl border border-mint-200 px-4 py-3 text-forest-950" keyboardType={keyboard ? 'decimal-pad' : 'default'} multiline={multiline} onChangeText={onChange} placeholder={placeholder} style={multiline ? { minHeight: 90, textAlignVertical: 'top' } : undefined} value={value} /></View>; }
function ChoiceField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) { return <View><Text className="mb-2 font-black text-forest-800">{label}</Text><ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{options.map((option) => <Pressable className={value === option ? 'rounded-full bg-forest-800 px-4 py-3' : 'rounded-full bg-mint-100 px-4 py-3'} key={option} onPress={() => onChange(option)}><Text className={value === option ? 'font-black text-white' : 'font-bold text-forest-700'}>{option}</Text></Pressable>)}</ScrollView></View>; }
