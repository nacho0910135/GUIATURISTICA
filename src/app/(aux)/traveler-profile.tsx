import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { TravelerMessage } from '@/components/traveler-message';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTravelerMessagesSync } from '@/hooks/use-traveler-messages-sync';
import { getPrivateConversations, getPublicTravelerProfile, markMessageRead, sendTravelerMessage, type PrivateConversation } from '@/lib/social-profile';
import { blockTraveler, toggleTravelerFollow, unblockTraveler } from '@/lib/travelers';
import { useApp } from '@/providers/app-provider';

type PublicProfile = Awaited<ReturnType<typeof getPublicTravelerProfile>>;
export default function TravelerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { avatarUrl, language, requireAuth, session } = useApp();
  const [data, setData] = useState<PublicProfile>();
  const [conversation, setConversation] = useState<PrivateConversation>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const messageListRef = useRef<ScrollView>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const viewerId = session?.user.id;
  const load = useCallback(async () => {
    if (!id) return;
    const [profile, conversations] = await Promise.all([
      getPublicTravelerProfile(id, viewerId),
      viewerId ? getPrivateConversations(viewerId) : Promise.resolve([]),
    ]);
    setData(profile);
    const nextConversation = conversations.find((item) => item.partner_id === id);
    if (viewerId && nextConversation) {
      const unread = nextConversation.messages.filter((item) => item.recipient_id === viewerId && !item.read_status);
      if (unread.length) {
        await Promise.all(unread.map((item) => markMessageRead(item.id)));
        nextConversation.messages = nextConversation.messages.map((item) => unread.some(({ id: unreadId }) => unreadId === item.id) ? { ...item, read_status: true } : item);
        nextConversation.unread_count = 0;
      }
    }
    setConversation(nextConversation);
  }, [id, viewerId]);
  useTravelerMessagesSync(viewerId, () => { void load(); });
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!data?.profile) return <View className="flex-1 items-center justify-center bg-ui-background dark:bg-ui-dark-background"><ActivityIndicator color="#13bd83" /></View>;
  const text = (es: string, en: string) => language === 'es' ? es : en;
  const name = data.profile.username || data.profile.full_name || text('Viajero', 'Traveler');
  const block = () => {
    if (!requireAuth(text('bloquear a este usuario', 'block this user'))) return;
    if (data.blocked) {
      void (async () => {
        setBlockBusy(true);
        try { await unblockTraveler(id); await load(); }
        catch (reason) { Alert.alert(text('Desbloquear usuario', 'Unblock user'), reason instanceof Error ? reason.message : text('No se pudo desbloquear.', 'Could not unblock this user.')); }
        finally { setBlockBusy(false); }
      })();
      return;
    }
    Alert.alert(text('Bloquear usuario', 'Block user'), text('No verás su contenido y no podrá enviarte mensajes.', 'You will not see their content and they cannot message you.'), [{ text: text('Cancelar', 'Cancel') }, { text: text('Bloquear', 'Block'), style: 'destructive', onPress: () => void (async () => {
      setBlockBusy(true);
      try { await blockTraveler(id); await load(); }
      catch (reason) { Alert.alert(text('Bloquear usuario', 'Block user'), reason instanceof Error ? reason.message : text('No se pudo bloquear.', 'Could not block this user.')); }
      finally { setBlockBusy(false); }
    })() }]);
  };
  const follow = async () => {
    if (!viewerId) {
      requireAuth(text('seguir a este usuario', 'follow this user'));
      return;
    }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      await toggleTravelerFollow(viewerId, id, data.followed);
      await load();
    } catch (reason) {
      await load().catch(() => undefined);
      Alert.alert(text('Perfil del viajero', 'Traveler profile'), reason instanceof Error ? reason.message : text('No se pudo actualizar el seguimiento.', 'Following could not be updated.'));
    } finally {
      setFollowBusy(false);
    }
  };
  const send = async (attachment?: { uri: string; type: 'image' | 'audio'; durationMs?: number; width?: number }) => {
    if (!viewerId || (!message.trim() && !attachment) || busy) return;
    setBusy(true);
    try {
      await sendTravelerMessage(viewerId, id, message, attachment);
      setMessage('');
      await load();
    } catch (reason) {
      Alert.alert(text('Mensajes', 'Messages'), reason instanceof Error ? reason.message : text('No se pudo enviar el mensaje.', 'The message could not be sent.'));
    } finally {
      setBusy(false);
    }
  };
  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', text('Permití el acceso a fotos para enviar una imagen.', 'Allow photo access to send an image.'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9, exif: false });
    if (!result.canceled) await send({ uri: result.assets[0].uri, width: result.assets[0].width, type: 'image' });
  };
  const record = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
      if (recorder.uri) await send({ uri: recorder.uri, type: 'audio', durationMs: recorderState.durationMillis });
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', text('Permití el micrófono para grabar un audio.', 'Allow microphone access to record audio.'));
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };
  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
    <Card className="items-center" padding="lg">
      <View className="mb-2 w-full flex-row items-center justify-between"><Pressable accessibilityLabel={text('Volver', 'Back')} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color="#087443" /></Pressable>{id !== viewerId ? <Pressable accessibilityLabel={data.blocked ? text('Desbloquear usuario', 'Unblock user') : text('Bloquear usuario', 'Block user')} accessibilityRole="button" accessibilityState={{ busy: blockBusy, disabled: blockBusy }} className={data.blocked ? 'min-h-10 flex-row items-center rounded-full bg-ui-primary-soft px-3 dark:bg-ui-dark-primary-soft' : 'min-h-10 flex-row items-center rounded-full border border-ui-danger px-3 dark:border-ui-dark-danger'} disabled={blockBusy} onPress={block}>{blockBusy ? <ActivityIndicator color="#C33B3B" size="small" /> : <MaterialCommunityIcons name={data.blocked ? 'account-lock-open-outline' : 'account-cancel-outline'} size={17} color={data.blocked ? '#0B6B4F' : '#C33B3B'} />}<Text className={data.blocked ? 'ml-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary' : 'ml-1 text-xs font-bold text-ui-danger dark:text-ui-dark-danger'}>{data.blocked ? text('Desbloquear', 'Unblock') : text('Bloquear', 'Block')}</Text></Pressable> : <View className="h-11" />}</View>
      {data.profile.avatar_url ? <Image source={{ uri: data.profile.avatar_url }} style={{ borderRadius: 52, height: 104, width: 104 }} /> : <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary"><MaterialCommunityIcons name="account" size={50} color="white" /></View>}
      <View className="mt-5 w-full">
        <Text className="text-2xl font-black leading-8 text-ui-text dark:text-ui-dark-text">{name}</Text>
        <Text className="mt-2 text-base leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{data.profile.bio || text('Explorando Costa Rica', 'Exploring Costa Rica')}</Text>
        <View className="mt-4 flex-row items-center">
          <Text className="font-bold text-ui-text dark:text-ui-dark-text">{data.followers.length} {text('seguidores', 'followers')}</Text>
          <Text className="mx-2 text-ui-text-muted dark:text-ui-dark-text-muted">·</Text>
          <Text className="font-bold text-ui-text dark:text-ui-dark-text">{data.following.length} {text('siguiendo', 'following')}</Text>
        </View>
        {id !== viewerId ? <Pressable accessibilityRole="button" accessibilityState={{ busy: followBusy, disabled: followBusy }} className="mt-5 min-h-12 flex-row items-center justify-center self-start rounded-control bg-ui-primary px-5 disabled:opacity-45 dark:bg-ui-dark-primary" disabled={followBusy} onPress={() => void follow()}>{followBusy ? <ActivityIndicator color="white" size="small" /> : null}<Text className="font-semibold text-white dark:text-ui-dark-background">{data.followed ? text('Dejar de seguir', 'Unfollow') : text('Seguir', 'Follow')}</Text></Pressable> : null}
      </View>
    </Card>
    {id !== viewerId ? <Card className="mt-5" padding="md"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{text('Mensajes privados', 'Private messages')}</Text>{viewerId ? <>{conversation?.messages.length ? <ScrollView ref={messageListRef} className="mt-4 max-h-96 rounded-2xl bg-ui-muted p-3 dark:bg-ui-dark-muted" nestedScrollEnabled onContentSizeChange={() => messageListRef.current?.scrollToEnd({ animated: true })}>{conversation.messages.slice(-30).map((item) => <TravelerMessage avatarUrl={item.sender_id === viewerId ? avatarUrl : data.profile?.avatar_url ?? null} key={item.id} language={language} message={item} mine={item.sender_id === viewerId} senderName={item.sender_id === viewerId ? text('Vos', 'You') : name} />)}</ScrollView> : <Text className="mt-3 text-ui-text-muted dark:text-ui-dark-text-muted">{text('Todavía no se han enviado mensajes.', 'No messages have been sent yet.')}</Text>}<View className="mt-4 flex-row items-end gap-2"><Pressable accessibilityLabel={text('Enviar imagen', 'Send image')} className="min-h-12 min-w-12 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft" disabled={busy || recorderState.isRecording} onPress={() => void chooseImage()}><MaterialCommunityIcons name="image-plus" size={22} color="#0B6B4F" /></Pressable><TextInput className="min-h-12 flex-1 rounded-2xl bg-ui-background p-4 text-ui-text dark:bg-ui-dark-background dark:text-ui-dark-text" editable={!busy && !recorderState.isRecording} multiline placeholder={recorderState.isRecording ? text('Grabando audio…', 'Recording audio…') : text('Escribí un mensaje… 😀', 'Write a message… 😀')} placeholderTextColor="#8894aa" value={message} onChangeText={setMessage} /><Pressable accessibilityLabel={recorderState.isRecording ? text('Enviar audio', 'Send audio') : text('Grabar audio', 'Record audio')} className={recorderState.isRecording ? 'min-h-12 min-w-12 items-center justify-center rounded-full bg-red-500' : 'min-h-12 min-w-12 items-center justify-center rounded-full bg-ui-primary'} disabled={busy} onPress={() => void record()}><MaterialCommunityIcons name={recorderState.isRecording ? 'stop' : 'microphone'} size={22} color="white" /></Pressable>{message.trim() ? <Pressable accessibilityLabel={text('Enviar mensaje', 'Send message')} className="min-h-12 min-w-12 items-center justify-center rounded-full bg-ui-primary" disabled={busy} onPress={() => void send()}><MaterialCommunityIcons name="send" size={21} color="white" /></Pressable> : null}</View><View className="mt-2 flex-row gap-3">{['😀', '❤️', '👍', '😂'].map((emoji) => <Pressable accessibilityLabel={`${text('Añadir emoji', 'Add emoji')} ${emoji}`} className="min-h-11 min-w-11 items-center justify-center" key={emoji} onPress={() => setMessage((value) => `${value}${emoji}`)}><Text className="text-xl">{emoji}</Text></Pressable>)}</View></> : <Button className="mt-3" label={text('Enviar mensaje directo', 'Send direct message')} onPress={() => requireAuth(text('enviar un mensaje directo', 'send a direct message'))} />}</Card> : null}
    <Text className="mb-2 mt-7 text-xl font-black text-ui-text dark:text-ui-dark-text">{text('Publicaciones', 'Posts')}</Text>{data.posts.map((post) => <View className="mb-4 overflow-hidden rounded-3xl bg-ui-surface dark:bg-ui-dark-surface" key={post.id}><View className="p-5"><Text className="text-ui-text dark:text-ui-dark-text">{post.body}</Text></View>{post.image_url ? <Image source={{ uri: post.image_url }} contentFit="cover" style={{ height: 260, width: '100%' }} /> : null}</View>)}
  </ScrollView>;
}
