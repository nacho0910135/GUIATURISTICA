import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
  const { language, requireAuth, session } = useApp();
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

  const load = useCallback(async () => {
    try { setError(undefined); setWall(await getTravelerWall(userId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar Amigos Viajeros.'); }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const choosePhoto = async () => {
    if (!requireAuth(language === 'es' ? 'Compartir una foto' : 'Share a photo')) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Amigos Viajeros', language === 'es' ? 'Necesitamos permiso para elegir una foto.' : 'Photo permission is required.');
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
    catch (reason) { Alert.alert('Amigos Viajeros', reason instanceof Error ? reason.message : 'No se pudo responder.'); }
    finally { setBusy(false); }
  };

  const react = async (postId: string, reaction: ReactionType) => {
    if (!requireAuth(language === 'es' ? 'Dar me gusta' : 'Like a post') || !session || !wall) return;
    try {
      await setTravelerReaction(postId, session.user.id, reaction, wall.myReactions[postId]);
      await load();
    } catch (reason) {
      Alert.alert('Amigos Viajeros', reason instanceof Error ? reason.message : 'No se pudo actualizar el me gusta.');
    }
  };

  const follow = async (userId: string) => {
    if (!requireAuth(language === 'es' ? 'Seguir a un viajero' : 'Follow a traveler') || !session || !wall) return;
    try {
      await toggleTravelerFollow(session.user.id, userId, wall.followedUserIds.has(userId));
      await load();
    } catch (reason) {
      Alert.alert('Amigos Viajeros', reason instanceof Error ? reason.message : 'No se pudo actualizar el seguimiento.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#eef2f1] dark:bg-forest-950" contentContainerStyle={{ alignItems: 'center', paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <View className="w-full bg-forest-900 px-5 py-7">
        <View className="mx-auto w-full max-w-3xl flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-frog-500"><MaterialCommunityIcons name="account-group" size={30} color="white" /></View>
          <View className="ml-4"><Text className="text-3xl font-black text-white">{language === 'es' ? 'Amigos Viajeros' : 'Travel Friends'}</Text><Text className="mt-1 text-mint-200">{language === 'es' ? 'Experiencias, fotos y conversaciones de viaje.' : 'Travel experiences, photos and conversations.'}</Text></View>
        </View>
      </View>

      <View className="w-full max-w-3xl px-4 pt-5">
        <View className="rounded-3xl border border-[#d9dfdd] bg-white p-4 shadow-sm dark:border-forest-700 dark:bg-forest-900">
          <View className="flex-row items-center">
            {session?.user.user_metadata.avatar_url ? <Image source={{ uri: session.user.user_metadata.avatar_url }} style={{ borderRadius: 25, height: 50, width: 50 }} /> : <View className="h-12 w-12 items-center justify-center rounded-full bg-mint-200"><MaterialCommunityIcons name="account" size={27} color="#087443" /></View>}
            <TextInput
              className="ml-3 flex-1 rounded-full bg-[#f0f2f5] px-5 py-4 text-base text-forest-950 dark:bg-forest-800 dark:text-white"
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
          {location ? <View className="mt-3 flex-row items-center rounded-2xl bg-mint-100 p-3 dark:bg-forest-800"><MaterialCommunityIcons name="map-marker" size={24} color="#087443" /><Text className="ml-2 flex-1 font-bold text-forest-800 dark:text-mint-100">{language === 'es' ? 'Ubicación lista para compartir' : 'Location ready to share'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Quitar ubicación' : 'Remove location'} onPress={() => setLocation(undefined)}><MaterialCommunityIcons name="close" size={20} color="#315f4e" /></Pressable></View> : null}
          {publishError ? <Text className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-600">{publishError}</Text> : null}
          <View className="mt-3 flex-row items-center justify-between border-t border-[#e5e8e7] pt-3">
            <View className="flex-row"><Pressable accessibilityRole="button" className="flex-row items-center rounded-xl px-3 py-2" onPress={() => void choosePhoto()}><MaterialCommunityIcons name="image-multiple" size={27} color="#18b65b" /><Text className="ml-2 font-bold text-forest-700 dark:text-mint-100">{language === 'es' ? 'Foto' : 'Photo'}</Text></Pressable><Pressable accessibilityRole="button" className="flex-row items-center rounded-xl px-3 py-2" onPress={() => void chooseLocation()}><MaterialCommunityIcons name="map-marker-outline" size={27} color="#e05a47" /><Text className="ml-1 font-bold text-forest-700 dark:text-mint-100">{language === 'es' ? 'Ubicación' : 'Location'}</Text></Pressable></View>
            <Pressable accessibilityRole="button" className="rounded-xl bg-frog-500 px-6 py-3 disabled:opacity-40" disabled={busy || (!body.trim() && !asset && !location)} onPress={() => void publish()}>{busy ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar' : 'Post'}</Text>}</Pressable>
          </View>
        </View>

        {!wall && !error ? <ActivityIndicator className="mt-10" color="#13a95b" size="large" /> : null}
        {error ? <Text className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-600">{error}</Text> : null}
        {wall && !wall.posts.length ? <View className="mt-6 items-center rounded-3xl border border-dashed border-mint-300 bg-white p-8 dark:border-forest-700 dark:bg-forest-900"><MaterialCommunityIcons name="forum-outline" size={45} color="#13a95b" /><Text className="mt-3 text-center text-lg font-black text-forest-950 dark:text-white">{language === 'es' ? 'Abrí el primer hilo de conversación' : 'Start the first conversation'}</Text><Text className="mt-2 text-center text-forest-500 dark:text-mint-200">{language === 'es' ? 'Contá una experiencia, pedí consejos o compartí una foto.' : 'Share an experience, ask for advice, or post a photo.'}</Text></View> : null}

        {wall?.posts.map((post) => {
          const postReplies = wall.replies.filter((item) => item.post_id === post.id);
          const own = post.user_id === session?.user.id;
          return <View className="mt-5 overflow-hidden rounded-3xl border border-[#d9dfdd] bg-white dark:border-forest-700 dark:bg-forest-900" key={post.id}>
            <View className="p-5">
              <View className="flex-row items-center">
                {post.user?.avatar_url ? <Image source={{ uri: post.user.avatar_url }} style={{ borderRadius: 23, height: 46, width: 46 }} /> : <View className="h-11 w-11 items-center justify-center rounded-full bg-mint-200"><MaterialCommunityIcons name="account" size={24} color="#087443" /></View>}
                <Pressable className="ml-3 flex-1" onPress={() => router.push({ pathname: '/(aux)/traveler-profile', params: { id: post.user_id } })}><Text className="font-black text-forest-950 dark:text-white">{displayName(post)}</Text><Text className="mt-1 text-xs text-forest-500 dark:text-mint-300">{new Date(post.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></Pressable>
                {!own ? <Pressable className="ml-2 rounded-full bg-mint-100 px-3 py-2 dark:bg-forest-800" onPress={() => void follow(post.user_id)}><Text className="font-black text-frog-600">{wall.followedUserIds.has(post.user_id) ? (language === 'es' ? 'Siguiendo' : 'Following') : (language === 'es' ? 'Seguir' : 'Follow')}</Text></Pressable> : null}
              </View>
              {post.body ? <Text className="mt-4 text-base leading-6 text-forest-800 dark:text-mint-100">{post.body}</Text> : null}
            </View>
            {post.image_url ? <Image source={{ uri: post.image_url }} contentFit="cover" style={{ aspectRatio: 1.35, width: '100%' }} /> : null}
            {post.latitude != null && post.longitude != null ? <Pressable className="mx-5 mb-4 flex-row items-center rounded-2xl bg-mint-100 p-4 dark:bg-forest-800" onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${post.latitude},${post.longitude}`)}><MaterialCommunityIcons name="map-marker-radius" size={25} color="#087443" /><View className="ml-3 flex-1"><Text className="font-black text-forest-900 dark:text-white">{language === 'es' ? 'Ver ubicación compartida' : 'View shared location'}</Text><Text className="mt-1 text-xs text-forest-500 dark:text-mint-300">{post.latitude.toFixed(5)}, {post.longitude.toFixed(5)}</Text></View><MaterialCommunityIcons name="open-in-new" size={20} color="#087443" /></Pressable> : null}
            <View className="border-t border-[#e5e8e7] px-5 py-3">
              <View className="flex-row flex-wrap gap-2">{reactions.map((item) => <Pressable accessibilityLabel={item.label} className={wall.myReactions[post.id] === item.type ? 'rounded-full bg-mint-200 px-3 py-2 dark:bg-forest-700' : 'rounded-full bg-[#f3f5f4] px-3 py-2 dark:bg-forest-800'} key={item.type} onPress={() => void react(post.id, item.type)}><Text className="text-base">{item.emoji} {wall.reactionCounts[post.id]?.[item.type] ?? 0}</Text></Pressable>)}</View>
              <Pressable className="mt-3 flex-row items-center" onPress={() => { setReplying(replying === post.id ? undefined : post.id); setReply(''); setParentReplyId(undefined); }}><MaterialCommunityIcons name="comment-outline" size={23} color="#087443" /><Text className="ml-2 font-bold text-forest-600 dark:text-mint-200">{language === 'es' ? `Responder · ${postReplies.length}` : `Reply · ${postReplies.length}`}</Text></Pressable>
            </View>
            {replying === post.id ? <View className="border-t border-[#e5e8e7] bg-[#f7f9f8] p-4 dark:bg-forest-800">{postReplies.map((item) => <View className={item.parent_reply_id ? 'mb-3 ml-7 rounded-2xl border-l-4 border-frog-300 bg-white p-3 dark:bg-forest-900' : 'mb-3 rounded-2xl bg-white p-3 dark:bg-forest-900'} key={item.id}><Text className="text-xs font-black text-forest-700 dark:text-frog-300">{item.user?.full_name || item.user?.username || `Viajero ${item.user_id.slice(0, 5)}`}</Text><Text className="mt-1 text-forest-800 dark:text-mint-100">{item.body}</Text><Pressable className="mt-2 self-start" onPress={() => { setParentReplyId(item.id); setReply(''); }}><Text className="text-xs font-black text-frog-600">{language === 'es' ? 'Responder comentario' : 'Reply to comment'}</Text></Pressable></View>)}{parentReplyId ? <View className="mb-2 flex-row items-center"><Text className="flex-1 text-xs font-bold text-forest-500">{language === 'es' ? 'Respondiendo a un comentario' : 'Replying to a comment'}</Text><Pressable onPress={() => setParentReplyId(undefined)}><Text className="font-black text-coral-600">×</Text></Pressable></View> : null}<View className="flex-row items-end"><TextInput className="mr-2 flex-1 rounded-2xl bg-white px-4 py-3 text-forest-950 dark:bg-forest-900 dark:text-white" maxLength={1000} multiline onChangeText={setReply} placeholder={language === 'es' ? 'Escribí una respuesta…' : 'Write a reply…'} placeholderTextColor="#73807b" value={reply} /><Pressable className="h-11 w-11 items-center justify-center rounded-full bg-frog-500 disabled:opacity-40" disabled={busy || !reply.trim()} onPress={() => void respond(post.id)}><MaterialCommunityIcons name="send" size={20} color="white" /></Pressable></View></View> : null}
          </View>;
        })}
      </View>
    </ScrollView>
  );
}
