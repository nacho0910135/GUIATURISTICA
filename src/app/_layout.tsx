import '@/global.css';

import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand/400Regular';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'nativewind';

import { AnimatedSplash } from '@/components/animated-splash';
import { ThemedAlertProvider } from '@/components/themed-alert';
import { AppProvider } from '@/providers/app-provider';
import { queryClient } from '@/lib/query-client';
import { isExploreStartupReady, subscribeToExploreStartupReady } from '@/lib/startup-gate';
import { AppThemeProvider } from '@/theme/theme-provider';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background"><Text accessibilityRole="alert" className="text-center text-xl font-black text-ui-text dark:text-ui-dark-text">Algo salió mal</Text><Text className="mt-2 text-center text-ui-text-muted dark:text-ui-dark-text-muted">Podés volver a intentar sin cerrar la aplicación.</Text><Pressable accessibilityRole="button" className="mt-5 rounded-control bg-ui-primary px-6 py-4" onPress={() => void retry()}><Text className="font-black text-white">Reintentar</Text></Pressable></View>;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [showSplash, setShowSplash] = useState(Platform.OS !== 'web');
  const [exploreReady, setExploreReady] = useState(isExploreStartupReady);
  const [startupDeadline, setStartupDeadline] = useState(false);
  const finishSplash = useCallback(() => setShowSplash(false), []);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    PatrickHand_400Regular,
  });
  const onReady = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontError, fontsLoaded]);

  useEffect(() => subscribeToExploreStartupReady(() => setExploreReady(true)), []);
  useEffect(() => {
    const timer = setTimeout(() => setStartupDeadline(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  if (!fontsLoaded && !fontError && !startupDeadline) return null;

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
              <ThemedAlertProvider>
                <View className="flex-1 bg-ui-background dark:bg-ui-dark-background" onLayout={onReady}>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="subscriptions" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="claim-business" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="delete-account" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(aux)/species" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="(aux)/province" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="(aux)/traveler-profile" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="(aux)/private-messages" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="(aux)/auth-modal" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
                  </Stack>
                </View>
                {showSplash ? <AnimatedSplash appReady={exploreReady || startupDeadline} onFinish={finishSplash} /> : null}
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              </ThemedAlertProvider>
          </AppProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
