import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff, LockKeyhole, Mail, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { useApp } from '@/providers/app-provider';

export default function AuthModal() {
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { language, signIn, signInWithGoogle, signUp } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : language === 'es' ? 'No pudimos completar la acción.' : 'We could not complete the action.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (create: boolean) => void run(async () => {
    if (!email.trim() || password.length < 8) throw new Error(language === 'es' ? 'Ingresá un correo válido y una contraseña de al menos 8 caracteres.' : 'Enter a valid email and a password of at least 8 characters.');
    if (create) {
      const signedIn = await signUp(email, password);
      if (!signedIn) {
        setNotice(language === 'es' ? 'Revisá tu correo para confirmar la cuenta.' : 'Check your email to confirm your account.');
        return;
      }
    } else await signIn(email, password);
    router.back();
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/45">
      <BlurView className="absolute inset-0" intensity={24} tint="dark" />
      <View className="rounded-t-[32px] border-t border-white/50 bg-ui-surface px-6 pb-10 pt-3 shadow-2xl dark:border-white/10 dark:bg-ui-dark-surface">
        <View className="mb-5 h-1 w-11 self-center rounded-full bg-ui-border dark:bg-ui-dark-border" />
        <View className="flex-row items-start justify-between">
          <View className="mr-5 flex-1">
            <Text className="font-sans text-2xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Tu aventura continúa' : 'Your adventure continues'}</Text>
            <Text className="mt-2 font-sans leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{intent ? `${language === 'es' ? 'Iniciá sesión para' : 'Sign in to'} ${intent}.` : language === 'es' ? 'Guardá lugares, compartí hallazgos y construí tu próxima ruta.' : 'Save places, share discoveries and build your next route.'}</Text>
          </View>
          <Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ui-muted active:scale-95 dark:bg-ui-dark-muted" onPress={() => router.back()}><X color="#68737A" size={21} /></Pressable>
        </View>
        <View className="mt-6 flex-row items-center rounded-control border border-ui-border bg-ui-muted px-4 dark:border-ui-dark-border dark:bg-ui-dark-muted">
          <Mail color="#68737A" size={19} strokeWidth={1.8} />
          <TextInput accessibilityLabel={language === 'es' ? 'Correo electrónico' : 'Email'} autoCapitalize="none" autoComplete="email" className="ml-3 min-h-14 flex-1 font-sans text-ui-text dark:text-ui-dark-text" editable={!busy} keyboardType="email-address" onChangeText={setEmail} placeholder={language === 'es' ? 'Correo electrónico' : 'Email'} placeholderTextColor="#68737A" value={email} />
        </View>
        <View className="mt-3 flex-row items-center rounded-control border border-ui-border bg-ui-muted px-4 dark:border-ui-dark-border dark:bg-ui-dark-muted">
          <LockKeyhole color="#68737A" size={19} strokeWidth={1.8} />
          <TextInput accessibilityLabel={language === 'es' ? 'Contraseña' : 'Password'} autoComplete="password" className="ml-3 min-h-14 flex-1 font-sans text-ui-text dark:text-ui-dark-text" editable={!busy} onChangeText={setPassword} placeholder={language === 'es' ? 'Contraseña' : 'Password'} placeholderTextColor="#68737A" secureTextEntry={!passwordVisible} value={password} />
          <Pressable accessibilityLabel={passwordVisible ? (language === 'es' ? 'Ocultar contraseña' : 'Hide password') : language === 'es' ? 'Mostrar contraseña' : 'Show password'} accessibilityRole="button" accessibilityState={{ expanded: passwordVisible }} className="h-11 w-11 items-center justify-center" onPress={() => setPasswordVisible((value) => !value)}>{passwordVisible ? <EyeOff color="#68737A" size={20} /> : <Eye color="#68737A" size={20} />}</Pressable>
        </View>
        {error ? <View accessibilityRole="alert" className="mt-3 rounded-control bg-red-50 px-4 py-3 dark:bg-red-950/30"><Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">{error}</Text></View> : null}
        {notice ? <View className="mt-3 rounded-control bg-ui-primary-soft px-4 py-3 dark:bg-ui-dark-primary-soft"><Text className="font-sans text-sm font-semibold text-ui-primary dark:text-ui-dark-primary">{notice}</Text></View> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} className="mt-5 min-h-14 items-center justify-center rounded-control bg-ui-primary px-4 active:bg-ui-primary-pressed disabled:opacity-60 dark:bg-ui-dark-primary" disabled={busy} onPress={() => submit(false)}>{busy ? <ActivityIndicator color="white" /> : <Text className="font-sans font-bold text-white">{language === 'es' ? 'Iniciar sesión' : 'Sign in'}</Text>}</Pressable>
        <Pressable accessibilityRole="button" className="mt-3 min-h-14 items-center justify-center rounded-control border border-ui-primary px-4 active:bg-ui-primary-soft disabled:opacity-60" disabled={busy} onPress={() => submit(true)}><Text className="font-sans font-bold text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Crear cuenta' : 'Create account'}</Text></Pressable>
        <View className="my-5 flex-row items-center"><View className="h-px flex-1 bg-ui-border dark:bg-ui-dark-border" /><Text className="mx-3 font-sans text-xs font-semibold uppercase tracking-widest text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'o' : 'or'}</Text><View className="h-px flex-1 bg-ui-border dark:bg-ui-dark-border" /></View>
        <Pressable accessibilityRole="button" className="min-h-14 flex-row items-center justify-center rounded-control border border-ui-border bg-ui-surface px-4 active:bg-ui-muted disabled:opacity-60 dark:border-ui-dark-border dark:bg-ui-dark-surface dark:active:bg-ui-dark-muted" disabled={busy} onPress={() => void run(async () => { await signInWithGoogle(); router.back(); })}><MaterialCommunityIcons name="google" size={20} color="#DB4437" /><Text className="ml-3 font-sans font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Continuar con Google' : 'Continue with Google'}</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
