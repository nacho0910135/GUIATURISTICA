import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, Text, type TextStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/providers/app-provider';

const outlinedText = Platform.select<TextStyle>({
  web: { textShadow: '-1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white' } as unknown as TextStyle,
  default: { textShadowColor: 'white', textShadowOffset: { height: 0, width: 0 }, textShadowRadius: 2 },
});

export function GlobalHeader() {
  const { currency, exchangeRate, language, setCurrency, setLanguage } = useApp();
  const router = useRouter();
  const [blink] = useState(() => new Animated.Value(0));

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

  return (
    <SafeAreaView edges={['top']} className="overflow-hidden bg-[#002b7f]">
      <View className="absolute inset-0">
        <View className="flex-1 bg-[#002b7f]" />
        <View className="flex-1 bg-white" />
        <View className="flex-[2] bg-[#ce1126]" />
        <View className="flex-1 bg-white" />
        <View className="flex-1 bg-[#002b7f]" />
      </View>
      <View className="w-full self-center px-5 pb-4 pt-3" style={{ maxWidth: 1180 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityLabel={language === 'es' ? 'Ir a Explorar' : 'Go to Explore'}
            accessibilityRole="link"
            className="flex-row items-center gap-2"
            onPress={() => router.replace('/explore')}
          >
            <View className="h-16 w-24">
              <Image
                contentFit="contain"
                source={require('@/assets/brand/frog-logo-open.png')}
                style={{ height: 108, left: -6, position: 'absolute', top: 0, width: 108 }}
              />
              <Animated.View
                style={{ height: 108, left: -6, opacity: blink, pointerEvents: 'none', position: 'absolute', top: 0, width: 108 }}
              >
                <Image contentFit="contain" source={require('@/assets/brand/frog-logo-blink.png')} style={{ height: '100%', width: '100%' }} />
              </Animated.View>
            </View>
            <Text className="tracking-tight">
              <Text className="text-xl font-black text-black md:text-2xl" style={outlinedText}>Descubriendo</Text>
              <Text className="text-xl font-black text-[#707070] md:text-2xl" style={outlinedText}> CR</Text>
            </Text>
          </Pressable>
          <View className="flex-row overflow-hidden rounded-xl border border-[#002b7f] bg-white/90">
            {(['es', 'en'] as const).map((item) => (
              <Pressable
                accessibilityLabel={`${language === 'es' ? 'Cambiar idioma a' : 'Switch language to'} ${item.toUpperCase()}`}
                accessibilityRole="button"
                className={language === item ? 'bg-[#002b7f] px-3 py-2' : 'px-3 py-2'}
                key={item}
                onPress={() => setLanguage(item)}
              >
                <Text className={language === item ? 'text-xs font-extrabold text-white' : 'text-xs font-bold text-[#002b7f]'}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="mt-2 flex-row items-center justify-end gap-2">
          <View className="flex-row items-center gap-2 rounded-2xl border border-[#002b7f] bg-white px-3 py-2" style={{ boxShadow: '0 1px 3px rgba(18, 60, 44, 0.12)' }}>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#087443" />
            <Text className="text-sm font-semibold text-forest-700">1 USD = ₡{exchangeRate.toFixed(2)}</Text>
          </View>
          <View className="flex-row overflow-hidden rounded-xl border border-[#002b7f] bg-white/90">
            {(['USD', 'CRC'] as const).map((item) => (
              <Pressable
                accessibilityLabel={`${language === 'es' ? 'Usar moneda' : 'Use currency'} ${item}`}
                accessibilityRole="button"
                className={currency === item ? 'bg-[#002b7f] px-4 py-2' : 'px-4 py-2'}
                key={item}
                onPress={() => setCurrency(item)}
              >
                <Text className={currency === item ? 'font-black text-white' : 'font-bold text-[#002b7f]'}>
                  {item === 'USD' ? '$' : '₡'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
