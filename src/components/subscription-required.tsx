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
  const { language, session } = useApp();
  const es = language === 'es';
  const guest = !session;
  return <View accessibilityRole="alert" className={`${compact ? 'my-4' : 'm-5 flex-1 justify-center'} items-center rounded-card border border-ui-primary/30 bg-ui-primary-soft p-6 dark:bg-ui-dark-primary-soft`}>
    <MaterialCommunityIcons name="lock-outline" size={38} color="#0B6B4F" />
    <Text className="mt-3 text-center text-xl font-black text-ui-text dark:text-ui-dark-text">{guest ? (es ? 'Debes registrarte para usar esta función' : 'You must register to use this feature') : (es ? 'Debes suscribirte para usar esta función' : 'You must subscribe to use this feature')}</Text>
    <Text className="mt-2 text-center text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{guest ? (es ? 'Creá una cuenta o iniciá sesión con Google.' : 'Create an account or sign in with Google.') : (es ? 'Tu prueba gratuita de 15 días terminó. Activá una suscripción o un pase visitante con Google Play.' : 'Your 15-day free trial has ended. Activate a subscription or visitor pass with Google Play.')}</Text>
    <Button className="mt-5 w-full" disabled={false} label={guest ? (es ? 'Crear cuenta o iniciar sesión' : 'Create account or sign in') : (es ? 'Ir a suscribirse' : 'Subscribe')} onPress={() => router.push(guest ? { pathname: '/(aux)/auth-modal', params: { intent: es ? 'usar esta función' : 'use this feature' } } : '/subscriptions')} />
  </View>;
}
