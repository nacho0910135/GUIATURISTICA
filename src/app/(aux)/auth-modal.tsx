import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { useApp } from '@/providers/app-provider';

export default function AuthModal() {
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { language, signIn, signInWithGoogle, signUp } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(false); }
  };

  const submit = (create: boolean) => void run(async () => {
    if (!email.trim() || password.length < 8) throw new Error(language === 'es' ? 'Ingresá un correo válido y una contraseña de al menos 8 caracteres.' : 'Enter a valid email and a password of at least 8 characters.');
    if (create) {
      const signedIn = await signUp(email, password);
      if (!signedIn) return Alert.alert('Descubriendo CR', language === 'es' ? 'Revisá tu correo para confirmar la cuenta.' : 'Check your email to confirm your account.');
    } else await signIn(email, password);
    router.back();
  });

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
    <View className="rounded-t-[32px] bg-ui-surface p-6 pb-10 dark:bg-ui-dark-surface">
      <View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Tu aventura continúa aquí' : 'Your adventure continues here'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} onPress={() => router.back()}><MaterialCommunityIcons name="close" size={26} color="#8f9bb2" /></Pressable></View>
      <Text className="mb-5 mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{intent ? `${language === 'es' ? 'Iniciá sesión para' : 'Sign in to'} ${intent}.` : language === 'es' ? 'Guardá, comentá y compartí con tu propia identidad.' : 'Save, comment and share with your own identity.'}</Text>
      <TextInput autoCapitalize="none" autoComplete="email" className="mb-3 rounded-xl bg-ui-muted px-4 py-3 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" editable={!busy} keyboardType="email-address" onChangeText={setEmail} placeholder={language === 'es' ? 'Correo electrónico' : 'Email'} placeholderTextColor="#8f9bb2" value={email} />
      <TextInput autoComplete="password" className="mb-4 rounded-xl bg-ui-muted px-4 py-3 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" editable={!busy} onChangeText={setPassword} placeholder={language === 'es' ? 'Contraseña' : 'Password'} placeholderTextColor="#8f9bb2" secureTextEntry value={password} />
      {busy ? <ActivityIndicator className="mb-3" color="#13bd83" /> : null}
      <Pressable className="items-center rounded-xl bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary" disabled={busy} onPress={() => submit(false)}><Text className="font-black text-white">{language === 'es' ? 'Iniciar sesión' : 'Sign in'}</Text></Pressable>
      <Pressable className="mt-3 items-center rounded-xl border border-ui-primary px-4 py-3" disabled={busy} onPress={() => submit(true)}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Crear cuenta' : 'Create account'}</Text></Pressable>
      <Pressable className="mt-3 flex-row items-center justify-center rounded-xl border border-ui-border px-4 py-3 dark:border-ui-dark-border" disabled={busy} onPress={() => void run(async () => { await signInWithGoogle(); router.back(); })}><MaterialCommunityIcons name="google" size={20} color="#DB4437" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Continuar con Google' : 'Continue with Google'}</Text></Pressable>
    </View>
  </KeyboardAvoidingView>;
}
