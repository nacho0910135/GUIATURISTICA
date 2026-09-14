import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { FrogLoader } from '@/components/frog-loader';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/providers/app-provider';

export default function ResetPasswordScreen() {
  const { language, session } = useApp();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (password.length < 8) return setError(language === 'es' ? 'Usá al menos 8 caracteres.' : 'Use at least 8 characters.');
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    router.replace('/(tabs)/profile');
  };
  if (!session) return <View className="flex-1 items-center justify-center bg-ui-background dark:bg-ui-dark-background"><FrogLoader branded size="large" /><Text className="mt-4 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Validando el enlace…' : 'Validating the link…'}</Text></View>;
  return <View className="flex-1 justify-center bg-ui-background px-6 dark:bg-ui-dark-background"><Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Nueva contraseña' : 'New password'}</Text><TextInput accessibilityLabel={language === 'es' ? 'Nueva contraseña' : 'New password'} autoCapitalize="none" className="mt-5 min-h-14 rounded-control border border-ui-border px-4 text-ui-text dark:border-ui-dark-border dark:text-ui-dark-text" onChangeText={setPassword} secureTextEntry value={password} />{error ? <Text accessibilityRole="alert" className="mt-3 text-red-600">{error}</Text> : null}<Pressable accessibilityRole="button" className="mt-5 min-h-14 items-center justify-center rounded-control bg-ui-primary" disabled={busy} onPress={() => void submit()}>{busy ? <FrogLoader color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Guardar contraseña' : 'Save password'}</Text>}</Pressable></View>;
}
