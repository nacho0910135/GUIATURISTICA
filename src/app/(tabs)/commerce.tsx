import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { AdBanner } from '@/components/ad-banner';
import {
  COMMERCE_CATEGORIES,
  type CommerceCategoryId,
  type CommercialService,
  getAccountDashboard,
  getCommerceDirectory,
  trackBusinessEvents,
} from '@/lib/commerce';
import { useApp } from '@/providers/app-provider';

const SERVICE_BADGES = [
  ['accepts_sinpe', 'SINPE Móvil', 'cellphone-check'],
  ['accepts_cards', 'Tarjetas', 'credit-card-check-outline'],
  ['pet_friendly', 'Pet Friendly', 'paw-outline'],
  ['has_parking', 'Parqueo', 'parking'],
] as const;

function ServiceCard({ service, onWhatsApp }: { service: CommercialService; onWhatsApp: () => void }) {
  const { language } = useApp();
  const sponsored = service.is_sponsored;
  return (
    <View className={sponsored ? 'mb-4 overflow-hidden rounded-3xl border-2 border-amber-400 bg-amber-50 dark:bg-forest-900' : 'mb-4 overflow-hidden rounded-3xl border border-mint-200 bg-white dark:border-forest-700 dark:bg-forest-900'}>
      {service.photos?.[0] ? <Image source={{ uri: service.photos[0] }} className="h-40 w-full" resizeMode="cover" /> : null}
      <View className="p-5">
        <View className="flex-row items-start">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-black text-forest-950 dark:text-white">{service.title}</Text>
            <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-forest-500 dark:text-mint-300">{service.subcategory ?? service.main_category}</Text>
          </View>
          <View className="flex-row items-center rounded-full bg-amber-100 px-3 py-2">
            <MaterialCommunityIcons name="star" size={16} color="#b7791f" />
            <Text className="ml-1 font-black text-amber-900">{service.avg_rating.toFixed(1)}</Text>
            <Text className="ml-1 text-xs text-amber-800">({service.total_reviews})</Text>
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap">
          {service.is_verified_ict ? <Seal icon="shield-check" label="ICT" /> : null}
          {service.cst_stars > 0 ? <Seal icon="leaf-circle" label={`CST ${service.cst_stars}★`} /> : null}
          {sponsored ? <Seal icon="crown" label={language === 'es' ? 'Patrocinado' : 'Sponsored'} gold /> : null}
        </View>
        {service.description ? <Text numberOfLines={2} className="mt-3 leading-5 text-forest-600 dark:text-mint-200">{service.description}</Text> : null}
        <View className="mt-3 flex-row flex-wrap">
          {SERVICE_BADGES.map(([key, label, icon]) => service[key] ? (
            <View className="mb-2 mr-2 flex-row items-center rounded-full bg-mint-100 px-3 py-2 dark:bg-forest-800" key={key}>
              <MaterialCommunityIcons name={icon} size={15} color="#087443" />
              <Text className="ml-1.5 text-xs font-extrabold text-forest-800 dark:text-mint-100">{label}</Text>
            </View>
          ) : null)}
        </View>
        {service.phone_whatsapp ? (
          <Pressable onPress={onWhatsApp} className="mt-2 flex-row items-center justify-center rounded-2xl bg-[#25D366] py-3.5">
            <MaterialCommunityIcons name="whatsapp" size={21} color="#053326" />
            <Text className="ml-2 font-black text-forest-950">WhatsApp</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Seal({ icon, label, gold = false }: { icon: 'shield-check' | 'leaf-circle' | 'crown'; label: string; gold?: boolean }) {
  return (
    <View className={gold ? 'mb-2 mr-2 flex-row items-center rounded-full bg-amber-200 px-3 py-1.5' : 'mb-2 mr-2 flex-row items-center rounded-full bg-frog-100 px-3 py-1.5'}>
      <MaterialCommunityIcons name={icon} size={16} color={gold ? '#92400e' : '#087443'} />
      <Text className={gold ? 'ml-1.5 text-xs font-black text-amber-900' : 'ml-1.5 text-xs font-black text-forest-800'}>{label}</Text>
    </View>
  );
}

export default function CommerceScreen() {
  const { language, session } = useApp();
  const [category, setCategory] = useState<CommerceCategoryId>('gastronomy');
  const tracked = useRef(new Set<string>());
  const directory = useQuery({ queryKey: ['commerce-directory', category], queryFn: () => getCommerceDirectory(category), staleTime: 30 * 60 * 1000 });
  const account = useQuery({ queryKey: ['account-dashboard', session?.user.id], queryFn: () => getAccountDashboard(session!.user.id), enabled: Boolean(session), staleTime: 5 * 60 * 1000 });

  useEffect(() => {
    const ids = (directory.data ?? []).map((service) => service.id).filter((id) => !tracked.current.has(id));
    ids.forEach((id) => tracked.current.add(id));
    void trackBusinessEvents(ids, 'impression').catch(() => ids.forEach((id) => tracked.current.delete(id)));
  }, [directory.data]);

  const openWhatsApp = async (service: CommercialService) => {
    await trackBusinessEvents([service.id], 'whatsapp_click').catch(() => undefined);
    const digits = service.phone_whatsapp?.replace(/\D/g, '');
    if (digits) await Linking.openURL(`https://wa.me/${digits}`);
  };

  const header = (
    <View>
      <View className="px-5 pb-5 pt-7">
        <Text className="text-3xl font-black text-forest-950 dark:text-white">{language === 'es' ? 'Comercios ICT' : 'ICT Businesses'}</Text>
        <Text className="mt-2 text-base leading-6 text-forest-600 dark:text-mint-200">{language === 'es' ? 'Comprá local con un ranking basado únicamente en reseñas reales.' : 'Buy local with ranking based only on real user reviews.'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        {COMMERCE_CATEGORIES.map((item) => (
          <Pressable key={item.id} onPress={() => setCategory(item.id)} className={category === item.id ? 'mr-2 rounded-full bg-forest-800 px-4 py-3' : 'mr-2 rounded-full border border-mint-300 bg-white px-4 py-3 dark:border-forest-700 dark:bg-forest-900'}>
            <Text className={category === item.id ? 'font-black text-white' : 'font-extrabold text-forest-800 dark:text-mint-100'}>{item[language]}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  if (directory.isLoading) return <View className="flex-1 items-center justify-center bg-mint-50 dark:bg-forest-950"><ActivityIndicator size="large" color="#087443" /></View>;
  return (
    <View className="flex-1 bg-mint-50 dark:bg-forest-950">
      <FlatList
        data={directory.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ServiceCard service={item} onWhatsApp={() => void openWhatsApp(item)} />}
        contentContainerStyle={{ paddingBottom: 18, paddingHorizontal: 20 }}
        ListHeaderComponent={header}
        ListEmptyComponent={<View className="items-center rounded-3xl border border-dashed border-mint-300 px-6 py-12 dark:border-forest-700"><MaterialCommunityIcons name="store-search-outline" size={44} color="#75a291" /><Text className="mt-4 text-center text-lg font-black text-forest-900 dark:text-white">{language === 'es' ? 'Aún no hay comercios en esta categoría' : 'No businesses in this category yet'}</Text><Text className="mt-2 text-center text-forest-500 dark:text-mint-300">{language === 'es' ? 'El filtro ya está listo para nuevos registros B2B.' : 'The filter is ready for new B2B registrations.'}</Text></View>}
      />
      <AdBanner hidden={Boolean(account.data?.profile?.is_premium)} />
    </View>
  );
}
