import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

import { useApp } from '@/providers/app-provider';
import { FrogLoader } from '@/components/frog-loader';
import { supabase } from '@/lib/supabase';

export default function OAuthCallback() {
  const { authReady, isAuthenticated, language } = useApp();
  const [timedOut, setTimedOut] = useState(false);
  const url = Linking.useURL();

  // 1. Procesar y extraer el código o tokens de la URL entrante
  useEffect(() => {
    const handleExchangeCode = async () => {
      try {
        if (!url) return;

        // Parsea la URL completa utilizando expo-linking
        const parsed = Linking.parse(url);
        const queryParams = parsed.queryParams || {};
        
        let code = queryParams.code as string;

        // Si el código viene dentro de un fragmento o hash (en caso de flujo implícito)
        if (!code && parsed.url && parsed.url.includes('code=')) {
          const match = parsed.url.match(/code=([^&]+)/);
          if (match) code = match[1];
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error al intercambiar código en Supabase:', error.message);
          }
        }
      } catch (err) {
        console.error('Error procesando el callback de OAuth:', err);
      }
    };

    handleExchangeCode();
  }, [url]);

  // 2. Redirigir al perfil apenas el estado global de la app detecte la sesión activa
  useEffect(() => {
    if (authReady && isAuthenticated) {
      router.replace('/(tabs)/profile');
    }
  }, [authReady, isAuthenticated]);

  // 3. Temporizador de seguridad por si la red falla
  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background">
      {timedOut ? (
        <>
          <Text className="text-center text-lg font-bold text-ui-text dark:text-ui-dark-text">
            {language === 'es'
              ? 'No pudimos terminar el acceso con Google.'
              : 'We could not finish signing in with Google.'}
          </Text>
          <Pressable
            className="mt-5 rounded-control bg-ui-primary px-6 py-4"
            onPress={() => router.replace('/(aux)/auth-modal')}
          >
            <Text className="font-bold text-white">
              {language === 'es' ? 'Intentar nuevamente' : 'Try again'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <FrogLoader color="#087443" size="large" />
          <Text className="mt-4 text-center font-semibold text-ui-text dark:text-ui-dark-text">
            {language === 'es'
              ? 'Terminando el acceso con Google…'
              : 'Finishing Google sign-in…'}
          </Text>
        </>
      )}
    </View>
  );
}