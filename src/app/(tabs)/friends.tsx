import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { addTravelerReply, createTravelerPost, getTravelerWall, setTravelerReaction, toggleTravelerFollow, type ReactionType, type TravelerPost } from '@/lib/travelers';
import { useApp } from '@/providers/app-provider';

type Wall = Awaited<ReturnType<typeof getTravelerWall>>;

const displayName = (post: TravelerPost) => post.user?.full_name || post.user?.username || `Viajero ${post.user_id.slice(0, 5)}`;
const reactions: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Me gusta' }, { type: 'love', emoji: '❤️', label: 'Me encanta' },
  { type: 'laugh', emoji: '😂', label: 'Me divierte' }, { type: 'wow', emoji: '😮', label: 'Me asombra' },
  { type: 'angry', emoji: '😡', label: 'Me enoja' }, { type: 'sad', emoji: '🤢', label: 'Me disgusta' },
];

export default function FriendsScreen() {
  const router = useRouter();
  const { avatarUrl, language, requireAuth, session } = useApp();
  const userId = session?.user.id;
  const [wall, setWall] = useState<Wall>();
  const [body, setBody] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>();
  const [replying, setReplying] = useState<string>();
  const [reply, setReply] = useState('');
  const [parentReplyId, setParentReplyId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [publishError, setPublishError] = useState<string>();
  const [reactionPickerPostId, setReactionPickerPostId] = useState<string>();
  const longPressedPostId = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    try { setError(undefined); setWall(await getTravelerWall(userId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar Comunidad Viajera.'); }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const choosePhoto = async () => {
    if (!requireAuth(language === 'es' ? 'Compartir una foto' : 'Share a photo')) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Comunidad Viajera', language === 'es' ? 'Necesitamos permiso para elegir una foto.' : 'Photo permission is required.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.9 });
    if (!result.canceled) setAsset(result.assets[0]);
  };

  const chooseLocation = async () => {
    if (location) return setLocation(undefined);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setPublishError(language === 'es' ? 'Necesitamos permiso para compartir tu ubicación.' : 'Location permission is required.');
      return;
    }
    try {
      setBusy(true);
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      setPublishError(undefined);
    } catch (reason) {
      setPublishError(reason instanceof Error ? reason.message : 'No se pudo obtener la ubicación.');
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!requireAuth(language === 'es' ? 'Crear una publicación' : 'Create a post') || !session || (!body.trim() && !asset && !location)) return;
    setBusy(true);
    setPublishError(undefined);
    try { await createTravelerPost(session.user.id, body, asset, location); setBody(''); setAsset(undefined); setLocation(undefined); await load(); }
    catch (reason) { setPublishError(reason instanceof Error ? reason.message : 'No se pudo publicar.'); }
    finally { setBusy(false); }
  };

  const respond = async (postId: string) => {
    if (!requireAuth(language === 'es' ? 'Responder una publicación' : 'Reply to a post') || !session || !reply.trim()) return;
    setBusy(true);
    try { await addTravelerReply(postId, session.user.id, reply, parentReplyId); setReply(''); setParentReplyId(undefined); await load(); }
    catch (reason) { Alert.alert('Comunidad Viajera', reason instanceof Error ? reason.message : 'No se pudo responder.'); }
    finally { setBusy(false); }
  };

  const react = async (postId: string, reaction: ReactionType) => {
    if (!requireAuth(language === 'es' ? 'Dar me gusta' : 'Like a post') || !session || !wall) return;
    try {
      await setTravelerReaction(postId, session.user.id, reaction, wall.myReactions[postId]);
      await load();
    } catch (reason) {
      Alert.alert('Comunidad Viajera', reason instanceof Error ? reason.message : 'No se pudo actualizar el me gusta.');
    }
  };

  const like = (postId: string) => {
    if (longPressedPostId.current === postId) {
      longPressedPostId.current = undefined;
      return;
    }
    setReactionPickerPostId(undefined);
    void react(postId, 'like');
  };

  const follow = async (userId: string) => {
    if (!requireAuth(language === 'es' ? 'Seguir a un viajero' : 'Follow a traveler') || !session || !wall) return;
    try {
      await toggleTravelerFollow(session.user.id, userId, wall.followedUserIds.has(userId));
      await load();
    } catch (reason) {
      Alert.alert('Comunidad Viajera', reason instanceof Error ? reason.message : 'No se pudo actualizar el seguimiento.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ alignItems: 'center', paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <View className="w-full border-b border-ui-border bg-ui-surface px-5 py-4 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <View className="mx-auto w-full max-w-3xl flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-caribbean-50 dark:bg-caribbean-900"><Text accessibilityLabel={language === 'es' ? 'Dos amigos' : 'Two friends'} className="text-2xl">🧑‍🤝‍🧑</Text></View>
          <View className="ml-3 flex-1"><Text className="text-2xl font-extrabold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Comunidad Viajera' : 'Traveler Community'}</Text><Text className="text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Experiencias, fotos y conversaciones de viaje.' : 'Travel experiences, photos and conversations.'}</Text></View>
        </View>
      </View>

      <View className="w-full max-w-3xl px-4 pt-5">
        <View className="rounded-card border border-ui-border bg-ui-surface p-4 shadow-sm dark:border-ui-dark-border dark:bg-ui-dark-surface">
          <View className="flex-row items-center">
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ borderRadius: 25, height: 50, width: 50 }} /> : <View className="h-12 w-12 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="account" size={27} color="#0B6B4F" /></View>}
            <TextInput
              className="ml-3 flex-1 rounded-control bg-ui-muted px-5 py-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text"
              maxLength={2000}
              multiline
              onChangeText={setBody}
              onFocus={() => { if (!session) requireAuth(language === 'es' ? 'Crear una publicación' : 'Create a post'); }}
              placeholder={language === 'es' ? `¿Qué estás pensando${session?.user.user_metadata.full_name ? `, ${session.user.user_metadata.full_name.split(' ')[0]}` : ''}?` : "What's on your mind?"}
              placeholderTextColor="#73807b"
              value={body}
            />
          </View>
          {asset ? <View className="mt-3 overflow-hidden rounded-2xl"><Image source={{ uri: asset.uri }} contentFit="cover" style={{ height: 220, width: '100%' }} /><Pressable className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/60" onPress={() => setAsset(undefined)}><MaterialCommunityIcons name="close" size={20} color="white" /></Pressable></View> : null}
          {location ? <View className="mt-3 flex-row items-center rounded-control bg-ui-primary-soft p-3 dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="map-marker" size={24} color="#0B6B4F" /><Text className="ml-2 flex-1 font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ubicación lista para compartir' : 'Location ready to share'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Quitar ubicación' : 'Remove location'} onPress={() => setLocation(undefined)}><MaterialCommunityIcons name="close" size={20} color="#68737A" /></Pressable></View> : null}
          {publishError ? <Text className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-600">{publishError}</Text> : null}
          <View className="mt-3 flex-row items-center justify-between border-t border-ui-border dark:border-ui-dark-border pt-3">
            <View className="flex-row"><Pressable accessibilityRole="button" className="flex-row items-center rounded-xl px-3 py-2" onPress={() => void choosePhoto()}><MaterialCommunityIcons name="image-multiple" size={27} color="#0B6B4F" /><Text className="ml-2 font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Foto' : 'Photo'}</Text></Pressable><Pressable accessibilityRole="button" className="flex-row items-center rounded-xl px-3 py-2" onPress={() => void chooseLocation()}><MaterialCommunityIcons name="map-marker-outline" size={27} color="#C33B3B" /><Text className="ml-1 font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ubicación' : 'Location'}</Text></Pressable></View>
            <Pressable accessibilityRole="button" className="rounded-control bg-ui-primary px-6 py-3 disabled:opacity-40 dark:bg-ui-dark-primary" disabled={busy || (!body.trim() && !asset && !location)} onPress={() => void publish()}>{busy ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar' : 'Post'}</Text>}</Pressable>
          </View>
        </View>

        {!wall && !error ? <ActivityIndicator className="mt-10" color="#13a95b" size="large" /> : null}
        {error ? <Text className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-600">{error}</Text> : null}
        {wall && !wall.posts.length ? <View className="mt-6 items-center rounded-card border border-dashed border-ui-border bg-ui-surface p-8 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name="forum-outline" size={45} color="#0B6B4F" /><Text className="mt-3 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Abrí el primer hilo de conversación' : 'Start the first conversation'}</Text><Text className="mt-2 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Contá una experiencia, pedí consejos o compartí una foto.' : 'Share an experience, ask for advice, or post a photo.'}</Text></View> : null}

        {wall?.posts.map((post) => {
          const postReplies = wall.replies.filter((item) => item.post_id === post.id);
          const own = post.user_id === session?.user.id;
          return <View className="mt-5 overflow-hidden rounded-card border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface" key={post.id}>
            <View className="p-5">
              <View className="flex-row items-center">
                {post.user?.avatar_url ? <Image source={{ uri: post.user.avatar_url }} style={{ borderRadius: 23, height: 46, width: 46 }} /> : <View className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="account" size={24} color="#0B6B4F" /></View>}
                <Pressable className="ml-3 flex-1" onPress={() => router.push({ pathname: '/(aux)/traveler-profile', params: { id: post.user_id } })}><Text className="font-black text-ui-text dark:text-ui-dark-text">{displayName(post)}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(post.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></Pressable>
                {!own ? <Pressable className="ml-2 rounded-full bg-ui-primary-soft px-3 py-2 dark:bg-ui-dark-primary-soft" onPress={() => void follow(post.user_id)}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{wall.followedUserIds.has(post.user_id) ? (language === 'es' ? 'Siguiendo' : 'Following') : (language === 'es' ? 'Seguir' : 'Follow')}</Text></Pressable> : null}
              </View>
              {post.body ? <Text className="mt-4 text-base leading-6 text-ui-text dark:text-ui-dark-text">{post.body}</Text> : null}
            </View>
            {post.image_url ? <Image source={{ uri: post.image_url }} contentFit="cover" style={{ aspectRatio: 1.35, width: '100%' }} /> : null}
            {post.latitude != null && post.longitude != null ? <Pressable className="mx-5 mb-4 flex-row items-center rounded-control bg-ui-muted p-4 dark:bg-ui-dark-muted" onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${post.latitude},${post.longitude}`)}><MaterialCommunityIcons name="map-marker-radius" size={25} color="#0B6B4F" /><View className="ml-3 flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ver ubicación compartida' : 'View shared location'}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{post.latitude.toFixed(5)}, {post.longitude.toFixed(5)}</Text></View><MaterialCommunityIcons name="open-in-new" size={20} color="#0B6B4F" /></Pressable> : null}
            <View className="border-t border-ui-border dark:border-ui-dark-border px-5 py-3">
              <View className="relative self-start">
                {reactionPickerPostId === post.id ? <View className="absolute bottom-12 left-0 z-10 flex-row rounded-full border border-ui-border bg-ui-surface p-1 shadow-lg dark:border-ui-dark-border dark:bg-ui-dark-surface">{reactions.map((item) => <Pressable accessibilityLabel={item.label} className="h-11 w-11 items-center justify-center rounded-full" key={item.type} onPress={() => { longPressedPostId.current = undefined; setReactionPickerPostId(undefined); void react(post.id, item.type); }}><Text className="text-2xl">{item.emoji}</Text></Pressable>)}</View> : null}
                <Pressable
                  accessibilityHint={language === 'es' ? 'Mantené presionado para ver más reacciones' : 'Long press for more reactions'}
                  accessibilityLabel={language === 'es' ? 'Me gusta' : 'Like'}
                  className={wall.myReactions[post.id] ? 'rounded-full bg-ui-primary-soft px-3 py-2 dark:bg-ui-dark-primary-soft' : 'rounded-full bg-ui-muted px-3 py-2 dark:bg-ui-dark-muted'}
                  delayLongPress={450}
                  onLongPress={() => { longPressedPostId.current = post.id; setReactionPickerPostId(post.id); }}
                  onPress={() => like(post.id)}
                >
                  <Text className="text-base">{reactions.find(({ type }) => type === wall.myReactions[post.id])?.emoji ?? '👍'} {wall.reactionCounts[post.id]?.[wall.myReactions[post.id] ?? 'like'] ?? 0}</Text>
                </Pressable>
              </View>
              <Pressable className="mt-3 flex-row items-center" onPress={() => { setReplying(replying === post.id ? undefined : post.id); setReply(''); setParentReplyId(undefined); }}><MaterialCommunityIcons name="comment-outline" size={23} color="#0B6B4F" /><Text className="ml-2 font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? `Responder · ${postReplies.length}` : `Reply · ${postReplies.length}`}</Text></Pressable>
            </View>
            {replying === post.id ? <View className="border-t border-ui-border bg-ui-background p-4 dark:border-ui-dark-border dark:bg-ui-dark-background">{postReplies.map((item) => <View className={item.parent_reply_id ? 'mb-3 ml-7 rounded-control border-l-4 border-ui-primary bg-ui-surface p-3 dark:border-ui-dark-primary dark:bg-ui-dark-surface' : 'mb-3 rounded-control bg-ui-surface p-3 dark:bg-ui-dark-surface'} key={item.id}><Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{item.user?.full_name || item.user?.username || `Viajero ${item.user_id.slice(0, 5)}`}</Text><Text className="mt-1 text-ui-text dark:text-ui-dark-text">{item.body}</Text><Pressable className="mt-2 self-start" onPress={() => { setParentReplyId(item.id); setReply(''); }}><Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Responder comentario' : 'Reply to comment'}</Text></Pressable></View>)}{parentReplyId ? <View className="mb-2 flex-row items-center"><Text className="flex-1 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Respondiendo a un comentario' : 'Replying to a comment'}</Text><Pressable onPress={() => setParentReplyId(undefined)}><Text className="font-black text-ui-danger dark:text-ui-dark-danger">×</Text></Pressable></View> : null}<View className="flex-row items-end"><TextInput className="mr-2 flex-1 rounded-control bg-ui-surface px-4 py-3 text-ui-text dark:bg-ui-dark-surface dark:text-ui-dark-text" maxLength={1000} multiline onChangeText={setReply} placeholder={language === 'es' ? 'Escribí una respuesta…' : 'Write a reply…'} placeholderTextColor="#68737A" value={reply} /><Pressable className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary disabled:opacity-40 dark:bg-ui-dark-primary" disabled={busy || !reply.trim()} onPress={() => void respond(post.id)}><MaterialCommunityIcons name="send" size={20} color="white" /></Pressable></View></View> : null}
          </View>;
        })}
      </View>
    </ScrollView>
  );
}
