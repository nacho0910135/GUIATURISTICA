import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { MapCanvas } from '@/components/explore/map-canvas';
import { useApp } from '@/providers/app-provider';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type Activity = {
  title: { es: string; en: string };
  subtitle: { es: string; en: string };
  category: string;
  icon: IconName;
  color: string;
  image: number;
};

const activities: Activity[] = [
  { title: { es: 'Playas', en: 'Beaches' }, subtitle: { es: 'Relajate', en: 'Unwind' }, category: 'Playa', icon: 'waves', color: '#159ed1', image: require('@/assets/destinations/beach.jpg') },
  { title: { es: 'Cataratas', en: 'Waterfalls' }, subtitle: { es: 'Naturaleza', en: 'Nature' }, category: 'Naturaleza', icon: 'leaf', color: '#087443', image: require('@/assets/destinations/waterfall.jpg') },
  { title: { es: 'Volcanes', en: 'Volcanoes' }, subtitle: { es: 'Aventura', en: 'Adventure' }, category: 'Aventura', icon: 'image-filter-hdr', color: '#087443', image: require('@/assets/destinations/volcano.jpg') },
  { title: { es: 'Cultura', en: 'Culture' }, subtitle: { es: 'Descubrí', en: 'Discover' }, category: 'Cultura', icon: 'bank-outline', color: '#ff5d52', image: require('@/assets/destinations/culture.jpg') },
];

export default function ExploreScreen() {
  const { language, requireAuth, t } = useApp();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState('');
  const wide = width >= 900;
  const cardWidth = wide ? 250 : 142;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ alignItems: 'center', paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
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
                onPress={() => setCategory(selected ? '' : activity.category)}
                style={{ boxShadow: '0 5px 12px rgba(18, 60, 44, 0.1)', width: cardWidth }}
              >
                <View>
                  <Image contentFit="cover" source={activity.image} style={{ height: wide ? 150 : 112, width: '100%' }} transition={180} />
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
    </ScrollView>
  );
}
