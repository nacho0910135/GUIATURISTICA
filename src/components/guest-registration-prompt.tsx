import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useApp } from '@/providers/app-provider';

export function GuestRegistrationPrompt() {
  const router = useRouter();
  const { authReady, language, session } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (session) setVisible(false);
    else if (authReady) setVisible(true);
  }, [authReady, session]);

  const register = () => {
    setVisible(false);
    router.push({ pathname: '/(aux)/auth-modal', params: { mode: 'signup' } });
  };

  return <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
    <View className="flex-1 items-center justify-center bg-black/55 px-5">
      <View accessibilityRole="alert" className="w-full max-w-md items-center rounded-[28px] border border-ui-border bg-ui-surface p-6 shadow-2xl dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
          <MaterialCommunityIcons name="account-lock-open-outline" color="#0B6B4F" size={30} />
        </View>
        <Text className="mt-4 text-center text-2xl font-black text-ui-text dark:text-ui-dark-text">
          {language === 'es' ? 'Regístrate para desbloquear todas las funcionalidades' : 'Sign up to unlock every feature'}
        </Text>
        <Text className="mt-3 text-center leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">
          {language === 'es' ? 'Creá tu cuenta con Google o correo y disfrutá una prueba gratuita de 15 días.' : 'Create your account with Google or email and enjoy a 15-day free trial.'}
        </Text>
        <Pressable accessibilityRole="button" className="mt-6 min-h-12 w-full items-center justify-center rounded-control bg-ui-primary px-5 active:bg-ui-primary-pressed dark:bg-ui-dark-primary" onPress={register}>
          <Text className="font-black text-white">{language === 'es' ? 'Regístrame' : 'Sign me up'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" className="mt-2 min-h-12 w-full items-center justify-center rounded-control border border-ui-border bg-ui-surface px-5 active:bg-ui-muted dark:border-ui-dark-border dark:bg-ui-dark-surface dark:active:bg-ui-dark-muted" onPress={() => setVisible(false)}>
          <Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ahora no' : 'Not now'}</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}
