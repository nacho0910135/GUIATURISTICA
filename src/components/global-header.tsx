import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, CircleUserRound, Moon, Sun } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/button';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { useTravelerMessagesSync } from '@/hooks/use-traveler-messages-sync';
import { getAccessStatus, getMySubscriptions, openSubscriptionCheckout } from '@/lib/billing';
import { getPrivateConversations, markMessageRead } from '@/lib/social-profile';
import { supabase } from '@/lib/supabase';
import { useApp, type VisitorType } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

const visitorOptions: readonly { id: VisitorType; label: string; labelEs: string }[] = [
  { id: 'tico', label: 'Tico', labelEs: 'Tico' },
  { id: 'foreigner', label: 'Foreigner', labelEs: 'Foreigner' },
];
const SOCIAL_NOTIFICATION_TYPES = ['follow', 'like', 'comment'] as const;
type SocialNotificationType = typeof SOCIAL_NOTIFICATION_TYPES[number];
let lastPresentedSocialNotificationId: string | null = null;

export function GlobalHeader() {
  const { avatarUrl, exchangeRate, language, session, setVisitorType, visitorType } = useApp();
  const { colors, mode, toggleMode } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const routeParams = useLocalSearchParams<{ section?: string }>();
  const reduceMotion = useReducedMotion();
  const [blink] = useState(() => new Animated.Value(0));
  const [entrance] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [glow] = useState(() => new Animated.Value(reduceMotion ? 0.28 : 0.16));
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [visibleSocialNotificationId, setVisibleSocialNotificationId] = useState<string>();
  const formattedRate = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(exchangeRate);
  const subscriptions = useQuery({ queryKey: ['my-subscriptions'], queryFn: getMySubscriptions, enabled: Boolean(session) });
  const messages = useQuery({ queryKey: ['header-private-conversations', session?.user.id], queryFn: () => getPrivateConversations(session!.user.id), enabled: Boolean(session), staleTime: 0 });
  const socialActivity = useQuery({
    queryKey: ['header-unread-social-activity', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('id,actor_id,type,target_id,created_at,actor:users!notifications_actor_id_fkey(username,full_name)').eq('recipient_id', session!.user.id).in('type', SOCIAL_NOTIFICATION_TYPES).eq('read_status', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(session),
    staleTime: 0,
  });
  const refetchSocialActivityRef = useRef(socialActivity.refetch);
  refetchSocialActivityRef.current = socialActivity.refetch;
  useTravelerMessagesSync(session?.user.id, () => { void messages.refetch(); });
  const access = session ? getAccessStatus(session.user.created_at, subscriptions.data ?? []) : null;
  const unreadConversation = messages.data?.filter((item) => item.unread_count > 0).sort((a, b) => (b.messages.at(-1)?.created_at ?? '').localeCompare(a.messages.at(-1)?.created_at ?? ''))[0];
  const isInChat = pathname.includes('traveler-profile') || (pathname.includes('profile') && routeParams.section === 'messages');
  const socialActor = Array.isArray(socialActivity.data?.actor) ? socialActivity.data.actor[0] : socialActivity.data?.actor;
  const socialActorName = socialActor?.username || socialActor?.full_name || (language === 'es' ? 'Un viajero' : 'A traveler');
  const socialType = socialActivity.data?.type as SocialNotificationType | undefined;
  const socialCopy = socialType === 'like'
    ? { es: 'reaccionó a tu publicación:', en: 'reacted to your post:', icon: 'thumb-up-outline' as const }
    : socialType === 'comment'
      ? { es: 'comentó en tu publicación:', en: 'commented on your post:', icon: 'comment-outline' as const }
      : { es: 'Tenés un nuevo seguidor:', en: 'You have a new follower:', icon: 'account-plus-outline' as const };

  useEffect(() => {
    if (!session?.user.id) return;
    const refresh = () => { void refetchSocialActivityRef.current(); };
    const channel = supabase
      .channel(`header-social-notifications:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${session.user.id}`,
        },
        (payload) => {
          if (SOCIAL_NOTIFICATION_TYPES.includes(payload.new.type as SocialNotificationType)) refresh();
        },
      )
      .subscribe();
    const interval = setInterval(refresh, 2500);
    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  useEffect(() => {
    const notificationId = socialActivity.data?.id;
    if (!notificationId || notificationId === lastPresentedSocialNotificationId) return;
    lastPresentedSocialNotificationId = notificationId;
    setVisibleSocialNotificationId(notificationId);
    const timeout = setTimeout(() => setVisibleSocialNotificationId(undefined), 2000);
    return () => clearTimeout(timeout);
  }, [socialActivity.data?.id]);

  useEffect(() => {
    if (reduceMotion) {
      blink.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(660),
      Animated.timing(blink, { duration: 90, toValue: 1, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(160),
      Animated.timing(blink, { duration: 90, toValue: 0, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [blink, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      glow.setValue(0.28);
      return;
    }
    const reveal = Animated.spring(entrance, { damping: 16, stiffness: 130, toValue: 1, useNativeDriver: Platform.OS !== 'web' });
    const shimmer = Animated.loop(Animated.sequence([
      Animated.timing(glow, { duration: 1800, toValue: 0.46, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(glow, { duration: 1800, toValue: 0.16, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    reveal.start();
    shimmer.start();
    return () => { reveal.stop(); shimmer.stop(); };
  }, [entrance, glow, reduceMotion]);

  const isSpanish = language === 'es';
  const startMonthlyCheckout = async () => {
    if (openingCheckout) return;
    setOpeningCheckout(true);
    try {
      await openSubscriptionCheckout({ offerId: 'universal_monthly' });
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (isSpanish ? 'No se pudo abrir el pago.' : 'Checkout could not be opened.'));
    } finally {
      setOpeningCheckout(false);
    }
  };
  const openUnreadConversation = async () => {
    if (!unreadConversation || !session) return;
    router.push({ pathname: '/(tabs)/profile', params: { section: 'messages', partnerId: unreadConversation.partner_id } });
    const unread = unreadConversation.messages.filter((item) => item.recipient_id === session.user.id && !item.read_status);
    try {
      await Promise.all(unread.map((item) => markMessageRead(item.id)));
      await messages.refetch();
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (isSpanish ? 'No se pudo marcar el mensaje como leído.' : 'The message could not be marked as read.'));
    }
  };
  const openSocialNotification = () => {
    if (!socialActivity.data) return;
    setVisibleSocialNotificationId(undefined);
    router.push({ pathname: '/(tabs)/profile', params: { section: socialType === 'follow' ? 'community' : 'notifications' } });
  };

  return (
    <SafeAreaView edges={['top']} className="relative border-b border-ui-border bg-ui-glass shadow-floating dark:border-ui-dark-border dark:bg-ui-dark-glass" style={{ elevation: 14, shadowColor: colors.primary, shadowOffset: { height: 8, width: 0 }, shadowOpacity: mode === 'dark' ? 0.32 : 0.2, shadowRadius: 16 }}>
      <BlurView intensity={mode === 'dark' ? 42 : 62} style={StyleSheet.absoluteFill} tint={mode === 'dark' ? 'dark' : 'light'} />
      <View className="absolute inset-0 bg-ui-glass/80 dark:bg-ui-dark-glass/80" pointerEvents="none" />
      <Animated.View className="absolute bottom-0 left-[8%] right-[8%] h-1 rounded-full bg-ui-secondary dark:bg-ui-dark-secondary" pointerEvents="none" style={{ opacity: glow, transform: [{ scaleX: glow.interpolate({ inputRange: [0.16, 0.46], outputRange: [0.72, 1] }) }] }} />
      <Animated.View className="mx-auto w-full max-w-content px-4 py-2.5 md:flex-row md:items-center md:justify-between md:px-6" style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityLabel={isSpanish ? 'Ir a Explorar' : 'Go to Explore'}
            accessibilityRole="link"
            className="min-h-11 flex-row items-center rounded-xl pr-3 shadow-card focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-75 dark:focus-visible:ring-ui-dark-focus"
            onPress={() => router.replace({ pathname: '/(tabs)/explore', params: { reset: String(Date.now()) } })}
            style={{ elevation: 6, shadowColor: colors.secondary, shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 7 }}
          >
            <View className="relative h-11 w-11 rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
              <Animated.View className="absolute -inset-1 rounded-2xl bg-ui-secondary dark:bg-ui-dark-secondary" pointerEvents="none" style={{ opacity: glow, transform: [{ scale: glow.interpolate({ inputRange: [0.16, 0.46], outputRange: [0.94, 1.1] }) }] }} />
              <Image contentFit="contain" contentPosition="center" source={require('@/assets/brand/frog-logo-open.png')} style={{ height: '100%', width: '100%' }} />
              <Animated.View style={{ inset: 0, opacity: blink, pointerEvents: 'none', position: 'absolute' }}>
                <Image contentFit="contain" source={require('@/assets/brand/frog-logo-blink.png')} style={{ height: '100%', width: '100%' }} />
              </Animated.View>
            </View>
            <View className="ml-3">
              <Text className="font-display text-lg tracking-tight text-ui-text dark:text-ui-dark-text">Descubriendo <Text style={{ color: '#0077A8', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 21, fontWeight: '800' }}>C</Text><Text style={{ color: '#E8494A', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 21, fontWeight: '800' }}>R</Text></Text>
              <Text className="font-sans text-[10px] uppercase tracking-[1.4px] text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Explorá distinto 🇨🇷' : 'Explore differently 🇨🇷'}</Text>
            </View>
          </Pressable>

          <View className="flex-row gap-2 md:hidden">
            <ThemeButton isSpanish={isSpanish} mode={mode} onPress={toggleMode} />
            <ProfileButton avatarUrl={avatarUrl} label={isSpanish ? 'Abrir perfil y planes Pro' : 'Open profile and Pro plans'} onPress={() => router.push('/(tabs)/profile')} />
          </View>
        </View>

        <View className="mt-2 flex-row items-center justify-between gap-2 md:mt-0 md:justify-end">
          <View
            accessibilityLabel={isSpanish ? `Un dólar equivale a ${formattedRate} colones` : `One dollar equals ${formattedRate} colones`}
            className="h-10 flex-row items-center rounded-control border border-ui-border bg-ui-surface/80 px-3 shadow-card dark:border-ui-dark-border dark:bg-ui-dark-surface/80"
            style={{ elevation: 6, shadowColor: colors.secondary, shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }}
          >
            <ArrowRightLeft color={colors.secondary} size={15} strokeWidth={2} />
            <Text className="ml-2 font-medium text-[11px] text-ui-text-muted dark:text-ui-dark-text-muted">USD</Text>
            <Text className="ml-1.5 font-bold text-xs text-ui-text dark:text-ui-dark-text">₡{formattedRate}</Text>
          </View>

          <View className="flex-row rounded-control border border-ui-border bg-ui-muted p-0.5 shadow-card dark:border-ui-dark-border dark:bg-ui-dark-muted" style={{ elevation: 6, shadowColor: colors.primary, shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 6 }}>
            {visitorOptions.map((item) => {
              const selected = visitorType === item.id;
              return (
                <Pressable
                  accessibilityLabel={isSpanish ? item.labelEs : item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={selected ? 'h-9 min-w-12 items-center justify-center rounded-[10px] bg-ui-primary px-3 shadow-card focus-visible:ring-2 focus-visible:ring-ui-focus dark:bg-ui-dark-primary dark:focus-visible:ring-ui-dark-focus' : 'h-9 min-w-12 items-center justify-center rounded-[10px] px-3 focus-visible:ring-2 focus-visible:ring-ui-focus active:bg-ui-surface dark:focus-visible:ring-ui-dark-focus dark:active:bg-ui-dark-surface'}
                  key={item.id}
                  onPress={() => setVisitorType(item.id)}
                  style={selected ? { elevation: 5, shadowColor: colors.primary, shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.3, shadowRadius: 5 } : undefined}
                >
                  <Text className={selected ? 'font-semibold text-xs text-white dark:text-ui-dark-background' : 'font-semibold text-xs text-ui-text-muted dark:text-ui-dark-text-muted'}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="hidden flex-row gap-2 md:flex">
            <ThemeButton isSpanish={isSpanish} mode={mode} onPress={toggleMode} />
            <ProfileButton avatarUrl={avatarUrl} desktopOffset label={isSpanish ? 'Abrir perfil y planes Pro' : 'Open profile and Pro plans'} onPress={() => router.push('/(tabs)/profile')} />
          </View>
        </View>
        {access && !access.hasPersonalPlan ? <Pressable accessibilityLabel={isSpanish ? 'Continuar descubriendo por dos dólares mensuales' : 'Keep discovering for two dollars per month'} accessibilityRole="button" className={access.showTrialWarning || !access.hasAccess ? 'mt-2 flex-row items-center rounded-2xl border border-amber-300 bg-amber-50 px-3 py-1.5 shadow-card' : 'mt-2 flex-row items-center rounded-2xl border border-ui-primary/25 bg-ui-primary-soft px-3 py-1.5 shadow-card dark:bg-ui-dark-primary-soft'} disabled={openingCheckout} onPress={() => void startMonthlyCheckout()} style={{ elevation: 7, shadowColor: access.showTrialWarning || !access.hasAccess ? '#B96708' : colors.primary, shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.22, shadowRadius: 8 }}><View className="h-8 w-8 items-center justify-center rounded-xl bg-ui-primary dark:bg-ui-dark-primary"><MaterialCommunityIcons name="compass-outline" size={18} color="white" /></View><View className="ml-3 flex-1"><Text className={access.showTrialWarning || !access.hasAccess ? 'text-[11px] font-black text-amber-900' : 'text-[11px] font-black text-ui-primary dark:text-ui-dark-primary'}>{access.hasAccess ? (isSpanish ? `${access.trialDaysRemaining} ${access.trialDaysRemaining === 1 ? 'día gratis restante' : 'días gratis restantes'}` : `${access.trialDaysRemaining} free ${access.trialDaysRemaining === 1 ? 'day' : 'days'} left`) : (isSpanish ? 'Tu prueba gratuita terminó' : 'Your free trial has ended')}</Text><Text className={access.showTrialWarning || !access.hasAccess ? 'text-[10px] leading-3 font-bold text-amber-800' : 'text-[10px] leading-3 font-bold text-ui-text-muted dark:text-ui-dark-text-muted'}>{isSpanish ? 'Podés seguir descubriendo sitios por US$2 mensuales' : 'Keep discovering places for US$2 per month'}</Text></View>{openingCheckout ? <ActivityIndicator color="#0B6B4F" size="small" /> : <MaterialCommunityIcons name="arrow-right" size={19} color="#0B6B4F" />}</Pressable> : null}
        {unreadConversation && !isInChat ? <Pressable accessibilityLabel={isSpanish ? `Abrir nuevo mensaje de ${unreadConversation.partner_name}` : `Open new message from ${unreadConversation.partner_name}`} accessibilityRole="button" className="mt-2 min-h-12 flex-row items-center rounded-2xl border border-ui-secondary/30 bg-ui-surface px-3 py-2 shadow-card dark:border-ui-dark-secondary/40 dark:bg-ui-dark-surface" onPress={() => void openUnreadConversation()}><View className="h-8 w-8 items-center justify-center rounded-xl bg-ui-secondary"><MaterialCommunityIcons name="message-text-outline" size={18} color="white" /></View><View className="ml-3 flex-1"><Text className="text-[11px] font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Recibiste un nuevo mensaje de:' : 'You received a new message from:'}</Text><Text className="text-[10px] font-bold text-ui-secondary dark:text-ui-dark-secondary">{unreadConversation.partner_name}</Text></View><MaterialCommunityIcons name="arrow-right" size={19} color={colors.secondary} /></Pressable> : null}
        {socialActivity.data && visibleSocialNotificationId === socialActivity.data.id ? <Pressable accessibilityLabel={isSpanish ? `Abrir actividad nueva de ${socialActorName}` : `Open new activity from ${socialActorName}`} accessibilityRole="button" className="mt-2 min-h-12 flex-row items-center rounded-2xl border border-ui-primary/25 bg-ui-primary-soft px-3 py-2 shadow-card dark:bg-ui-dark-primary-soft" onPress={openSocialNotification}><View className="h-8 w-8 items-center justify-center rounded-xl bg-ui-primary dark:bg-ui-dark-primary"><MaterialCommunityIcons name={socialCopy.icon} size={18} color="white" /></View><View className="ml-3 flex-1"><Text className="text-[11px] font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? socialCopy.es : socialCopy.en}</Text><Text className="text-[10px] font-bold text-ui-primary dark:text-ui-dark-primary">{socialActorName}</Text></View><MaterialCommunityIcons name="arrow-right" size={19} color={colors.primary} /></Pressable> : null}
      </Animated.View>
    </SafeAreaView>
  );
}

function ThemeButton({ isSpanish, mode, onPress }: { isSpanish: boolean; mode: 'light' | 'dark'; onPress: () => void }) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const position = useRef(new Animated.Value(mode === 'dark' ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(position, { duration: reduceMotion ? 0 : 180, toValue: mode === 'dark' ? 1 : 0, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [mode, position, reduceMotion]);

  return (
    <Pressable
      accessibilityLabel={mode === 'dark' ? (isSpanish ? 'Cambiar a tema claro' : 'Switch to light theme') : (isSpanish ? 'Cambiar a tema oscuro' : 'Switch to dark theme')}
      accessibilityRole="switch"
      accessibilityState={{ checked: mode === 'dark' }}
      className="h-10 w-16 overflow-hidden rounded-full border border-ui-border p-1 shadow-card focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-75 dark:border-ui-dark-border dark:focus-visible:ring-ui-dark-focus"
      hitSlop={4}
      onPress={onPress}
      style={{ backgroundColor: mode === 'dark' ? '#1E5B75' : '#F5D76E', elevation: 7, shadowColor: mode === 'dark' ? '#102E40' : '#B96708', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.28, shadowRadius: 7 }}
    >
      {mode === 'dark'
        ? <Sun color="#B96708" size={15} strokeWidth={2.2} style={{ left: 10, position: 'absolute', top: 12 }} />
        : <Moon color="#DCEAF2" size={15} strokeWidth={2.2} style={{ position: 'absolute', right: 10, top: 12 }} />}
      <Animated.View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: mode === 'dark' ? '#102E40' : '#FFFFFF', transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] }}>
        {mode === 'dark' ? <Moon color="#DCEAF2" size={16} strokeWidth={2.1} /> : <Sun color={colors.warning} size={16} strokeWidth={2.1} />}
      </Animated.View>
    </Pressable>
  );
}

function ProfileButton({ avatarUrl, desktopOffset = false, label, onPress }: { avatarUrl: string | null; desktopOffset?: boolean; label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return avatarUrl ? (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      className="h-10 w-10 overflow-hidden rounded-full border border-ui-border bg-ui-surface focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-75 dark:border-ui-dark-border dark:bg-ui-dark-surface dark:focus-visible:ring-ui-dark-focus"
      onPress={onPress}
      style={desktopOffset ? { transform: [{ translateX: -5 }] } : undefined}
    >
      <Image cachePolicy="none" contentFit="cover" contentPosition="center" source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} />
    </Pressable>
  ) : (
    <IconButton accessibilityLabel={label} accessibilityRole="link" icon={<CircleUserRound color={colors.primary} size={20} strokeWidth={1.9} />} onPress={onPress} size="sm" />
  );
}
