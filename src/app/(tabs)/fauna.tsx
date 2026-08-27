import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import {
  addFaunaComment,
  type FaunaPhoto,
  type FaunaSpecies,
  getFaunaHome,
  getVulnerabilityLabel,
  toggleFaunaFollow,
  toggleFaunaPhotoLike,
} from '@/lib/fauna';
import { useApp } from '@/providers/app-provider';

type FaunaHome = Awaited<ReturnType<typeof getFaunaHome>>;

export default function FaunaScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { language, requireAuth, session } = useApp();
  const userId = session?.user.id;
  const [home, setHome] = useState<FaunaHome>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [commenting, setCommenting] = useState<string>();
  const [comment, setComment] = useState('');
  const wide = width >= 900;

  const load = useCallback(async () => {
    try {
      setError(undefined);
      setHome(await getFaunaHome(userId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar Fauna CR.');
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const likePhoto = async (photo: FaunaPhoto) => {
    if (!requireAuth(language === 'es' ? 'Dar me gusta a una foto' : 'Like a photo') || !session || !home) return;
    setBusy(`like-${photo.id}`);
    try {
      await toggleFaunaPhotoLike(photo.id, session.user.id, home.likedPhotoIds.has(photo.id));
      await load();
    } catch (reason) {
      Alert.alert('Fauna CR', reason instanceof Error ? reason.message : 'No se pudo actualizar el like.');
    } finally {
      setBusy(undefined);
    }
  };

  const followUser = async (photographerId: string) => {
    if (!requireAuth(language === 'es' ? 'Seguir fotógrafo' : 'Follow photographer') || !session || !home) return;
    setBusy(`follow-${photographerId}`);
    try {
      await toggleFaunaFollow(session.user.id, photographerId, home.followedUserIds.has(photographerId));
      await load();
    } catch (reason) {
      Alert.alert('Fauna CR', reason instanceof Error ? reason.message : 'No se pudo actualizar el seguimiento.');
    } finally {
      setBusy(undefined);
    }
  };

  const sendComment = async (photoId: string) => {
    if (!requireAuth(language === 'es' ? 'Comentar una foto' : 'Comment on a photo') || !session || !comment.trim()) return;
    setBusy(`comment-${photoId}`);
    try {
      await addFaunaComment(photoId, session.user.id, comment);
      setComment('');
      setCommenting(undefined);
      await load();
    } catch (reason) {
      Alert.alert('Fauna CR', reason instanceof Error ? reason.message : 'No se pudo publicar el comentario.');
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <ScrollView className="flex-1 bg-mint-50 dark:bg-forest-950" contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
      <View className="overflow-hidden bg-forest-900 px-5 pb-7 pt-7">
        <View className="absolute -right-10 -top-8 h-44 w-44 rounded-full bg-frog-500/20" />
        <View className="flex-row items-center">
          <View className="h-16 w-16 items-center justify-center rounded-[24px] bg-frog-500">
            <MaterialCommunityIcons name="butterfly-outline" size={34} color="white" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-3xl font-black tracking-tight text-white">Fauna CR</Text>
            <Text className="mt-1 text-sm leading-5 text-mint-200">
              {language === 'es' ? 'Conocé, observá y protegé nuestra biodiversidad.' : 'Discover, observe, and protect our biodiversity.'}
            </Text>
          </View>
        </View>
        <View className="mt-5 flex-row items-center rounded-2xl border border-frog-400/25 bg-white/10 p-4">
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#78dfa1" />
          <Text className="ml-3 flex-1 text-sm leading-5 text-mint-100">
            {language === 'es' ? 'Las ubicaciones sensibles se muestran sólo por provincia.' : 'Sensitive locations are shown only at province level.'}
          </Text>
        </View>
      </View>

      {!home && !error ? <ActivityIndicator className="mt-12" color="#13a95b" size="large" /> : null}
      {error ? (
        <View className="mx-5 mt-6 rounded-3xl border border-coral-200 bg-coral-50 p-5 dark:border-coral-500/40 dark:bg-forest-900">
          <Text className="font-bold text-coral-600">{error}</Text>
          <Pressable className="mt-4 self-start rounded-xl bg-coral-500 px-4 py-2" onPress={() => void load()}>
            <Text className="font-bold text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text>
          </Pressable>
        </View>
      ) : null}

      {home ? <View className="px-5 pt-6">
        <View className="rounded-[30px] bg-[#075c49] p-6 md:p-8">
          <View className="flex-row items-center justify-between"><View className="flex-1"><Text className="text-2xl font-black text-white">{language === 'es' ? 'Tu Life List de Costa Rica' : 'Your Costa Rica Life List'}</Text><Text className="mt-2 leading-6 text-mint-100">{language === 'es' ? `Has registrado ${home.seenSpeciesIds.size} de ${home.species.length} especies del catálogo.` : `You have recorded ${home.seenSpeciesIds.size} of ${home.species.length} catalog species.`}</Text></View><View className="ml-4 rounded-2xl border border-white/20 bg-white/10 px-5 py-4"><Text className="text-2xl font-black text-[#ffd43b]">{home.seenSpeciesIds.size} / {home.species.length}</Text></View></View>
          <View className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><View className="h-full rounded-full bg-[#ffd43b]" style={{ width: `${home.species.length ? home.seenSpeciesIds.size / home.species.length * 100 : 0}%` }} /></View>
        </View>
        <View className="mt-5 flex-row flex-wrap gap-3">{home.species.map((item) => { const seen = home.seenSpeciesIds.has(item.id); return <View className={seen ? 'overflow-hidden rounded-3xl border border-[#00b981] bg-[#17332f] p-4' : 'overflow-hidden rounded-3xl border border-[#2e394e] bg-[#192235] p-4'} key={item.id} style={{ width: wide ? '32%' : '100%' }}><Pressable accessibilityRole="button" className="flex-row items-center" onPress={() => router.push({ pathname: '/(aux)/species', params: { id: item.id } })}>{item.image_url ? <Image source={{ uri: item.image_url }} contentFit="cover" style={{ borderRadius: 14, height: 64, width: 64 }} transition={180} /> : <View className="h-16 w-16 items-center justify-center rounded-2xl bg-forest-800"><MaterialCommunityIcons name="paw" size={30} color="#78dfa1" /></View>}<View className="ml-4 flex-1"><Text className={seen ? 'font-black text-white' : 'font-black text-[#b9c0ce]'}>{language === 'es' ? item.common_name_es : item.common_name_en}</Text><Text className="mt-1 text-xs italic text-[#78869e]">{item.scientific_name}</Text><Text className="mt-2 text-[10px] font-black uppercase text-[#78dfa1]">{item.is_national_symbol ? 'CR Símbolo' : item.tour_observable ? (language === 'es' ? 'Observable en tour' : 'Tour observable') : getVulnerabilityLabel(item.vulnerability_status, language)}</Text></View><View className={seen ? 'h-10 w-10 items-center justify-center rounded-full bg-[#00b981]' : 'h-10 w-10 items-center justify-center rounded-full border border-[#39455b]'}>{seen ? <MaterialCommunityIcons name="check" size={23} color="white" /> : null}</View></Pressable><Pressable accessibilityRole="button" className="mt-4 flex-row items-center justify-center rounded-xl bg-white/5 py-3" onPress={() => router.push({ pathname: '/(aux)/species', params: { id: item.id, share: '1' } })}><MaterialCommunityIcons name="camera-plus-outline" size={20} color="#78dfa1" /><Text className="ml-2 text-xs font-black text-white">{language === 'es' ? 'Compartir foto' : 'Share photo'}</Text></Pressable></View>; })}</View>
      </View> : null}

      {home ? (
        <View className="mt-8">
          <View className="flex-row items-center px-5">
            <MaterialCommunityIcons name="hospital-building" size={25} color="#087443" />
            <Text className="ml-3 text-xl font-black text-forest-950 dark:text-white">
              {language === 'es' ? 'Santuarios verificados' : 'Verified sanctuaries'}
            </Text>
          </View>
          <ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}>
            {home.sanctuaries.map((sanctuary) => (
              <View className="w-64 rounded-3xl bg-forest-900 p-5 dark:bg-forest-800" key={sanctuary.id}>
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="check-decagram" size={22} color="#78dfa1" />
                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-frog-300">{language === 'es' ? 'Verificado' : 'Verified'}</Text>
                </View>
                <Text className="mt-4 text-lg font-black text-white">{sanctuary.name}</Text>
                <Text className="mt-2 text-sm text-mint-200">{sanctuary.location_name} · {sanctuary.province}</Text>
                <Text className="mt-3 text-sm leading-5 text-mint-100">{language === 'es' ? sanctuary.description_es : sanctuary.description_en}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {home ? (
        <View className="mt-9 px-5">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-2xl font-black text-forest-950 dark:text-white">{language === 'es' ? 'Amigos Viajeros' : 'Travel Friends'}</Text>
              <Text className="mt-1 text-sm text-forest-500 dark:text-mint-300">{language === 'es' ? 'El muro para compartir fotos, experiencias y conversaciones de viaje' : 'The wall for sharing photos, experiences and travel conversations'}</Text>
            </View>
            <MaterialCommunityIcons name="image-multiple-outline" size={29} color="#087443" />
          </View>

          {!home.photos.length ? (
            <View className="mt-5 items-center rounded-3xl border border-dashed border-mint-300 bg-white p-7 dark:border-forest-600 dark:bg-forest-900">
              <MaterialCommunityIcons name="camera-plus-outline" size={42} color="#13a95b" />
              <Text className="mt-3 text-center font-black text-forest-950 dark:text-white">{language === 'es' ? 'Amigos Viajeros espera su primera historia' : 'Travel Friends is waiting for its first story'}</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-forest-500 dark:text-mint-300">{language === 'es' ? 'Abrí cualquier animal, compartí una foto y comenzá una conversación.' : 'Open any animal, share a photo and start a conversation.'}</Text>
            </View>
          ) : home.photos.map((photo) => (
            <AlbumPhoto
              busy={busy}
              comment={comment}
              commenting={commenting === photo.id}
              comments={home.comments.filter((item) => item.photo_id === photo.id)}
              followed={home.followedUserIds.has(photo.user_id)}
              key={photo.id}
              language={language}
              liked={home.likedPhotoIds.has(photo.id)}
              onChangeComment={setComment}
              onComment={() => {
                if (!requireAuth(language === 'es' ? 'Comentar una foto' : 'Comment on a photo')) return;
                setCommenting(commenting === photo.id ? undefined : photo.id);
                setComment('');
              }}
              onFollow={() => void followUser(photo.user_id)}
              onLike={() => void likePhoto(photo)}
              onSend={() => void sendComment(photo.id)}
              ownPhoto={session?.user.id === photo.user_id}
              photo={photo}
              species={home.species.find((item) => item.id === photo.fauna_id)}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function AlbumPhoto({
  busy, comment, commenting, comments, followed, language, liked, onChangeComment, onComment, onFollow, onLike, onSend, ownPhoto, photo, species,
}: {
  busy?: string;
  comment: string;
  commenting: boolean;
  comments: FaunaHome['comments'];
  followed: boolean;
  language: 'es' | 'en';
  liked: boolean;
  onChangeComment: (value: string) => void;
  onComment: () => void;
  onFollow: () => void;
  onLike: () => void;
  onSend: () => void;
  ownPhoto: boolean;
  photo: FaunaPhoto;
  species?: FaunaSpecies;
}) {
  return (
    <View className="mt-5 overflow-hidden rounded-3xl border border-mint-200 bg-white dark:border-forest-700 dark:bg-forest-900">
      <Image source={{ uri: photo.image_url }} contentFit="cover" style={{ aspectRatio: 1.25, width: '100%' }} transition={180} />
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-black text-forest-950 dark:text-white">{species ? (language === 'es' ? species.common_name_es : species.common_name_en) : 'Fauna CR'}</Text>
            <Text className="mt-1 text-xs text-forest-500 dark:text-mint-300">{language === 'es' ? 'Fotógrafo' : 'Photographer'} · {photo.user_id.slice(0, 8)}</Text>
          </View>
          {!ownPhoto ? (
            <Pressable className="rounded-full bg-frog-100 px-3 py-2 dark:bg-forest-700" disabled={busy === `follow-${photo.user_id}`} onPress={onFollow}>
              <Text className="text-xs font-black text-forest-700 dark:text-frog-300">{followed ? (language === 'es' ? 'Siguiendo' : 'Following') : (language === 'es' ? 'Seguir' : 'Follow')}</Text>
            </Pressable>
          ) : null}
        </View>
        {photo.caption ? <Text className="mt-3 text-sm text-forest-700 dark:text-mint-200">{photo.caption}</Text> : null}
        <View className="mt-4 flex-row items-center gap-5">
          <Pressable className="flex-row items-center" disabled={busy === `like-${photo.id}`} onPress={onLike}>
            <MaterialCommunityIcons name={liked ? 'heart' : 'heart-outline'} size={23} color="#ff5d52" />
            <Text className="ml-2 font-bold text-forest-700 dark:text-mint-200">{photo.likes_count}</Text>
          </Pressable>
          <Pressable className="flex-row items-center" onPress={onComment}>
            <MaterialCommunityIcons name="comment-outline" size={22} color="#087443" />
            <Text className="ml-2 font-bold text-forest-700 dark:text-mint-200">{comments.length}</Text>
          </Pressable>
        </View>
        {comments.slice(0, 2).map((item) => <Text className="mt-3 text-sm text-forest-600 dark:text-mint-200" key={item.id}><Text className="font-black">{item.user_id.slice(0, 6)}</Text> {item.body}</Text>)}
        {commenting ? (
          <View className="mt-4 flex-row items-center">
            <TextInput
              className="mr-2 flex-1 rounded-2xl bg-mint-100 px-4 py-3 text-forest-950 dark:bg-forest-800 dark:text-white"
              maxLength={500}
              onChangeText={onChangeComment}
              placeholder={language === 'es' ? 'Escribí un comentario…' : 'Write a comment…'}
              placeholderTextColor="#75a291"
              value={comment}
            />
            <Pressable className="h-11 w-11 items-center justify-center rounded-2xl bg-frog-500" disabled={!comment.trim() || busy === `comment-${photo.id}`} onPress={onSend}>
              <MaterialCommunityIcons name="send" size={20} color="white" />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
