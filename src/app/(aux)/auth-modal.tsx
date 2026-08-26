import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/providers/app-provider';

export default function AuthModal() {
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { authenticate, isDark, signInWithGoogle, t } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(intent ? t('authRequired') : '');

  async function submit() {
    if (!email.trim() || password.length < 6) {
      setMessage(t('validation'));
      return;
    }
    setLoading(true);
    const error = await authenticate(mode, email.trim(), password);
    setLoading(false);
    if (error) setMessage(error);
    else if (mode === 'signup') setMessage(t('emailSent'));
    else router.back();
  }

  async function google() {
    setLoading(true);
    const error = await signInWithGoogle();
    setLoading(false);
    if (error) setMessage(error);
    else router.back();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: isDark ? '#053326' : '#ffffff' }}>
        <View className="rounded-t-[36px] bg-white px-6 pb-4 pt-5 dark:bg-forest-900">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="max-w-[82%]">
            <Text className="text-2xl font-black tracking-tight text-forest-950 dark:text-white">{t('authTitle')}</Text>
            <Text className="mt-2 leading-5 text-forest-600 dark:text-mint-200">{t('authBody')}</Text>
          </View>
          <Pressable accessibilityLabel={t('close')} className="h-10 w-10 items-center justify-center rounded-full bg-mint-100 dark:bg-forest-700" onPress={() => router.back()}>
            <MaterialCommunityIcons name="close" size={22} color="#315f4e" />
          </Pressable>
        </View>
        <Pressable className="flex-row items-center justify-center rounded-2xl border border-mint-300 py-4 dark:border-forest-600" disabled={loading} onPress={google}>
          <MaterialCommunityIcons name="google" size={22} color="#e9574d" />
          <Text className="ml-3 font-black text-forest-900 dark:text-white">{t('continueGoogle')}</Text>
        </Pressable>
        <View className="my-4 flex-row items-center"><View className="h-px flex-1 bg-mint-200 dark:bg-forest-700" /><Text className="mx-3 text-xs font-bold text-forest-400">O</Text><View className="h-px flex-1 bg-mint-200 dark:bg-forest-700" /></View>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          className="rounded-2xl bg-mint-50 px-4 py-4 text-base text-forest-950 dark:bg-forest-800 dark:text-white"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder={t('email')}
          placeholderTextColor="#789187"
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          className="mt-3 rounded-2xl bg-mint-50 px-4 py-4 text-base text-forest-950 dark:bg-forest-800 dark:text-white"
          onChangeText={setPassword}
          placeholder={t('password')}
          placeholderTextColor="#789187"
          secureTextEntry
          value={password}
        />
        {message ? <Text className="mt-3 text-center text-sm font-semibold text-coral-600">{message}</Text> : null}
        <Pressable className="mt-4 items-center rounded-2xl bg-forest-800 py-4" disabled={loading} onPress={submit}>
          {loading ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{mode === 'signin' ? t('signIn') : t('signUp')}</Text>}
        </Pressable>
        <Pressable className="items-center py-4" onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>
          <Text className="font-bold text-caribbean-600">{mode === 'signin' ? t('registerInstead') : t('loginInstead')}</Text>
        </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
