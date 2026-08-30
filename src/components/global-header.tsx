import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

export function GlobalHeader() {
  const { avatarUrl, exchangeRate, language, setVisitorType, visitorType } = useApp();
  const { colors, mode, toggleMode } = useAppTheme();
  const router = useRouter();
  const [blink] = useState(() => new Animated.Value(0));
  const formattedRate = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(exchangeRate);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(2000),
      Animated.timing(blink, { duration: 0, toValue: 1, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(2000),
      Animated.timing(blink, { duration: 0, toValue: 0, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [blink]);

  return <SafeAreaView edges={['top']} className="border-b border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface">
    <View className="mx-auto w-full max-w-content gap-2 px-4 py-2 md:flex-row md:items-center md:justify-between md:px-6 md:py-3">
      <Pressable accessibilityLabel={language === 'es' ? 'Ir a Explorar' : 'Go to Explore'} accessibilityRole="link" className="min-h-11 flex-row items-center" onPress={() => router.replace({ pathname: '/(tabs)/explore', params: { reset: String(Date.now()) } })}>
        <View className="h-11 w-11 overflow-hidden rounded-xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
          <Image contentFit="contain" contentPosition="center" source={require('@/assets/brand/frog-logo-open.png')} style={{ height: '100%', width: '100%' }} />
          <Animated.View style={{ inset: 0, opacity: blink, pointerEvents: 'none', position: 'absolute' }}>
            <Image contentFit="contain" source={require('@/assets/brand/frog-logo-blink.png')} style={{ height: '100%', width: '100%' }} />
          </Animated.View>
        </View>
        <Text className="ml-3 text-xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">Descubriendo <Text className="text-ui-primary dark:text-ui-dark-primary">CR</Text></Text>
      </Pressable>
      <View className="items-end">
        <Pressable
          accessibilityLabel={language === 'es' ? 'Abrir perfil y planes Pro' : 'Open profile and Pro plans'}
          accessibilityRole="link"
          className="mb-1 h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-ui-border bg-ui-background dark:border-ui-dark-border dark:bg-ui-dark-background"
          onPress={() => router.push('/(tabs)/profile')}
        >
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ height: 32, width: 32 }} /> : <MaterialCommunityIcons name="account-circle-outline" size={20} color={colors.primary} />}
        </Pressable>
        <View className="flex-row items-center gap-1.5">
          <View accessibilityLabel={language === 'es' ? `Un dólar equivale a ${formattedRate} colones` : `One dollar equals ${formattedRate} colones`} className="h-8 flex-row items-center rounded-control border border-ui-border bg-ui-background px-2 dark:border-ui-dark-border dark:bg-ui-dark-background">
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={colors.secondary} />
            <Text className="ml-1 text-[10px] font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">USD</Text>
            <Text className="ml-1 text-[10px] font-extrabold text-ui-text dark:text-ui-dark-text">₡{formattedRate}</Text>
          </View>
          <Pressable
            accessibilityLabel={mode === 'dark' ? (language === 'es' ? 'Cambiar a tema claro' : 'Switch to light theme') : (language === 'es' ? 'Cambiar a tema oscuro' : 'Switch to dark theme')}
            accessibilityRole="switch"
            accessibilityState={{ checked: mode === 'dark' }}
            className={mode === 'dark' ? 'h-8 w-12 justify-center rounded-full bg-ui-secondary px-1 active:opacity-70 dark:bg-ui-dark-secondary' : 'h-8 w-12 justify-center rounded-full bg-[#F8D77A] px-1 active:opacity-70'}
            onPress={toggleMode}
          >
            <View className={mode === 'dark' ? 'h-6 w-6 self-end items-center justify-center rounded-full bg-ui-surface dark:bg-ui-dark-surface' : 'h-6 w-6 items-center justify-center rounded-full bg-white'}><MaterialCommunityIcons name={mode === 'dark' ? 'weather-night' : 'weather-sunny'} size={14} color={mode === 'dark' ? colors.secondary : '#B96708'} /></View>
          </Pressable>
          <View className="flex-row rounded-control border border-ui-border bg-ui-muted p-0.5 dark:border-ui-dark-border dark:bg-ui-dark-muted">{(['tico', 'foreigner'] as const).map((item) => <Pressable accessibilityRole="button" className={visitorType === item ? 'h-7 justify-center rounded-lg bg-ui-primary px-2.5 dark:bg-ui-dark-primary' : 'h-7 justify-center px-2.5'} key={item} onPress={() => setVisitorType(item)}><Text className={visitorType === item ? 'text-[10px] font-bold text-white dark:text-ui-dark-background' : 'text-[10px] font-semibold text-ui-text-muted dark:text-ui-dark-text-muted'}>{item === 'tico' ? 'Tico' : 'Foreigner'}</Text></Pressable>)}</View>
        </View>
      </View>
    </View>
  </SafeAreaView>;
}
