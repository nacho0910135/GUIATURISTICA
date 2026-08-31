import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowRightLeft, CircleUserRound, Moon, Sun } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/button';
import { useApp, type VisitorType } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

const visitorOptions: readonly { id: VisitorType; label: string; labelEs: string }[] = [
  { id: 'tico', label: 'Tico', labelEs: 'Tico' },
  { id: 'foreigner', label: 'Foreigner', labelEs: 'Foreigner' },
];

export function GlobalHeader() {
  const { avatarUrl, exchangeRate, language, setVisitorType, visitorType } = useApp();
  const { colors, mode, toggleMode } = useAppTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [blink] = useState(() => new Animated.Value(0));
  const formattedRate = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(exchangeRate);

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

  const isSpanish = language === 'es';

  return (
    <SafeAreaView edges={['top']} className="overflow-hidden border-b border-ui-border bg-ui-glass dark:border-ui-dark-border dark:bg-ui-dark-glass">
      <BlurView intensity={mode === 'dark' ? 42 : 62} style={StyleSheet.absoluteFill} tint={mode === 'dark' ? 'dark' : 'light'} />
      <View className="absolute inset-0 bg-ui-glass/80 dark:bg-ui-dark-glass/80" pointerEvents="none" />
      <View className="mx-auto w-full max-w-content px-4 py-2.5 md:flex-row md:items-center md:justify-between md:px-6">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityLabel={isSpanish ? 'Ir a Explorar' : 'Go to Explore'}
            accessibilityRole="link"
            className="min-h-11 flex-row items-center rounded-xl pr-3 focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-75 dark:focus-visible:ring-ui-dark-focus"
            onPress={() => router.replace({ pathname: '/(tabs)/explore', params: { reset: String(Date.now()) } })}
          >
            <View className="h-11 w-11 overflow-hidden rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
              <Image contentFit="contain" contentPosition="center" source={require('@/assets/brand/frog-logo-open.png')} style={{ height: '100%', width: '100%' }} />
              <Animated.View style={{ inset: 0, opacity: blink, pointerEvents: 'none', position: 'absolute' }}>
                <Image contentFit="contain" source={require('@/assets/brand/frog-logo-blink.png')} style={{ height: '100%', width: '100%' }} />
              </Animated.View>
            </View>
            <View className="ml-3">
              <Text className="font-display text-lg tracking-tight text-ui-text dark:text-ui-dark-text">Descubriendo <Text className="text-ui-primary dark:text-ui-dark-primary">CR</Text></Text>
              <Text className="font-sans text-[10px] uppercase tracking-[1.4px] text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Explorá distinto' : 'Explore differently'}</Text>
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
            className="h-10 flex-row items-center rounded-control border border-ui-border bg-ui-surface/80 px-3 dark:border-ui-dark-border dark:bg-ui-dark-surface/80"
          >
            <ArrowRightLeft color={colors.secondary} size={15} strokeWidth={2} />
            <Text className="ml-2 font-medium text-[11px] text-ui-text-muted dark:text-ui-dark-text-muted">USD</Text>
            <Text className="ml-1.5 font-bold text-xs text-ui-text dark:text-ui-dark-text">₡{formattedRate}</Text>
          </View>

          <View className="flex-row rounded-control border border-ui-border bg-ui-muted p-0.5 dark:border-ui-dark-border dark:bg-ui-dark-muted">
            {visitorOptions.map((item) => {
              const selected = visitorType === item.id;
              return (
                <Pressable
                  accessibilityLabel={isSpanish ? item.labelEs : item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={selected ? 'h-9 min-w-12 items-center justify-center rounded-[10px] bg-ui-primary px-3 focus-visible:ring-2 focus-visible:ring-ui-focus dark:bg-ui-dark-primary dark:focus-visible:ring-ui-dark-focus' : 'h-9 min-w-12 items-center justify-center rounded-[10px] px-3 focus-visible:ring-2 focus-visible:ring-ui-focus active:bg-ui-surface dark:focus-visible:ring-ui-dark-focus dark:active:bg-ui-dark-surface'}
                  key={item.id}
                  onPress={() => setVisitorType(item.id)}
                >
                  <Text className={selected ? 'font-semibold text-xs text-white dark:text-ui-dark-background' : 'font-semibold text-xs text-ui-text-muted dark:text-ui-dark-text-muted'}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="hidden flex-row gap-2 md:flex">
            <ThemeButton isSpanish={isSpanish} mode={mode} onPress={toggleMode} />
            <ProfileButton avatarUrl={avatarUrl} label={isSpanish ? 'Abrir perfil y planes Pro' : 'Open profile and Pro plans'} onPress={() => router.push('/(tabs)/profile')} />
          </View>
        </View>
      </View>
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
      className="h-10 w-16 overflow-hidden rounded-full border border-ui-border p-1 focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-75 dark:border-ui-dark-border dark:focus-visible:ring-ui-dark-focus"
      hitSlop={4}
      onPress={onPress}
      style={{ backgroundColor: mode === 'dark' ? '#1E5B75' : '#F5D76E' }}
    >
      <Sun color="#B96708" size={15} strokeWidth={2.2} style={{ left: 10, position: 'absolute', top: 12 }} />
      <Moon color="#DCEAF2" size={15} strokeWidth={2.2} style={{ position: 'absolute', right: 10, top: 12 }} />
      <Animated.View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: mode === 'dark' ? '#102E40' : '#FFFFFF', transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] }}>
        {mode === 'dark' ? <Moon color="#DCEAF2" size={16} strokeWidth={2.1} /> : <Sun color={colors.warning} size={16} strokeWidth={2.1} />}
      </Animated.View>
    </Pressable>
  );
}

function ProfileButton({ avatarUrl, label, onPress }: { avatarUrl: string | null; label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return avatarUrl ? (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      className="h-10 w-10 overflow-hidden rounded-full border border-ui-border bg-ui-surface focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-75 dark:border-ui-dark-border dark:bg-ui-dark-surface dark:focus-visible:ring-ui-dark-focus"
      onPress={onPress}
      style={{ transform: [{ translateX: -5 }] }}
    >
      <Image cachePolicy="none" contentFit="cover" contentPosition="center" source={{ uri: avatarUrl }} style={{ height: 40, width: 40 }} />
    </Pressable>
  ) : (
    <IconButton accessibilityLabel={label} accessibilityRole="link" icon={<CircleUserRound color={colors.primary} size={20} strokeWidth={1.9} />} onPress={onPress} size="sm" />
  );
}
