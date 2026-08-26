import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useApp } from '@/providers/app-provider';

export default function ProfileScreen() {
  const router = useRouter();
  const { currency, language, requireAuth, session, setCurrency, setLanguage, signOut, t } = useApp();

  return (
    <ScrollView className="flex-1 bg-mint-50 dark:bg-forest-950" contentContainerStyle={{ paddingBottom: 42 }}>
      <View className="items-center px-5 pb-7 pt-8">
        <View className="h-24 w-24 items-center justify-center rounded-[32px] bg-frog-200 dark:bg-forest-700">
          <MaterialCommunityIcons name={session ? 'account-check' : 'account-outline'} size={50} color="#087443" />
        </View>
        <Text className="mt-5 text-2xl font-black text-forest-950 dark:text-white">
          {session?.user.email ?? t('welcome')}
        </Text>
        <Text className="mt-2 text-center text-base leading-6 text-forest-600 dark:text-mint-200">
          {session ? t('accountReady') : t('guestBody')}
        </Text>
        {session ? (
          <Pressable className="mt-5 rounded-2xl border border-forest-300 px-5 py-3 dark:border-mint-600" onPress={signOut}>
            <Text className="font-extrabold text-forest-800 dark:text-mint-100">{t('signOut')}</Text>
          </Pressable>
        ) : (
          <Pressable className="mt-5 rounded-2xl bg-forest-800 px-7 py-4" onPress={() => router.push('/(aux)/auth-modal')}>
            <Text className="font-black text-white">{t('signIn')} / {t('signUp')}</Text>
          </Pressable>
        )}
      </View>

      <View className="border-y border-mint-200 bg-white px-5 dark:border-forest-700 dark:bg-forest-900">
        {[
          [t('profilePhotos'), 'camera-outline'], [t('saved'), 'bookmark-outline'], [t('business'), 'store-cog-outline'],
        ].map(([label, icon], index) => (
          <Pressable className={index < 2 ? 'flex-row items-center border-b border-mint-100 py-5 dark:border-forest-800' : 'flex-row items-center py-5'} key={label} onPress={() => requireAuth(label)}>
            <MaterialCommunityIcons name={icon as 'camera-outline'} size={25} color="#087443" />
            <Text className="ml-4 flex-1 font-extrabold text-forest-900 dark:text-white">{label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#75a291" />
          </Pressable>
        ))}
      </View>

      <View className="px-5 pt-7">
        <Text className="text-xl font-black text-forest-950 dark:text-white">{t('settings')}</Text>
        <Text className="mb-2 mt-5 text-xs font-black uppercase tracking-widest text-forest-500 dark:text-mint-300">Idioma / Language</Text>
        <View className="flex-row rounded-2xl bg-mint-100 p-1 dark:bg-forest-800">
          {(['es', 'en'] as const).map((item) => <Pressable className={language === item ? 'flex-1 rounded-xl bg-white py-3 dark:bg-forest-700' : 'flex-1 py-3'} key={item} onPress={() => setLanguage(item)}><Text className="text-center font-black text-forest-900 dark:text-white">{item === 'es' ? 'Español' : 'English'}</Text></Pressable>)}
        </View>
        <Text className="mb-2 mt-5 text-xs font-black uppercase tracking-widest text-forest-500 dark:text-mint-300">Moneda / Currency</Text>
        <View className="flex-row rounded-2xl bg-mint-100 p-1 dark:bg-forest-800">
          {(['CRC', 'USD'] as const).map((item) => <Pressable className={currency === item ? 'flex-1 rounded-xl bg-white py-3 dark:bg-forest-700' : 'flex-1 py-3'} key={item} onPress={() => setCurrency(item)}><Text className="text-center font-black text-forest-900 dark:text-white">{item === 'CRC' ? '₡ Colones' : language === 'es' ? '$ Dólares' : '$ Dollars'}</Text></Pressable>)}
        </View>
        <View className="mt-6 flex-row items-center rounded-2xl border border-mint-200 p-4 dark:border-forest-700">
          <MaterialCommunityIcons name="theme-light-dark" size={24} color="#087443" />
          <View className="ml-3 flex-1"><Text className="font-extrabold text-forest-900 dark:text-white">{t('systemTheme')}</Text><Text className="mt-1 text-sm text-forest-500 dark:text-mint-300">{t('systemThemeBody')}</Text></View>
          <Text className="font-bold text-forest-500 dark:text-mint-200">{t('automatic')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
