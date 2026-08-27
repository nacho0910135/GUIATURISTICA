import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { AdBanner } from '@/components/ad-banner';
import { getAccountDashboard, getBillingUrl, uploadBusinessPhoto } from '@/lib/commerce';
import { useApp } from '@/providers/app-provider';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { language, requireAuth, session, setVisitorType, signOut, t, visitorType } = useApp();
  const dashboard = useQuery({
    queryKey: ['account-dashboard', session?.user.id],
    queryFn: () => getAccountDashboard(session!.user.id),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  });
  const addPhoto = useMutation({
    mutationFn: async () => {
      if (!session || !dashboard.data?.services[0]) throw new Error('No hay un comercio asociado a esta cuenta.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (result.canceled) return null;
      return uploadBusinessPhoto(dashboard.data.services[0], session.user.id, result.assets[0]);
    },
    onSuccess: (url) => {
      if (url) void queryClient.invalidateQueries({ queryKey: ['account-dashboard', session?.user.id] });
    },
    onError: (error) => Alert.alert(language === 'es' ? 'No se pudo subir' : 'Upload failed', error.message),
  });
  const openPlan = async (plan: 'no_ads' | 'business' | 'sponsored') => {
    if (!requireAuth(plan)) return;
    if (plan === 'no_ads' && Platform.OS !== 'web') {
      Alert.alert(language === 'es' ? 'Compra dentro de la app pendiente' : 'In-app purchase pending', language === 'es' ? 'Conectá este plan a App Store y Google Play antes de publicarlo.' : 'Connect this plan to App Store and Google Play before release.');
      return;
    }
    const url = getBillingUrl(plan, session?.user.id);
    if (!url) {
      Alert.alert(language === 'es' ? 'Checkout pendiente' : 'Checkout pending', language === 'es' ? 'Configurá EXPO_PUBLIC_BILLING_URL con el checkout de tu proveedor de pagos.' : 'Set EXPO_PUBLIC_BILLING_URL to your payment provider checkout.');
      return;
    }
    await Linking.openURL(url);
  };
  const isPremium = Boolean(dashboard.data?.profile?.is_premium);
  const isMerchant = dashboard.data?.profile?.role === 'verified_merchant' || dashboard.data?.profile?.role === 'admin' || Boolean(dashboard.data?.services.length);

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

      {session ? (
        <View className="px-5 pt-7">
          <Text className="text-xl font-black text-forest-950 dark:text-white">{language === 'es' ? 'Mi actividad' : 'My activity'}</Text>
          <View className="mt-4 flex-row gap-3">
            {[
              [dashboard.data?.savedCount ?? 0, language === 'es' ? 'Guardados' : 'Saved', 'bookmark'],
              [dashboard.data?.photoCount ?? 0, language === 'es' ? 'Fotos' : 'Photos', 'camera'],
              [dashboard.data?.sightingCount ?? 0, language === 'es' ? 'Avistamientos' : 'Sightings', 'paw'],
            ].map(([value, label, icon]) => (
              <View key={label} className="flex-1 items-center rounded-2xl bg-white px-2 py-4 dark:bg-forest-900">
                <MaterialCommunityIcons name={icon as 'bookmark'} size={22} color="#087443" />
                <Text className="mt-2 text-xl font-black text-forest-950 dark:text-white">{value}</Text>
                <Text className="mt-1 text-center text-xs font-bold text-forest-500 dark:text-mint-300">{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="px-5 pt-7">
        <View className={isPremium ? 'rounded-3xl bg-forest-800 p-5' : 'rounded-3xl border border-mint-200 bg-white p-5 dark:border-forest-700 dark:bg-forest-900'}>
          <View className="flex-row items-center"><MaterialCommunityIcons name="advertisements-off" size={28} color={isPremium ? '#b9f3d0' : '#087443'} /><Text className={isPremium ? 'ml-3 text-xl font-black text-white' : 'ml-3 text-xl font-black text-forest-950 dark:text-white'}>No-Ads</Text></View>
          <Text className={isPremium ? 'mt-3 leading-6 text-mint-100' : 'mt-3 leading-6 text-forest-600 dark:text-mint-200'}>{isPremium ? (language === 'es' ? 'Suscripción activa. Navegás sin banners.' : 'Active subscription. Your experience is ad-free.') : (language === 'es' ? 'Quitá los banners por $10 USD al mes.' : 'Remove banners for $10 USD per month.')}</Text>
          {!isPremium ? <Pressable onPress={() => void openPlan('no_ads')} className="mt-4 self-start rounded-2xl bg-forest-800 px-5 py-3"><Text className="font-black text-white">{language === 'es' ? 'Suscribirme · $10/mes' : 'Subscribe · $10/month'}</Text></Pressable> : null}
        </View>
      </View>

      <View className="px-5 pt-7">
        <Text className="text-xl font-black text-forest-950 dark:text-white">{language === 'es' ? 'Panel comerciante B2B' : 'B2B merchant dashboard'}</Text>
        {isMerchant && dashboard.data?.services.length ? dashboard.data.services.map((service) => {
          const metrics = dashboard.data?.metrics[service.id] ?? { impressions: 0, whatsappClicks: 0 };
          return (
            <View key={service.id} className="mt-4 rounded-3xl border border-mint-200 bg-white p-5 dark:border-forest-700 dark:bg-forest-900">
              <View className="flex-row items-start"><View className="flex-1"><Text className="text-lg font-black text-forest-950 dark:text-white">{service.title}</Text><Text className="mt-1 text-sm font-bold text-forest-500 dark:text-mint-300">{service.photos?.length ?? 0} {language === 'es' ? 'fotos' : 'photos'}</Text></View>{service.is_sponsored ? <MaterialCommunityIcons name="crown" size={25} color="#d69e2e" /> : null}</View>
              <View className="mt-4 flex-row gap-3"><Metric value={metrics.impressions} label={language === 'es' ? 'Impresiones' : 'Impressions'} /><Metric value={metrics.whatsappClicks} label="WhatsApp" /></View>
              <View className="mt-4 flex-row gap-3"><Pressable disabled={addPhoto.isPending} onPress={() => addPhoto.mutate()} className="flex-1 rounded-2xl bg-forest-800 px-3 py-3"><Text className="text-center font-black text-white">{addPhoto.isPending ? '…' : language === 'es' ? 'Agregar foto' : 'Add photo'}</Text></Pressable><Pressable onPress={() => void openPlan('sponsored')} className="flex-1 rounded-2xl bg-amber-200 px-3 py-3"><Text className="text-center font-black text-amber-900">Sponsored</Text></Pressable></View>
            </View>
          );
        }) : (
          <View className="mt-4 rounded-3xl border border-mint-200 bg-white p-5 dark:border-forest-700 dark:bg-forest-900">
            <Text className="font-black text-forest-950 dark:text-white">{language === 'es' ? 'Registrá tu negocio por $20 USD/mes' : 'Register your business for $20 USD/month'}</Text>
            <Text className="mt-2 leading-6 text-forest-600 dark:text-mint-200">{language === 'es' ? 'Incluye perfil, fotos y métricas de impresiones y clics a WhatsApp.' : 'Includes a profile, photos, impression metrics and WhatsApp clicks.'}</Text>
            <Pressable onPress={() => void openPlan('business')} className="mt-4 self-start rounded-2xl bg-forest-800 px-5 py-3"><Text className="font-black text-white">{language === 'es' ? 'Registrar negocio' : 'Register business'}</Text></Pressable>
          </View>
        )}
      </View>

      <View className="px-5 pt-7">
        <Text className="text-xl font-black text-forest-950 dark:text-white">{t('settings')}</Text>
        <Text className="mb-2 mt-5 text-xs font-black uppercase tracking-widest text-forest-500 dark:text-mint-300">Perfil de visitante / Visitor profile</Text>
        <View className="flex-row rounded-2xl bg-mint-100 p-1 dark:bg-forest-800">
          {(['tico', 'foreigner'] as const).map((item) => <Pressable className={visitorType === item ? 'flex-1 rounded-xl bg-white py-3 dark:bg-forest-700' : 'flex-1 py-3'} key={item} onPress={() => setVisitorType(item)}><Text className="text-center font-black text-forest-900 dark:text-white">{item === 'tico' ? 'Tico' : 'Foreigner'}</Text></Pressable>)}
        </View>
        <View className="mt-6 flex-row items-center rounded-2xl border border-mint-200 p-4 dark:border-forest-700">
          <MaterialCommunityIcons name="theme-light-dark" size={24} color="#087443" />
          <View className="ml-3 flex-1"><Text className="font-extrabold text-forest-900 dark:text-white">{t('systemTheme')}</Text><Text className="mt-1 text-sm text-forest-500 dark:text-mint-300">{t('systemThemeBody')}</Text></View>
          <Text className="font-bold text-forest-500 dark:text-mint-200">{t('automatic')}</Text>
        </View>
      </View>
      <AdBanner hidden={isPremium} />
    </ScrollView>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <View className="flex-1 rounded-2xl bg-mint-100 p-4 dark:bg-forest-800"><Text className="text-2xl font-black text-forest-950 dark:text-white">{value}</Text><Text className="mt-1 text-xs font-bold text-forest-500 dark:text-mint-300">{label}</Text></View>;
}
