import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MapCanvas } from '@/components/explore/map-canvas';
import { useApp } from '@/providers/app-provider';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
const activities: { title: { es: string; en: string }; subtitle: { es: string; en: string }; icon: IconName; color: string; price: number }[] = [
  { title: { es: 'Playas', en: 'Beaches' }, subtitle: { es: 'Relajate', en: 'Unwind' }, icon: 'waves', color: '#0788c7', price: 12500 },
  { title: { es: 'Cataratas', en: 'Waterfalls' }, subtitle: { es: 'Naturaleza', en: 'Nature' }, icon: 'waterfall', color: '#087443', price: 8500 },
  { title: { es: 'Volcanes', en: 'Volcanoes' }, subtitle: { es: 'Aventura', en: 'Adventure' }, icon: 'image-filter-hdr', color: '#ec5d51', price: 17600 },
  { title: { es: 'Cultura', en: 'Culture' }, subtitle: { es: 'Descubrí', en: 'Discover' }, icon: 'bank-outline', color: '#d54b43', price: 5000 },
];

export default function ExploreScreen() {
  const { formatPrice, language, requireAuth, t } = useApp();
  return (
    <ScrollView className="flex-1 bg-mint-50 dark:bg-forest-950" contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
      <View className="px-4 pt-4"><MapCanvas /></View>
      <View className="mt-7 flex-row items-center justify-between px-5">
        <Text className="text-2xl font-black tracking-tight text-forest-950 dark:text-white">{t('today')}</Text>
        <Pressable><Text className="font-extrabold text-caribbean-600">{t('seeAll')}  ›</Text></Pressable>
      </View>
      <ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}>
        {activities.map((activity) => (
          <Pressable className="w-36 overflow-hidden rounded-3xl border border-mint-200 bg-white dark:border-forest-700 dark:bg-forest-900" key={activity.title.es}>
            <View className="h-28 items-center justify-center" style={{ backgroundColor: `${activity.color}22` }}>
              <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: activity.color }}>
                <MaterialCommunityIcons name={activity.icon} size={32} color="white" />
              </View>
            </View>
            <View className="p-3">
              <Text className="font-black text-forest-950 dark:text-white">{activity.title[language]}</Text>
              <Text className="mt-1 text-sm text-forest-500 dark:text-mint-300">{activity.subtitle[language]}</Text>
              <Text className="mt-2 text-sm font-extrabold text-forest-700 dark:text-frog-300">{formatPrice(activity.price)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable className="mx-5 mt-6 flex-row items-center rounded-3xl border border-coral-200 bg-coral-50 p-4 dark:border-coral-500/40 dark:bg-forest-900" onPress={() => requireAuth(t('roadAlert'))}>
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-coral-500"><MaterialCommunityIcons name="car-brake-alert" size={25} color="white" /></View>
        <View className="ml-4 flex-1"><Text className="font-black text-coral-600">{t('roadAlert')}</Text><Text className="mt-1 text-sm text-forest-700 dark:text-mint-200">{t('roadMessage')}</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={26} color="#ff5d52" />
      </Pressable>
    </ScrollView>
  );
}
