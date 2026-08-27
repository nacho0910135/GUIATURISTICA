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
  const { language, setVisitorType, visitorType } = useApp();
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
            {(['tico', 'foreigner'] as const).map((item) => (
              <Pressable
                accessibilityLabel={item === 'tico' ? 'Modo Tico' : 'Foreigner mode'}
                accessibilityRole="button"
                className={visitorType === item ? 'bg-[#002b7f] px-3 py-2' : 'px-3 py-2'}
                key={item}
                onPress={() => setVisitorType(item)}
              >
                <Text className={visitorType === item ? 'text-xs font-extrabold text-white' : 'text-xs font-bold text-[#002b7f]'}>{item === 'tico' ? 'Tico' : 'Foreigner'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
