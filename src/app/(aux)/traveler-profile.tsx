import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { Card } from '@/components/ui/card';
import { getPublicTravelerProfile } from '@/lib/social-profile';
import { submitInformationReport } from '@/lib/reports';
import { blockTraveler, toggleTravelerFollow, unblockTraveler } from '@/lib/travelers';
import { useApp } from '@/providers/app-provider';

import { FrogLoader } from '@/components/frog-loader';
type PublicProfile = Awaited<ReturnType<typeof getPublicTravelerProfile>>;
export default function TravelerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, requireAuth, session } = useApp();
  const [data, setData] = useState<PublicProfile>();
  const [loadError, setLoadError] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const viewerId = session?.user.id;
  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(false);
    try { setData(await getPublicTravelerProfile(id, viewerId)); }
    catch { setLoadError(true); }
  }, [id, viewerId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loadError) return <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background"><Text accessibilityRole="alert" className="text-center font-bold text-ui-danger dark:text-ui-dark-danger">{language === 'es' ? 'No se pudo cargar este perfil.' : 'This profile could not be loaded.'}</Text><Pressable accessibilityRole="button" className="mt-4 min-h-11 justify-center rounded-control bg-ui-primary px-5 dark:bg-ui-dark-primary" onPress={() => void load()}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View>;
  if (!data?.profile) return <View className="flex-1 items-center justify-center bg-ui-background dark:bg-ui-dark-background"><FrogLoader color="#13bd83" /></View>;
  const text = (es: string, en: string) => language === 'es' ? es : en;
  const name = data.profile.username || data.profile.full_name || text('Viajero', 'Traveler');
  const profileBio = data.profile.bio;
  const report = () => {
    if (!requireAuth(text('reportar a este usuario', 'report this user'))) return;
    Alert.alert(
      text('Reportar usuario', 'Report user'),
      text('El equipo de moderación revisará este perfil y su actividad.', 'The moderation team will review this profile and its activity.'),
      [
        { text: text('Cancelar', 'Cancel') },
        {
          text: text('Reportar', 'Report'),
          onPress: () => void submitInformationReport({
            targetType: 'traveler',
            targetId: id,
            targetLabel: name,
            reportType: 'abusive_content',
            details: profileBio?.slice(0, 500),
          }).then(
            () => Alert.alert(text('Reporte enviado', 'Report sent'), text('Gracias. Revisaremos este usuario.', 'Thank you. We will review this user.')),
            () => Alert.alert(text('No se pudo enviar', 'Could not send'), text('Revisá tu conexión e intentá de nuevo.', 'Check your connection and try again.')),
          ),
        },
      ],
    );
  };
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
  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
    <Card className="items-center" padding="lg">
      <View className="mb-2 w-full flex-row items-center justify-between"><Pressable accessibilityLabel={text('Volver', 'Back')} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color="#087443" /></Pressable>{id !== viewerId ? <View className="flex-row gap-2"><Pressable accessibilityLabel={text('Reportar usuario', 'Report user')} accessibilityRole="button" className="min-h-10 flex-row items-center rounded-full border border-ui-danger px-3 dark:border-ui-dark-danger" onPress={report}><MaterialCommunityIcons name="flag-outline" size={17} color="#C33B3B" /><Text className="ml-1 text-xs font-bold text-ui-danger dark:text-ui-dark-danger">{text('Reportar', 'Report')}</Text></Pressable><Pressable accessibilityLabel={data.blocked ? text('Desbloquear usuario', 'Unblock user') : text('Bloquear usuario', 'Block user')} accessibilityRole="button" accessibilityState={{ busy: blockBusy, disabled: blockBusy }} className={data.blocked ? 'min-h-10 flex-row items-center rounded-full bg-ui-primary-soft px-3 dark:bg-ui-dark-primary-soft' : 'min-h-10 flex-row items-center rounded-full border border-ui-danger px-3 dark:border-ui-dark-danger'} disabled={blockBusy} onPress={block}>{blockBusy ? <FrogLoader color="#C33B3B" size="small" /> : <MaterialCommunityIcons name={data.blocked ? 'account-lock-open-outline' : 'account-cancel-outline'} size={17} color={data.blocked ? '#0B6B4F' : '#C33B3B'} />}<Text className={data.blocked ? 'ml-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary' : 'ml-1 text-xs font-bold text-ui-danger dark:text-ui-dark-danger'}>{data.blocked ? text('Desbloquear', 'Unblock') : text('Bloquear', 'Block')}</Text></Pressable></View> : <View className="h-11" />}</View>
      {data.profile.avatar_url ? <Image source={{ uri: data.profile.avatar_url }} style={{ borderRadius: 52, height: 104, width: 104 }} /> : <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary"><MaterialCommunityIcons name="account" size={50} color="white" /></View>}
      <View className="mt-5 w-full">
        <Text className="text-2xl font-black leading-8 text-ui-text dark:text-ui-dark-text">{name}</Text>
        <Text className="mt-2 text-base leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{data.profile.bio || text('Explorando Costa Rica', 'Exploring Costa Rica')}</Text>
        <View className="mt-4 flex-row items-center">
          <Text className="font-bold text-ui-text dark:text-ui-dark-text">{data.followers.length} {text('seguidores', 'followers')}</Text>
          <Text className="mx-2 text-ui-text-muted dark:text-ui-dark-text-muted">·</Text>
          <Text className="font-bold text-ui-text dark:text-ui-dark-text">{data.following.length} {text('siguiendo', 'following')}</Text>
        </View>
        {id !== viewerId ? <View className="mt-5 flex-row gap-2"><Pressable accessibilityRole="button" accessibilityState={{ busy: followBusy, disabled: followBusy }} className="min-h-12 flex-row items-center justify-center rounded-control bg-ui-primary px-5 disabled:opacity-45 dark:bg-ui-dark-primary" disabled={followBusy} onPress={() => void follow()}>{followBusy ? <FrogLoader color="white" size="small" /> : null}<Text className="font-semibold text-white dark:text-ui-dark-background">{data.followed ? text('Dejar de seguir', 'Unfollow') : text('Seguir', 'Follow')}</Text></Pressable><Pressable accessibilityLabel={text('Enviar mensaje', 'Send message')} accessibilityRole="button" className="min-h-12 flex-row items-center justify-center rounded-control border border-ui-primary px-4 dark:border-ui-dark-primary" onPress={() => viewerId ? router.push({ pathname: '/(aux)/private-messages' as never, params: { partnerId: id, partnerName: name, partnerAvatarUrl: data.profile?.avatar_url ?? '' } }) : requireAuth(text('enviar un mensaje privado', 'send a private message'))}><MaterialCommunityIcons name="message-outline" size={21} color="#0B6B4F" /><Text className="ml-2 font-semibold text-ui-primary dark:text-ui-dark-primary">{text('Enviar mensaje', 'Send message')}</Text></Pressable></View> : null}
      </View>
    </Card>
    <Text className="mb-2 mt-7 text-xl font-black text-ui-text dark:text-ui-dark-text">{text('Publicaciones', 'Posts')}</Text>{data.posts.map((post) => <View className="mb-4 overflow-hidden rounded-3xl bg-ui-surface dark:bg-ui-dark-surface" key={post.id}><View className="p-5"><Text className="text-ui-text dark:text-ui-dark-text">{post.body}</Text></View>{post.image_url ? <Image source={{ uri: post.image_url }} contentFit="cover" style={{ height: 260, width: '100%' }} /> : null}</View>)}
  </ScrollView>;
}
