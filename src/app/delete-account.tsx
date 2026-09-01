import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { deleteMyAccount } from '@/lib/account';
import { useApp } from '@/providers/app-provider';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { language, session, requireAuth } = useApp();
  const [busy, setBusy] = useState(false);
  const text = (es: string, en: string) => language === 'es' ? es : en;
  const remove = () => Alert.alert(text('Eliminar cuenta definitivamente', 'Permanently delete account'), text('Se eliminarán tu cuenta, perfil, mensajes, publicaciones, fotos, reseñas y demás datos asociados. Esta acción no se puede deshacer.', 'Your account, profile, messages, posts, photos, reviews, and associated data will be deleted. This cannot be undone.'), [
    { text: text('Cancelar', 'Cancel') },
    { text: text('Eliminar definitivamente', 'Delete permanently'), style: 'destructive', onPress: () => void (async () => { setBusy(true); try { await deleteMyAccount(); router.replace('/'); } catch (error) { Alert.alert('Descubriendo CR', error instanceof Error ? error.message : text('No se pudo eliminar la cuenta.', 'The account could not be deleted.')); } finally { setBusy(false); } })() },
  ]);
  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}><View className="mx-auto w-full max-w-2xl"><Pressable accessibilityLabel={text('Volver', 'Back')} className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-ui-surface dark:bg-ui-dark-surface" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={23} color="#0B6B4F" /></Pressable><Text className="text-3xl font-black text-ui-text dark:text-ui-dark-text">{text('Eliminar cuenta y datos', 'Delete account and data')}</Text><Text className="mt-4 leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{text('Esta página es el mecanismo oficial de Descubriendo CR para solicitar la eliminación de una cuenta. Al confirmar, la eliminación se procesa de inmediato.', 'This is Descubriendo CR’s official account-deletion page. Once confirmed, deletion is processed immediately.')}</Text><View className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950"><Text className="font-black text-red-700 dark:text-red-300">{text('Se eliminarán:', 'We will delete:')}</Text><Text className="mt-2 leading-6 text-red-700 dark:text-red-300">{text('Perfil, credenciales, publicaciones, mensajes, fotos, reseñas, avistamientos, favoritos, seguimientos y aportes creados por la cuenta.', 'Profile, credentials, posts, messages, photos, reviews, sightings, favorites, follows, and submissions created by the account.')}</Text></View>{session ? <Pressable accessibilityRole="button" className="mt-6 items-center rounded-2xl bg-red-600 p-4 disabled:opacity-50" disabled={busy} onPress={remove}>{busy ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{text('Eliminar mi cuenta definitivamente', 'Permanently delete my account')}</Text>}</Pressable> : <Pressable accessibilityRole="button" className="mt-6 items-center rounded-2xl bg-ui-primary p-4" onPress={() => requireAuth(text('eliminar tu cuenta', 'delete your account'))}><Text className="font-black text-white">{text('Iniciar sesión para continuar', 'Sign in to continue')}</Text></Pressable>}</View></ScrollView>;
}
