import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { CopyKey } from '@/lib/i18n';
import { useApp } from '@/providers/app-provider';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type FeatureScreenProps = {
  titleKey: CopyKey;
  bodyKey: CopyKey;
  icon: IconName;
  accent: string;
  rows: { label: CopyKey; detail: { es: string; en: string }; icon: IconName; protected?: boolean }[];
};

export function FeatureScreen({ titleKey, bodyKey, icon, accent, rows }: FeatureScreenProps) {
  const { language, requireAuth, t } = useApp();

  return (
    <ScrollView
      className="flex-1 bg-mint-50 dark:bg-forest-950"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pb-6 pt-7">
        <View className="flex-row items-start justify-between">
          <View className="max-w-[78%]">
            <Text className="text-3xl font-black leading-9 tracking-tight text-forest-950 dark:text-white">{t(titleKey)}</Text>
            <Text className="mt-3 text-base leading-6 text-forest-600 dark:text-mint-200">{t(bodyKey)}</Text>
          </View>
          <View className="h-16 w-16 items-center justify-center rounded-[24px]" style={{ backgroundColor: accent }}>
            <MaterialCommunityIcons name={icon} size={34} color="white" />
          </View>
        </View>
      </View>
      <View className="overflow-hidden border-y border-mint-200 bg-white dark:border-forest-700 dark:bg-forest-900">
        {rows.map((row, index) => (
          <Pressable
            accessibilityRole="button"
            className={index < rows.length - 1 ? 'mx-5 flex-row items-center border-b border-mint-100 py-5 dark:border-forest-800' : 'mx-5 flex-row items-center py-5'}
            key={row.label}
            onPress={() => row.protected ? requireAuth(t(row.label)) : undefined}
          >
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 dark:bg-forest-800">
              <MaterialCommunityIcons name={row.icon} size={25} color={accent} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-forest-950 dark:text-white">{t(row.label)}</Text>
              <Text className="mt-1 text-sm text-forest-500 dark:text-mint-300">{row.detail[language]}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#75a291" />
          </Pressable>
        ))}
      </View>
      <View className="mx-5 mt-7 flex-row items-center rounded-3xl bg-forest-900 p-5 dark:bg-frog-500">
        <MaterialCommunityIcons name="heart-outline" size={28} color="white" />
        <View className="ml-4 flex-1">
          <Text className="font-extrabold text-white">{t('communityTitle')}</Text>
          <Text className="mt-1 text-sm text-mint-100">{t('communityBody')}</Text>
        </View>
        <Pressable className="rounded-xl bg-white/15 px-3 py-2" onPress={() => requireAuth(t('like'))}>
          <Text className="font-bold text-white">{t('like')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
