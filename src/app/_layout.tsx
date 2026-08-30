import '@/global.css';

import { Stack } from 'expo-router';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'nativewind';

import { AnimatedSplash } from '@/components/animated-splash';
import { AppProvider } from '@/providers/app-provider';
import { queryClient } from '@/lib/query-client';
import { AppThemeProvider } from '@/theme/theme-provider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const onReady = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Head>
        <title>Descubriendo CR</title>
        <meta name="description" content="Explorá Costa Rica, su biodiversidad, comercios y rutas." />
      </Head>
      <AppThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <AppProvider>
          <View className="flex-1 bg-ui-background dark:bg-ui-dark-background" onLayout={onReady}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="subscriptions" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="claim-business" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/species" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/province" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/traveler-profile" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/auth-modal" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            </Stack>
          </View>
          {showSplash ? <AnimatedSplash onFinish={() => setShowSplash(false)} /> : null}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </AppProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
