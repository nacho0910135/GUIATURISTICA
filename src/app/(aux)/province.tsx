import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { getPlacesForProvince } from '@/lib/places';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

function imageFor(category: string) {
  if (category === 'Playa') return require('@/assets/destinations/beach.jpg');
  if (category === 'Cultura') return require('@/assets/destinations/culture.jpg');
  if (category === 'Aventura') return require('@/assets/destinations/volcano.jpg');
  return require('@/assets/destinations/waterfall.jpg');
}

export default function ProvinceCatalogScreen() {
  const { province: rawProvince } = useLocalSearchParams<{ province: string }>();
  const { language } = useApp();
  const router = useRouter();
  const province = provinces.find((item) => item.name === rawProvince) ?? provinces[0];
  const places = useQuery({
    queryKey: ['places', 'province', province.code],
    queryFn: () => getPlacesForProvince(province.name),
    staleTime: 10 * 60 * 1000,
  });
  const visiblePlaces = places.data ?? [];

  return (
    <View className="flex-1 bg-mint-50">
      <View className="bg-forest-900 px-5 pb-6 pt-12">
        <Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-white/15" onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </Pressable>
        <Text className="mt-5 text-3xl font-black text-white">{province.name}</Text>
        <Text className="mt-1 text-mint-200">{language === 'es' ? 'Sitios turísticos de la provincia' : 'Tourist places in the province'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: 14, padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {places.isPending ? <ActivityIndicator className="py-12" color="#087443" size="large" /> : null}
        {places.isError ? <Text className="rounded-2xl bg-coral-50 p-4 text-center font-bold text-coral-600">{language === 'es' ? 'No se pudieron cargar los sitios desde Supabase.' : 'Places could not be loaded from Supabase.'}</Text> : null}
        {visiblePlaces.map((place) => (
          <View className="overflow-hidden rounded-3xl border border-mint-200 bg-white" key={place.id}>
            <Image contentFit="cover" source={place.cover_image_url ? { uri: place.cover_image_url } : imageFor(place.category)} style={{ height: 180, width: '100%' }} transition={180} />
            <View className="p-4"><Text className="text-xl font-black text-forest-950">{place.name}</Text><Text className="mt-1 font-bold text-forest-600">{place.category} · {place.province}</Text>{place.status !== 'Activo' ? <Text className="mt-2 text-xs font-black text-coral-600">{place.status}</Text> : null}</View>
          </View>
        ))}
        {!places.isPending && !places.isError && !visiblePlaces.length ? <Text className="py-12 text-center font-bold text-forest-600">{language === 'es' ? 'Aún no hay sitios publicados para esta provincia.' : 'No places have been published for this province yet.'}</Text> : null}
      </ScrollView>
    </View>
  );
}
