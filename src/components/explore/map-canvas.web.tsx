import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

const markerPositions: Record<string, { left: number; top: number }> = {
  '1': { left: 183, top: 219 }, '2': { left: 164, top: 151 }, '3': { left: 226, top: 235 },
  '4': { left: 211, top: 178 }, '5': { left: 70, top: 145 }, '6': { left: 116, top: 245 }, '7': { left: 270, top: 205 },
};

export function MapCanvas() {
  const { language, requireAuth, t } = useApp();
  const [selectedCode, setSelectedCode] = useState('2');
  const selectedProvince = provinces.find((province) => province.code === selectedCode);

  return (
    <View className="relative h-[430px] overflow-hidden rounded-[30px] border border-mint-200 bg-sky-200 dark:border-forest-700 dark:bg-forest-900">
      <View className="absolute inset-5 rotate-[-8deg] rounded-[40%] bg-frog-200 dark:bg-forest-700" />
      <View className="absolute left-24 top-36 h-36 w-40 rotate-12 rounded-[45%] bg-frog-300 dark:bg-forest-600" />
      {provinces.map((province) => {
        const position = markerPositions[province.code];
        const selected = selectedCode === province.code;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="absolute items-center"
            key={province.code}
            onPress={() => setSelectedCode(province.code)}
            style={{ left: position.left, top: position.top }}
          >
            <View className={`items-center justify-center rounded-full border-2 border-white shadow-md ${selected ? 'h-12 w-12 bg-coral-500' : 'h-9 w-9 bg-forest-700'}`}>
              <MaterialCommunityIcons name="map-marker" size={selected ? 26 : 20} color="white" />
            </View>
            <Text className="mt-1 rounded bg-white/90 px-1 text-xs font-bold text-forest-900">{province.name}</Text>
          </Pressable>
        );
      })}
      <View className="absolute left-4 right-4 top-4 flex-row items-center rounded-2xl bg-white/95 px-4 py-3 dark:bg-forest-900/95">
        <MaterialCommunityIcons name="magnify" size={23} color="#0b5b3c" />
        <Text className="ml-3 flex-1 text-base text-forest-500 dark:text-mint-200">{t('discover')}</Text>
        <MaterialCommunityIcons name="tune-variant" size={22} color="#0b5b3c" />
      </View>
      <ScrollView
        className="absolute left-0 right-0 top-[72px]"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {provinces.map((province) => {
          const selected = selectedCode === province.code;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`rounded-full border px-3 py-2 ${selected ? 'border-coral-500 bg-coral-500' : 'border-mint-200 bg-white/95 dark:border-forest-600 dark:bg-forest-900/95'}`}
              key={province.code}
              onPress={() => setSelectedCode(province.code)}
            >
              <Text className={`text-xs font-extrabold ${selected ? 'text-white' : 'text-forest-800 dark:text-mint-100'}`}>{province.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="absolute bottom-4 left-4 right-4 flex-row items-center rounded-2xl bg-white p-4 shadow-lg dark:bg-forest-900">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-frog-100 dark:bg-forest-700">
          <MaterialCommunityIcons name="map-marker-radius" size={25} color="#087443" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-black text-forest-950 dark:text-white">{selectedProvince?.name}</Text>
          <Text className="mt-0.5 text-sm text-forest-500 dark:text-mint-300">{language === 'es' ? 'Explorar provincia' : 'Explore province'}</Text>
        </View>
        <Pressable accessibilityLabel={t('save')} accessibilityRole="button" hitSlop={10} onPress={() => requireAuth(selectedProvince?.name ?? 'Costa Rica')}>
          <MaterialCommunityIcons name="heart-outline" size={27} color="#ff5d52" />
        </Pressable>
      </View>
    </View>
  );
}
