import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { getMyAccessStatus } from '@/lib/billing';
import { useApp } from '@/providers/app-provider';

export function usePaidAccess() {
  const { session } = useApp();
  const access = useQuery({ queryKey: ['my-app-access', session?.user.id], queryFn: getMyAccessStatus, enabled: Boolean(session), staleTime: 60_000 });
  return { ...access, hasPaidAccess: access.data?.hasAccess === true };
}

export function SubscriptionRequired({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { language } = useApp();
  const es = language === 'es';
  return <View accessibilityRole="alert" className={`${compact ? 'my-4' : 'm-5 flex-1 justify-center'} items-center rounded-card border border-ui-primary/30 bg-ui-primary-soft p-6 dark:bg-ui-dark-primary-soft`}>
    <MaterialCommunityIcons name="lock-outline" size={38} color="#0B6B4F" />
    <Text className="mt-3 text-center text-xl font-black text-ui-text dark:text-ui-dark-text">{es ? 'Debes suscribirte para usar esta función' : 'You must subscribe to use this feature'}</Text>
    <Text className="mt-2 text-center text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{es ? 'Activá una suscripción o un pase visitante con Google Play.' : 'Activate a subscription or visitor pass with Google Play.'}</Text>
    <Button className="mt-5 w-full" disabled={false} label={es ? 'Ir a suscribirse' : 'Subscribe'} onPress={() => router.push('/subscriptions')} />
  </View>;
}
