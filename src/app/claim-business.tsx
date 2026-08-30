import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getClaimableBusiness, requestCommercialServiceClaim } from '@/lib/commerce';
import { useApp } from '@/providers/app-provider';

export default function ClaimBusinessScreen() {
  const { language, requireAuth } = useApp();
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const business = useQuery({ queryKey: ['claimable-business', serviceId], queryFn: () => getClaimableBusiness(serviceId!), enabled: Boolean(serviceId) });
  const isSpanish = language === 'es';

  const submit = async () => {
    if (!serviceId || !requireAuth(isSpanish ? 'reclamar un perfil comercial' : 'claim a business profile')) return;
    setError('');
    try {
      await requestCommercialServiceClaim(serviceId, message);
      setSubmitted(true);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : (isSpanish ? 'No pudimos enviar el reclamo.' : 'The claim could not be sent.')); }
  };

  const unavailable = !serviceId || business.data?.is_claimed || Boolean(business.data?.owner_id);
  return <ScrollView className="flex-1 bg-ui-background px-5 pt-12 dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 44 }}><Pressable accessibilityRole="button" className="mb-6 flex-row items-center self-start" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={22} color="#087443" /><Text className="ml-2 font-black text-ui-primary">{isSpanish ? 'Volver' : 'Back'}</Text></Pressable><View className="rounded-card border border-ui-border bg-ui-surface p-6 dark:border-ui-dark-border dark:bg-ui-dark-surface"><View className="h-14 w-14 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="store-check-outline" size={30} color="#087443" /></View><Text className="mt-5 text-2xl font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Reclamar negocio' : 'Claim business'}</Text>{business.isLoading ? <ActivityIndicator className="py-10" color="#087443" /> : unavailable ? <Text className="mt-4 leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Este perfil no está disponible para reclamo.' : 'This profile is not available to claim.'}</Text> : submitted ? <View className="mt-5 rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'Solicitud enviada' : 'Claim sent'}</Text><Text className="mt-1 leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Quedó pendiente de revisión. Al aprobarse, el perfil pasará a tu panel de propietario.' : 'It is pending review. Once approved, the profile will appear in your owner dashboard.'}</Text></View> : business.data ? <><Text className="mt-2 text-lg font-black text-ui-text dark:text-ui-dark-text">{business.data.title}</Text><Text className="mt-2 leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Contanos cómo podemos verificar que sos la persona responsable. La solicitud queda pendiente hasta revisión administrativa.' : 'Tell us how we can verify that you are responsible for this business. The claim stays pending until an administrator reviews it.'}</Text><TextInput accessibilityLabel={isSpanish ? 'Información para verificar propiedad' : 'Ownership verification information'} className="mt-5 min-h-28 rounded-2xl border border-ui-border px-4 py-3 text-ui-text dark:border-ui-dark-border dark:text-ui-dark-text" maxLength={1000} multiline onChangeText={setMessage} placeholder={isSpanish ? 'Ej.: soy representante legal; adjuntaré la evidencia solicitada.' : 'Example: I am the legal representative and can provide the requested evidence.'} textAlignVertical="top" value={message} />{error ? <Text className="mt-3 text-sm font-semibold text-red-600">{error}</Text> : null}<Pressable accessibilityRole="button" className="mt-5 items-center rounded-2xl bg-ui-primary py-4" onPress={() => void submit()}><Text className="font-black text-white">{isSpanish ? 'Enviar solicitud' : 'Send claim'}</Text></Pressable></> : <Text className="mt-4 text-red-600">{isSpanish ? 'No pudimos cargar este perfil.' : 'This profile could not be loaded.'}</Text>}</View></ScrollView>;
}
