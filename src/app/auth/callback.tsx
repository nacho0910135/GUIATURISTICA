import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useApp } from '@/providers/app-provider';

export default function OAuthCallback() {
  const { authReady, isAuthenticated, language } = useApp();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (authReady && isAuthenticated) router.replace('/(tabs)/profile');
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background">
      {timedOut ? (
        <>
          <Text className="text-center text-lg font-bold text-ui-text dark:text-ui-dark-text">
            {language === 'es' ? 'No pudimos terminar el acceso con Google.' : 'We could not finish signing in with Google.'}
          </Text>
          <Pressable className="mt-5 rounded-control bg-ui-primary px-6 py-4" onPress={() => router.replace('/(aux)/auth-modal')}>
            <Text className="font-bold text-white">{language === 'es' ? 'Intentar nuevamente' : 'Try again'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color="#087443" size="large" />
          <Text className="mt-4 text-center font-semibold text-ui-text dark:text-ui-dark-text">
            {language === 'es' ? 'Terminando el acceso con Google…' : 'Finishing Google sign-in…'}
          </Text>
        </>
      )}
    </View>
  );
}
