import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioRecorderButton } from '@/components/audio-recorder-button';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { ChatAvatar, TravelerMessage } from '@/components/traveler-message';
import { useScreenActive } from '@/hooks/use-screen-active';
import { useTravelerMessagesSync } from '@/hooks/use-traveler-messages-sync';
import { getPrivateConversations, getPrivateMessages, markMessageRead, sendTravelerMessage, toggleTravelerMessageReaction } from '@/lib/social-profile';
import { useApp } from '@/providers/app-provider';

export default function PrivateMessagesScreen() {
  const router = useRouter();
  const isActive = useScreenActive();
  const { partnerId, partnerName, partnerAvatarUrl } = useLocalSearchParams<{ partnerId?: string; partnerName?: string; partnerAvatarUrl?: string }>();
  const { avatarUrl, language, session } = useApp();
  const userId = session?.user.id ?? '';
  const text = (es: string, en: string) => language === 'es' ? es : en;
  const [activePartnerId, setActivePartnerId] = useState(partnerId);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const messageListRef = useRef<ScrollView>(null);
  const conversations = useQuery({
    queryKey: ['private-conversations', userId],
    queryFn: () => getPrivateConversations(userId),
    enabled: Boolean(userId) && isActive,
    placeholderData: undefined,
    staleTime: 30000,
  });
  const messageHistory = useInfiniteQuery({
    queryKey: ['private-message-history', userId, activePartnerId],
    queryFn: ({ pageParam }) => getPrivateMessages(activePartnerId!, pageParam),
    initialPageParam: undefined as { createdAt: string; id: string } | undefined,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(userId && activePartnerId) && isActive,
    staleTime: 30000,
  });
  const refetchConversations = conversations.refetch;
  const activeSummary = conversations.data?.find((conversation) => conversation.partner_id === activePartnerId);
  const activeMessages = messageHistory.data ? [...messageHistory.data.pages].reverse().flatMap((page) => page.messages) : [];
  const active = activeSummary ? { ...activeSummary, messages: activeMessages } : (activePartnerId && partnerName ? { partner_id: activePartnerId, partner_name: partnerName, partner_avatar_url: partnerAvatarUrl || null, messages: activeMessages, unread_count: 0 } : undefined);
  const unreadMessageIds = active?.messages.filter((item) => item.recipient_id === userId && !item.read_status).map((item) => item.id).join(',') ?? '';

  useTravelerMessagesSync(userId || undefined, () => { void conversations.refetch({ cancelRefetch: false }); });
  useEffect(() => { if (partnerId) setActivePartnerId(partnerId); }, [partnerId]);
  useEffect(() => {
    if (!unreadMessageIds) return;
    void Promise.all(unreadMessageIds.split(',').map(markMessageRead)).then(() => refetchConversations()).catch(() => undefined);
  }, [refetchConversations, unreadMessageIds]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch (reason) { Alert.alert(text('Mensajes', 'Messages'), reason instanceof Error ? reason.message : text('No se pudo completar la acción.', 'The action could not be completed.')); }
    finally { setBusy(false); }
  };
  const send = (attachment?: { uri: string; type: 'image' | 'audio'; durationMs?: number; width?: number }) =>
    void run(async () => {
      if (!active || (!reply.trim() && !attachment)) return;
      await sendTravelerMessage(userId, active.partner_id, reply, attachment);
      setReply('');
      await Promise.all([conversations.refetch(), messageHistory.refetch()]);
    });
  const chooseImage = () => void run(async () => {
    if (!active) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error(text('Permití el acceso a fotos para enviar una imagen.', 'Allow photo access to send an image.'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9, exif: false });
    if (result.canceled) return;
    await sendTravelerMessage(userId, active.partner_id, reply, { uri: result.assets[0].uri, width: result.assets[0].width, type: 'image' });
    setReply('');
    await Promise.all([conversations.refetch(), messageHistory.refetch()]);
  });

  return <SafeAreaView className="flex-1 bg-ui-background dark:bg-ui-dark-background">
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <View className="min-h-16 flex-row items-center border-b border-ui-border bg-ui-surface px-3 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <Pressable accessibilityLabel={partnerId ? text('Cerrar chat', 'Close chat') : active ? text('Volver a conversaciones', 'Back to conversations') : text('Cerrar mensajes', 'Close messages')} className="h-11 w-11 items-center justify-center rounded-full" onPress={() => partnerId ? router.back() : active ? setActivePartnerId(undefined) : router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={25} color="#0B6B4F" />
        </Pressable>
        {active ? <><ChatAvatar url={active.partner_avatar_url} name={active.partner_name} /><Text className="ml-3 flex-1 text-lg font-black text-ui-text dark:text-ui-dark-text" numberOfLines={1}>{active.partner_name}</Text></> : <><View className="h-10 w-10 items-center justify-center rounded-full bg-ui-primary"><MaterialCommunityIcons name="message-text-outline" size={22} color="white" /></View><Text className="ml-3 text-xl font-black text-ui-text dark:text-ui-dark-text">{text('Mensajes privados', 'Private messages')}</Text></>}
      </View>
      {active ? <>
        <ScrollView ref={messageListRef} className="flex-1 px-3 pt-3" contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled" onContentSizeChange={() => messageListRef.current?.scrollToEnd({ animated: false })}>
          {messageHistory.hasNextPage ? <Pressable accessibilityRole="button" className="mb-3 self-center rounded-full bg-ui-primary-soft px-4 py-2 dark:bg-ui-dark-primary-soft" disabled={messageHistory.isFetchingNextPage} onPress={() => void messageHistory.fetchNextPage()}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{messageHistory.isFetchingNextPage ? text('Cargando…', 'Loading…') : text('Cargar mensajes anteriores', 'Load previous messages')}</Text></Pressable> : null}
          {active.messages.map((item) => <TravelerMessage key={item.id} message={item} mine={item.sender_id === userId} language={language} avatarUrl={item.sender_id === userId ? avatarUrl : active.partner_avatar_url} senderName={item.sender_id === userId ? text('Vos', 'You') : active.partner_name} onReact={(emoji) => void run(async () => { await toggleTravelerMessageReaction(item.id, emoji); await messageHistory.refetch(); })} />)}
        </ScrollView>
        <View className="border-t border-ui-border bg-ui-surface px-3 pb-2 pt-2 dark:border-ui-dark-border dark:bg-ui-dark-surface">
          <View className="flex-row items-end gap-2">
            <Pressable accessibilityLabel={text('Enviar imagen', 'Send image')} className="min-h-12 min-w-12 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft" disabled={busy} onPress={chooseImage}><MaterialCommunityIcons name="image-plus" size={22} color="#0B6B4F" /></Pressable>
            <TextInput className="max-h-28 min-h-12 flex-1 rounded-2xl bg-ui-muted px-4 py-3 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" editable={!busy} multiline onChangeText={setReply} placeholder={text('Escribí un mensaje…', 'Write a message…')} placeholderTextColor="#8f9bb2" value={reply} />
            <AudioRecorderButton busy={busy} language={language} onRecorded={send} />
            {reply.trim() ? <Pressable accessibilityLabel={text('Enviar mensaje', 'Send message')} className="min-h-12 min-w-12 items-center justify-center rounded-full bg-ui-primary" disabled={busy} onPress={() => send()}><MaterialCommunityIcons name="send" size={21} color="white" /></Pressable> : null}
          </View>
        </View>
      </> : <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {conversations.data?.map((conversation) => {
          const last = conversation.messages.at(-1);
          const preview = last?.media_type === 'image' ? '📷 Foto' : last?.media_type === 'audio' ? '🎙️ Audio' : last?.body;
          return <Pressable accessibilityRole="button" className="mb-3 min-h-18 flex-row items-center rounded-2xl border border-ui-border bg-ui-surface p-3 dark:border-ui-dark-border dark:bg-ui-dark-surface" key={conversation.partner_id} onPress={() => setActivePartnerId(conversation.partner_id)}>
            <ChatAvatar url={conversation.partner_avatar_url} name={conversation.partner_name} />
            <View className="ml-3 min-w-0 flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{conversation.partner_name}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{preview}</Text></View>
            {conversation.unread_count ? <View accessibilityLabel={`${conversation.unread_count} ${text('mensajes no leídos', 'unread messages')}`} className="ml-2 min-w-7 items-center rounded-full bg-ui-primary px-2 py-1"><Text className="text-xs font-black text-white">{conversation.unread_count}</Text></View> : null}
            <MaterialCommunityIcons name="chevron-right" size={21} color="#8f9bb2" />
          </Pressable>;
        })}
        {!conversations.isPending && !conversations.data?.length ? <View className="items-center py-20"><MaterialCommunityIcons name="message-outline" size={44} color="#8f9bb2" /><Text className="mt-3 text-ui-text-muted dark:text-ui-dark-text-muted">{text('Todavía no tenés conversaciones.', 'You have no conversations yet.')}</Text></View> : null}
      </ScrollView>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
