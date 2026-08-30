import '@/global.css';

import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'nativewind';

import { AnimatedSplash } from '@/components/animated-splash';
import { AppProvider } from '@/providers/app-provider';
import { queryClient } from '@/lib/query-client';
import { AppThemeProvider } from '@/theme/theme-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Head>
        <title>Descubriendo CR</title>
        <meta name="description" content="Explorá Costa Rica, su biodiversidad, comercios y rutas." />
      </Head>
      <AppThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
          <View className="flex-1 bg-ui-background dark:bg-ui-dark-background" onLayout={() => SplashScreen.hide()}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(aux)/species" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/province" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/traveler-profile" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/auth-modal" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            </Stack>
          </View>
          {showSplash ? <AnimatedSplash onFinish={() => setShowSplash(false)} /> : null}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </AppProvider>
        </QueryClientProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
