import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePaidAccess } from '@/components/subscription-required';
import { getActiveCommerceBanners } from '@/lib/commerce';
import { useApp } from '@/providers/app-provider';

export function AdBanner({ hidden = false }: { hidden?: boolean }) {
  const router = useRouter();
  const { language } = useApp();
  const access = usePaidAccess();
  const banners = useQuery({ queryKey: ['commerce-banners'], queryFn: getActiveCommerceBanners, enabled: !hidden && !access.hasPaidAccess, staleTime: 5 * 60_000 });
  const banner = banners.data?.[0];
  if (hidden || access.hasPaidAccess || !banner) return null;
  const imageUrl = banner.image_url ?? banner.business.cover_image_url;
  const open = () => banner.target_url ? Linking.openURL(banner.target_url) : router.push({ pathname: '/(tabs)/commerce', params: { serviceId: banner.service_id } });
  return <Pressable accessibilityLabel={language === 'es' ? `Publicidad de ${banner.business.title}` : `Advertisement from ${banner.business.title}`} accessibilityRole="link" className="mt-2 min-h-12 overflow-hidden rounded-2xl border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface" onPress={() => void open()}>
    {imageUrl ? <Image contentFit="cover" source={{ uri: imageUrl }} style={{ height: 64, width: '100%' }} /> : <View className="min-h-16 flex-row items-center px-4"><MaterialCommunityIcons name="bullhorn-outline" size={22} color="#0077A8" /><Text className="ml-3 flex-1 font-black text-ui-text dark:text-ui-dark-text">{banner.business.title}</Text></View>}
    <Text className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">{language === 'es' ? 'Publicidad' : 'Ad'}</Text>
  </Pressable>;
}
