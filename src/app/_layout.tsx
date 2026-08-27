import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'nativewind';

import { AnimatedSplash } from '@/components/animated-splash';
import { AppProvider } from '@/providers/app-provider';
import { QUERY_CACHE_MAX_AGE, queryClient, queryPersister } from '@/lib/query-client';

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
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ maxAge: QUERY_CACHE_MAX_AGE, persister: queryPersister }}>
          <AppProvider>
          <View className="flex-1 bg-mint-50 dark:bg-forest-950" onLayout={() => SplashScreen.hide()}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="(aux)/auth-modal"
                options={{ animation: 'slide_from_bottom', presentation: 'transparentModal' }}
              />
              <Stack.Screen name="(aux)/species" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(aux)/province" options={{ animation: 'slide_from_right' }} />
            </Stack>
          </View>
          {showSplash ? <AnimatedSplash onFinish={() => setShowSplash(false)} /> : null}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </AppProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
