import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { submitInformationReport } from '@/lib/reports';
import { getPublicTravelerProfile, sendTravelerMessage } from '@/lib/social-profile';
import { blockTraveler, toggleTravelerFollow } from '@/lib/travelers';
import { useApp } from '@/providers/app-provider';

type PublicProfile = Awaited<ReturnType<typeof getPublicTravelerProfile>>;
export default function TravelerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, session } = useApp();
  const [data, setData] = useState<PublicProfile>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const viewerId = session!.user.id;
  const load = useCallback(async () => { if (id) setData(await getPublicTravelerProfile(id, viewerId)); }, [id, viewerId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!data?.profile) return <View className="flex-1 items-center justify-center bg-ui-background dark:bg-ui-dark-background"><ActivityIndicator color="#13bd83" /></View>;
  const text = (es: string, en: string) => language === 'es' ? es : en;
  const name = data.profile.full_name || data.profile.username || text('Viajero', 'Traveler');
  const report = () => Alert.alert(text('Reportar usuario', 'Report user'), text('El reporte será enviado al equipo de moderación.', 'The report will be sent to the moderation team.'), [{ text: text('Cancelar', 'Cancel') }, { text: text('Reportar', 'Report'), onPress: () => void (async () => { await submitInformationReport({ targetType: 'traveler', targetId: id, targetLabel: name, reportType: 'abusive_content', details: 'Reporte desde el perfil del usuario.' }); Alert.alert(text('Reporte enviado', 'Report sent')); })() }]);
  const block = () => Alert.alert(text('Bloquear usuario', 'Block user'), text('No verás su contenido y no podrá enviarte mensajes.', 'You will not see their content and they cannot message you.'), [{ text: text('Cancelar', 'Cancel') }, { text: text('Bloquear', 'Block'), style: 'destructive', onPress: () => void (async () => { await blockTraveler(id); router.back(); })() }]);
  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
    <Pressable accessibilityLabel={text('Volver', 'Back')} className="mb-5 h-12 w-12 items-center justify-center rounded-full bg-ui-surface dark:bg-ui-dark-surface" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={25} color="#087443" /></Pressable>
    <View className="rounded-[30px] bg-ui-surface p-6 dark:bg-ui-dark-surface"><View className="flex-row items-center">{data.profile.avatar_url ? <Image source={{ uri: data.profile.avatar_url }} style={{ height: 90, width: 90, borderRadius: 45 }} /> : <View className="h-20 w-20 items-center justify-center rounded-full bg-ui-primary"><MaterialCommunityIcons name="account" size={42} color="white" /></View>}<View className="ml-4 flex-1"><Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">{name}</Text><Text className="mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{data.profile.bio || text('Explorando Costa Rica', 'Exploring Costa Rica')}</Text><Text className="mt-3 font-bold text-ui-text dark:text-ui-dark-text">{data.followers.length} {text('seguidores', 'followers')} · {data.following.length} {text('siguiendo', 'following')}</Text></View>{id !== viewerId ? <Pressable className="rounded-full bg-ui-primary px-5 py-3" onPress={async () => { await toggleTravelerFollow(viewerId, id, data.followed); await load(); }}><Text className="font-black text-white">{data.followed ? text('Siguiendo', 'Following') : text('Seguir', 'Follow')}</Text></Pressable> : null}</View></View>
    {id !== viewerId ? <View className="mt-4 flex-row gap-3"><Pressable className="flex-1 items-center rounded-2xl border border-red-300 p-3" onPress={report}><Text className="font-black text-red-600">{text('Reportar', 'Report')}</Text></Pressable><Pressable className="flex-1 items-center rounded-2xl border border-red-300 p-3" onPress={block}><Text className="font-black text-red-600">{text('Bloquear', 'Block')}</Text></Pressable></View> : null}
    {id !== viewerId ? <View className="mt-5 rounded-3xl bg-ui-surface p-5 dark:bg-ui-dark-surface"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{text('Mensaje privado', 'Private message')}</Text><TextInput className="mt-3 rounded-2xl bg-ui-background p-4 text-ui-text dark:bg-ui-dark-background dark:text-ui-dark-text" multiline placeholder={text('Escribí un mensaje…', 'Write a message…')} placeholderTextColor="#8894aa" value={message} onChangeText={setMessage} /><Pressable disabled={busy || !message.trim()} className="mt-3 self-end rounded-full bg-ui-primary px-5 py-3 disabled:opacity-40" onPress={async () => { setBusy(true); try { await sendTravelerMessage(viewerId, id, message); setMessage(''); Alert.alert(text('Mensaje enviado', 'Message sent')); } finally { setBusy(false); } }}><Text className="font-black text-white">{text('Enviar', 'Send')}</Text></Pressable></View> : null}
    <Text className="mb-2 mt-7 text-xl font-black text-ui-text dark:text-ui-dark-text">{text('Publicaciones', 'Posts')}</Text>{data.posts.map((post) => <View className="mb-4 overflow-hidden rounded-3xl bg-ui-surface dark:bg-ui-dark-surface" key={post.id}><View className="p-5"><Text className="text-ui-text dark:text-ui-dark-text">{post.body}</Text></View>{post.image_url ? <Image source={{ uri: post.image_url }} contentFit="cover" style={{ height: 260, width: '100%' }} /> : null}</View>)}
  </ScrollView>;
}
