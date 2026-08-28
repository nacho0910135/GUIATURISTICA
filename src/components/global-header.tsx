import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

export function GlobalHeader() {
  const { exchangeRate, language, setVisitorType, visitorType } = useApp();
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
      <View className="flex-row items-center justify-between gap-2 md:justify-end">
        <View accessibilityLabel={language === 'es' ? `Un dólar equivale a ${formattedRate} colones` : `One dollar equals ${formattedRate} colones`} className="min-h-10 flex-row items-center rounded-control border border-ui-border bg-ui-background px-3 dark:border-ui-dark-border dark:bg-ui-dark-background">
          <MaterialCommunityIcons name="swap-horizontal" size={16} color={colors.secondary} />
          <Text className="ml-1.5 text-[11px] font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">$1</Text>
          <Text className="ml-1 text-xs font-extrabold text-ui-text dark:text-ui-dark-text">₡{formattedRate}</Text>
        </View>
        <Pressable
          accessibilityLabel={mode === 'dark' ? (language === 'es' ? 'Cambiar a tema claro' : 'Switch to light theme') : (language === 'es' ? 'Cambiar a tema oscuro' : 'Switch to dark theme')}
          accessibilityRole="switch"
          accessibilityState={{ checked: mode === 'dark' }}
          className="h-10 w-10 items-center justify-center rounded-control border border-ui-border bg-ui-background active:opacity-70 dark:border-ui-dark-border dark:bg-ui-dark-background"
          onPress={toggleMode}
        >
          <MaterialCommunityIcons name={mode === 'dark' ? 'weather-night' : 'weather-sunny'} size={20} color={mode === 'dark' ? colors.secondary : '#B96708'} />
        </Pressable>
        <View className="flex-row rounded-control border border-ui-border bg-ui-muted p-1 dark:border-ui-dark-border dark:bg-ui-dark-muted">{(['tico', 'foreigner'] as const).map((item) => <Pressable accessibilityRole="button" className={visitorType === item ? 'min-h-9 justify-center rounded-lg bg-ui-primary px-3 dark:bg-ui-dark-primary' : 'min-h-9 justify-center px-3'} key={item} onPress={() => setVisitorType(item)}><Text className={visitorType === item ? 'text-xs font-bold text-white dark:text-ui-dark-background' : 'text-xs font-semibold text-ui-text-muted dark:text-ui-dark-text-muted'}>{item === 'tico' ? 'Tico' : 'Foreigner'}</Text></Pressable>)}</View>
      </View>
    </View>
  </SafeAreaView>;
}
