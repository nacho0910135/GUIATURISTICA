import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { ThemedAlert as Alert } from '@/components/themed-alert';
import { reviewCommercialClaim } from '@/lib/commerce';
import { getAppOptions, type AppOption } from '@/lib/app-options';
import { addDestinationPhoto, deleteDestinationPhoto, deleteTravelerPost, getAdminDashboard, getPrivateConversations, getSocialProfile, markAllNotificationsRead, markMessageRead, markNotificationRead, reviewUserSubmission, sendCreatorSuggestion, sendTravelerMessage, setSanctuaryCover, shareSightingToWall, toggleTravelerMessageReaction, updateCreatorSuggestionStatus, updateTravelerProfile, type PrivateConversation, type PrivateMessage } from '@/lib/social-profile';
import { reportTypeLabel, updateInformationReportStatus } from '@/lib/reports';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/providers/app-provider';

type Dashboard = Awaited<ReturnType<typeof getSocialProfile>>;
type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
type NotificationItem = Dashboard['notifications'][number];
type Section = 'notifications' | 'community' | 'sightings' | 'saved' | 'messages' | 'suggestions' | 'login';

export default function ProfileScreen() {
  const { avatarUrl, isAdmin, isAuthenticated, language, session, setAvatarUrl, signIn, signOut } = useApp();
  const [section, setSection] = useState<Section>();
  const [data, setData] = useState<Dashboard>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset>();
  const [editingProfile, setEditingProfile] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const userId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const notificationTypes = useQuery({
    queryKey: ['app-options', 'notification_type'],
    queryFn: () => getAppOptions('notification_type'),
    staleTime: Infinity,
  });
  const profileSummary = useQuery({
    queryKey: ['profile-summary', userId],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase.from('users').select('id,username,full_name,avatar_url,bio,contact_email').eq('id', userId).single();
      if (profileError) throw profileError;
      return profile;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
  const conversations = useQuery({
    queryKey: ['private-conversations', userId],
    queryFn: () => getPrivateConversations(userId),
    enabled: Boolean(userId) && section === 'messages',
    staleTime: 60 * 1000,
  });
  const adminDashboard = useQuery({
    queryKey: ['admin-dashboard', userId],
    queryFn: getAdminDashboard,
    enabled: Boolean(userId) && isAdmin && section === 'login',
    staleTime: 60 * 1000,
  });

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(undefined);
      const next = await getSocialProfile(userId);
      setData(next);
      setUsername(next.profile?.username || '');
      setBio(next.profile?.bio || '');
      setContactEmail(next.profile?.contact_email || '');
      if (next.profile?.avatar_url) setAvatarUrl(next.profile.avatar_url);
    } catch (reason) {
      setError(message(reason));
    }
  }, [setAvatarUrl, userId]);
  useEffect(() => { setData(undefined); setError(undefined); }, [userId]);
  useEffect(() => {
    if (!profileSummary.data || editingProfile) return;
    setUsername(profileSummary.data.username || '');
    setBio(profileSummary.data.bio || '');
    setContactEmail(profileSummary.data.contact_email || '');
  }, [editingProfile, profileSummary.data]);
  useFocusEffect(
    useCallback(() => {
      if (!data) void load();
    }, [data, load]),
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      Alert.alert('Descubriendo CR', message(reason));
    } finally {
      setBusy(false);
    }
  };
  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(tr(language, 'Perfil', 'Profile'), tr(language, 'Necesitamos permiso para elegir una foto.', 'Photo library permission is required.'));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    const profile = data?.profile ?? profileSummary.data;
    if (result.canceled || !profile) return;
    setAvatar(result.assets[0]);
    await run(async () => {
      const saved = await updateTravelerProfile(userId, {
        bio: profile.bio || '',
        contactEmail: profile.contact_email || '',
        avatar: result.assets[0],
      });
      setAvatarUrl(saved.avatar_url ?? null);
      setAvatar(undefined);
      await load();
      Alert.alert(tr(language, 'Perfil', 'Profile'), tr(language, 'Tu foto de perfil fue guardada.', 'Your profile photo was saved.'));
    });
    setAvatar(undefined);
  };
  const saveProfile = () =>
    void run(async () => {
      const saved = await updateTravelerProfile(userId, {
        username,
        bio,
        contactEmail,
        avatar,
      });
      setAvatarUrl(saved.avatar_url ?? null);
      setAvatar(undefined);
      setEditingProfile(false);
      await load();
      Alert.alert(tr(language, 'Perfil', 'Profile'), tr(language, 'Tus cambios fueron guardados.', 'Your changes were saved.'));
    });
  const metadata = session?.user.user_metadata as Record<string, unknown> | undefined;
  const metadataUsername = typeof metadata?.username === 'string' ? metadata.username : undefined;
  const metadataName = metadataUsername ?? (typeof metadata?.full_name === 'string' ? metadata.full_name : typeof metadata?.name === 'string' ? metadata.name : undefined);
  const displayProfile = data?.profile ?? profileSummary.data;
  const profileAvatarUrl = avatar?.uri ?? displayProfile?.avatar_url ?? avatarUrl ?? (typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : typeof metadata?.picture === 'string' ? metadata.picture : null);
  const name = displayProfile?.username || displayProfile?.full_name || metadataName || (language === 'es' ? 'Viajero' : 'Traveler');
  const tabs: {
    key: Section;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    count?: number;
  }[] = [
    {
      key: 'notifications',
      icon: 'bell-outline',
      label: tr(language, 'Notificaciones', 'Notifications'),
      count: data ? data.notifications.filter((n) => !n.read_status).length : undefined,
    },
    {
      key: 'community',
      icon: 'account-group-outline',
      label: tr(language, 'Comunidad', 'Community'),
    },
    {
      key: 'sightings',
      icon: 'camera-outline',
      label: tr(language, 'Mis avistamientos', 'My sightings'),
      count: data ? data.sightings.length : undefined,
    },
    {
      key: 'saved',
      icon: 'heart-outline',
      label: tr(language, 'Guardados', 'Saved'),
      count: data ? data.saved.length : undefined,
    },
    {
      key: 'messages',
      icon: 'message-outline',
      label: tr(language, 'Mensajes', 'Messages'),
      count: conversations.data?.reduce((total, item) => total + item.unread_count, 0) ?? 0,
    },
    {
      key: 'suggestions',
      icon: 'lightbulb-outline',
      label: tr(language, 'Sugerencias', 'Suggestions'),
    },
    {
      key: 'login',
      icon: isAuthenticated ? 'account-check-outline' : 'login',
      label: isAuthenticated ? (isAdmin ? tr(language, 'Administrar', 'Admin') : tr(language, 'Mi sesión', 'My session')) : tr(language, 'Iniciar sesión', 'Sign in'),
    },
  ];

  if (!isAuthenticated)
    return (
      <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background">
        <MaterialCommunityIcons name="account-lock-outline" size={58} color="#13bd83" />
        <Text className="mt-4 text-center text-2xl font-black text-ui-text dark:text-ui-dark-text">{tr(language, 'Tu perfil es personal', 'Your profile is personal')}</Text>
        <Text className="mb-6 mt-2 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{tr(language, 'Iniciá sesión para ver tus avistamientos, guardados, mensajes y publicaciones.', 'Sign in to see your sightings, saved places, messages and posts.')}</Text>
        <View className="items-center">
          <ProfileButton
            label={tr(language, 'Iniciar sesión o crear cuenta', 'Sign in or create account')}
            onPress={() =>
              router.push({
                pathname: '/(aux)/auth-modal',
                params: {
                  intent: tr(language, 'abrir tu perfil', 'open your profile'),
                },
              })
            }
          />
        </View>
      </View>
    );

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View className="mx-auto w-full max-w-5xl rounded-[24px] border border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <View className="items-center">
          <Pressable accessibilityLabel={tr(language, 'Editar foto de perfil', 'Edit profile photo')} className="relative" onPress={() => void chooseAvatar()}>
            {profileAvatarUrl ? (
              <Image cachePolicy="memory-disk" source={{ uri: profileAvatarUrl }} style={{ borderRadius: 40, height: 80, width: 80 }} />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary">
                <MaterialCommunityIcons name="account" size={40} color="white" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-ui-surface bg-ui-primary dark:border-ui-dark-surface dark:bg-ui-dark-primary">
              <MaterialCommunityIcons name="pencil" size={15} color="white" />
            </View>
          </Pressable>
          <View className="mt-4 w-full">
            <View className="flex-row items-center">
              <View className="min-w-0 flex-1">{editingProfile ? <TextInput accessibilityLabel={tr(language, 'Nickname', 'Nickname')} autoCapitalize="none" autoCorrect={false} className="rounded-xl bg-ui-muted px-3 py-2 text-2xl font-extrabold text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" maxLength={24} onChangeText={setUsername} placeholder={tr(language, 'Nickname', 'Nickname')} placeholderTextColor="#8f9bb2" value={username} /> : <Text className="text-2xl font-extrabold text-ui-text dark:text-ui-dark-text">{name}</Text>}</View>
              <Pressable accessibilityLabel={tr(language, 'Editar nickname', 'Edit nickname')} className="ml-2 rounded-full bg-ui-muted p-2 dark:bg-ui-dark-muted" onPress={() => setEditingProfile(true)}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#0B6B4F" />
              </Pressable>
            </View>
            <Text className="mt-1 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">@{displayProfile?.username || metadataUsername || tr(language, 'sin nickname', 'no nickname')}</Text>
            <View className="mt-2 flex-row items-center">
              {editingProfile ? <TextInput className="min-w-0 flex-1 rounded-xl bg-ui-muted px-3 py-2 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" multiline onChangeText={setBio} placeholder={tr(language, 'Descripción', 'Description')} placeholderTextColor="#8f9bb2" value={bio} /> : <Text className="flex-1 text-ui-primary dark:text-ui-dark-primary">{displayProfile?.bio || tr(language, 'Explorando Costa Rica', 'Exploring Costa Rica')}</Text>}
              <Pressable accessibilityLabel={tr(language, 'Editar descripción', 'Edit description')} className="ml-2 p-2" onPress={() => setEditingProfile(true)}>
                <MaterialCommunityIcons name="pencil-outline" size={19} color="#0B6B4F" />
              </Pressable>
            </View>
            <View className="mt-2 flex-row items-center">
              <MaterialCommunityIcons name="email-outline" size={18} color="#8f9bb2" />
              {editingProfile ? <TextInput className="ml-2 min-w-0 flex-1 rounded-xl bg-ui-muted px-3 py-2 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="email-address" onChangeText={setContactEmail} placeholder={tr(language, 'Correo de contacto', 'Contact email')} placeholderTextColor="#8f9bb2" value={contactEmail} /> : <Text className="ml-2 flex-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{displayProfile?.contact_email || session?.user.email || tr(language, 'Agregar correo de contacto', 'Add contact email')}</Text>}
              <Pressable accessibilityLabel={tr(language, 'Editar correo', 'Edit email')} className="ml-2 p-2" onPress={() => setEditingProfile(true)}>
                <MaterialCommunityIcons name="pencil-outline" size={19} color="#0B6B4F" />
              </Pressable>
            </View>
            {editingProfile || avatar ? (
              <View className="mt-3 flex-row gap-2">
                <ProfileButton label={busy ? tr(language, 'Guardando...', 'Saving...') : tr(language, 'Guardar', 'Save')} disabled={busy} onPress={saveProfile} />
                <ProfileButton
                  label={tr(language, 'Cancelar', 'Cancel')}
                  outline
                  onPress={() => {
                    setUsername(displayProfile?.username || '');
                    setBio(displayProfile?.bio || '');
                    setContactEmail(displayProfile?.contact_email || '');
                    setAvatar(undefined);
                    setEditingProfile(false);
                  }}
                />
              </View>
            ) : null}
            <View className="mt-3 flex-row flex-wrap gap-3">
              <Stat value={data ? data.followers.length : '—'} label={tr(language, 'seguidores', 'followers')} />
              <Stat value={data ? data.following.length : '—'} label={tr(language, 'siguiendo', 'following')} />
              <Stat value={data ? data.sightings.length : '—'} label={tr(language, 'avistamientos', 'sightings')} />
              <Stat value={data ? data.saved.length : '—'} label={tr(language, 'guardados', 'saved')} />
            </View>
          </View>
        </View>
        {Platform.OS === 'web' ? <Pressable accessibilityRole="link" className="mt-4 flex-row items-center justify-center rounded-2xl bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary" onPress={() => router.push('/subscriptions')}>
          <MaterialCommunityIcons name="crown-outline" size={20} color="white" />
          <Text className="ml-2 font-black text-white">{tr(language, 'Ver planes Pro', 'View Pro plans')}</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="button" className="mt-3 flex-row items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950" onPress={() => void signOut()}>
          <MaterialCommunityIcons name="logout" size={20} color="#dc2626" />
          <Text className="ml-2 font-black text-red-600 dark:text-red-400">{tr(language, 'Cerrar sesión', 'Sign out')}</Text>
        </Pressable>
        <View className="mt-4 gap-2">
          {tabs.map((tab) => (
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: section === tab.key }} className={section === tab.key ? 'flex-row items-center rounded-2xl bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'flex-row items-center rounded-2xl border border-ui-border bg-ui-surface px-4 py-3 dark:border-ui-dark-border dark:bg-ui-dark-surface'} key={tab.key} onPress={() => setSection((current) => (current === tab.key ? undefined : tab.key))}>
              <MaterialCommunityIcons name={tab.icon} size={21} color={section === tab.key ? 'white' : '#9eabc4'} />
              <Text className={section === tab.key ? 'ml-3 flex-1 font-black text-white' : 'ml-3 flex-1 font-black text-ui-text-muted dark:text-ui-dark-text-muted'}>{tab.label}</Text>
              {tab.count !== undefined ? <Text className={section === tab.key ? 'font-black text-white' : 'font-black text-ui-primary dark:text-ui-dark-primary'}>{tab.count}</Text> : null}
              <MaterialCommunityIcons name={section === tab.key ? 'chevron-up' : 'chevron-right'} size={20} color={section === tab.key ? 'white' : '#9eabc4'} />
            </Pressable>
          ))}
        </View>
      </View>
      <View className="mx-auto mt-5 w-full max-w-5xl rounded-[30px] border border-ui-border dark:border-ui-dark-border bg-ui-surface dark:bg-ui-dark-surface p-5">
        {section && section !== 'login' && section !== 'suggestions' && !data && !error ? <ActivityIndicator color="#13bd83" /> : null}
        {error ? <Text className="text-red-400">{error}</Text> : null}
        {data && section === 'notifications' ? (
          <View>
            <View className="mb-4 flex-row items-center justify-between">
              <Title>{tr(language, 'Notificaciones', 'Notifications')}</Title>
              <ProfileButton
                label={tr(language, 'Marcar todas como leídas', 'Mark all as read')}
                disabled={busy || !data.notifications.some((item) => !item.read_status)}
                onPress={() =>
                  void run(async () => {
                    await markAllNotificationsRead();
                    await load();
                  })
                }
              />
            </View>
            <ListEmpty empty={!data.notifications.length} language={language}>
              {data.notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  language={language}
                  notificationType={notificationTypes.data?.find((option) => option.id === item.type)}
                  busy={busy}
                  onRead={() =>
                    void run(async () => {
                      await markNotificationRead(item.id);
                      await load();
                    })
                  }
                />
              ))}
            </ListEmpty>
          </View>
        ) : null}
        {data && section === 'community' ? (
          <View>
            <Title>{tr(language, 'Comunidad & Exploradores', 'Community & Explorers')}</Title>
            <Text className="mt-3 text-ui-text-muted dark:text-ui-dark-text-muted">
              {data.followers.length} {tr(language, 'seguidores', 'followers')} · {data.following.length} {tr(language, 'siguiendo', 'following')}
            </Text>
          </View>
        ) : null}
        {data && section === 'sightings' ? (
          <ListEmpty empty={!data.sightings.length} language={language}>
            {data.sightings.map((photo) => (
              <View className="mb-4 overflow-hidden rounded-2xl bg-ui-muted dark:bg-ui-dark-muted" key={photo.id}>
                <Image source={{ uri: photo.image_url }} contentFit="cover" style={{ height: 220, width: '100%' }} />
                <View className="p-4">
                  <Text className="font-bold text-ui-text dark:text-ui-dark-text">{photo.fauna_species?.common_name_es || tr(language, 'Avistamiento de fauna', 'Wildlife sighting')}</Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <ProfileButton label={tr(language, 'Comunidad Viajera', 'Traveler Community')} onPress={() => void shareSightingToWall(userId, photo.image_url, photo.caption)} />
                    <ProfileButton
                      label={tr(language, 'WhatsApp / Más', 'WhatsApp / More')}
                      outline
                      onPress={() =>
                        void Share.share({
                          message: `${photo.caption || tr(language, 'Mirá mi avistamiento en Descubriendo CR', 'See my sighting on Descubriendo CR')}\n${photo.image_url}`,
                          url: photo.image_url,
                        })
                      }
                    />
                  </View>
                </View>
              </View>
            ))}
          </ListEmpty>
        ) : null}
        {data && section === 'saved' ? (
          <ListEmpty empty={!data.saved.length} language={language}>
            {data.saved.map((place) => (
              <Row key={place.id} icon="map-marker-outline" title={place.name} date={place.province} imageUrl={place.cover_image_url} language={language} />
            ))}
          </ListEmpty>
        ) : null}
        {data && section === 'messages' ? conversations.isPending ? <ActivityIndicator color="#13bd83" /> : <MessagesPanel conversations={conversations.data ?? []} language={language} userId={userId} userAvatarUrl={data.profile?.avatar_url ?? avatarUrl} busy={busy} refresh={async () => { await Promise.all([load(), conversations.refetch()]); }} run={run} /> : null}
        {section === 'suggestions' ? (
          <View>
            <Title>{tr(language, 'Sugerencias para el creador', 'Suggestions for the creator')}</Title>
            <Text className="mb-4 mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{tr(language, 'Tus ideas llegarán directamente al panel del administrador.', 'Your ideas will go directly to the admin dashboard.')}</Text>
            <Field value={suggestion} onChangeText={setSuggestion} placeholder={tr(language, 'Contanos qué mejorarías', 'Tell us what you would improve')} multiline />
            <ProfileButton
              label={busy ? tr(language, 'Enviando...', 'Sending...') : tr(language, 'Enviar sugerencia', 'Send suggestion')}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  if (suggestion.trim().length < 3) throw new Error(tr(language, 'Escribí una sugerencia.', 'Write a suggestion.'));
                  await sendCreatorSuggestion(userId, suggestion);
                  setSuggestion('');
                  Alert.alert(tr(language, 'Gracias', 'Thank you'), tr(language, 'Tu sugerencia fue enviada al administrador.', 'Your suggestion was sent to the administrator.'));
                })
              }
            />
          </View>
        ) : null}
        {section === 'login' && !isAuthenticated ? (
          <View>
            <Title>{tr(language, 'Iniciar sesión', 'Sign in')}</Title>
            <Text className="mb-4 mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{tr(language, 'Ingresá con tu correo y contraseña. Las cuentas autorizadas como administrador accederán automáticamente a las herramientas de moderación.', 'Sign in with your email and password. Authorized admin accounts automatically receive access to moderation tools.')}</Text>
            <Field value={adminEmail} onChangeText={setAdminEmail} placeholder={tr(language, 'Correo electrónico', 'Email')} keyboardType="email-address" />
            <Field value={adminPassword} onChangeText={setAdminPassword} placeholder={tr(language, 'Contraseña', 'Password')} secureTextEntry />
            <ProfileButton
              label={busy ? tr(language, 'Ingresando...', 'Signing in...') : tr(language, 'Iniciar sesión', 'Sign in')}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await signIn(adminEmail, adminPassword);
                  setAdminPassword('');
                })
              }
            />
          </View>
        ) : null}
        {section === 'login' && isAuthenticated && !isAdmin ? (
          <View>
            <Title>{tr(language, 'Sesión iniciada', 'Signed in')}</Title>
            <Text className="mb-4 mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{session?.user.email}</Text>
            <ProfileButton label={tr(language, 'Cerrar sesión', 'Sign out')} outline onPress={() => void signOut()} />
          </View>
        ) : null}
        {section === 'login' && isAdmin ? <AdminPanel data={adminDashboard.data} busy={busy} language={language} refresh={async () => { await Promise.all([load(), adminDashboard.refetch(), queryClient.invalidateQueries({ queryKey: ['places'] }), queryClient.invalidateQueries({ queryKey: ['explore-places'] })]); }} run={run} signOut={signOut} /> : null}
      </View>
      <Pressable accessibilityRole="link" className="mx-auto mt-10 min-h-11 w-full max-w-5xl items-center justify-center border-t border-red-200 pt-5 dark:border-red-900" onPress={() => router.push('/delete-account' as never)}><Text className="font-bold text-red-600 dark:text-red-400">{tr(language, 'Eliminar cuenta y datos', 'Delete account and data')}</Text></Pressable>
    </ScrollView>
  );
}

function AdminPanel({ data, busy, language, refresh, run, signOut }: { data?: AdminDashboard; busy: boolean; language: 'es' | 'en'; refresh: () => Promise<void>; run: (action: () => Promise<void>) => Promise<void>; signOut: () => Promise<void> }) {
  const addPhoto = (destinationId: string, count: number) =>
    void run(async () => {
      if (count >= 10) throw new Error(tr(language, 'Este sitio ya tiene el máximo de 10 fotos.', 'This place already has the maximum of 10 photos.'));
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(tr(language, 'Necesitamos permiso para elegir una foto del sitio.', 'Photo library permission is required.'));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        exif: false,
      });
      if (result.canceled) return;
      await addDestinationPhoto(destinationId, result.assets[0], count);
      await refresh();
      Alert.alert(tr(language, 'Fotos del sitio', 'Place photos'), tr(language, 'La foto se agregó y quedó como portada activa del sitio.', 'The photo was added and is now the place’s active cover.'));
    });
  const setSanctuaryPhoto = (sanctuaryId: string) =>
    void run(async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(tr(language, 'Necesitamos permiso para elegir una foto del santuario.', 'Photo library permission is required.'));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        exif: false,
      });
      if (result.canceled) return;
      await setSanctuaryCover(sanctuaryId, result.assets[0]);
      await refresh();
      Alert.alert(tr(language, 'Santuarios de fauna', 'Wildlife sanctuaries'), tr(language, 'La foto fue guardada.', 'The photo was saved.'));
    });
  if (!data) return <ActivityIndicator color="#13bd83" />;
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Title>{tr(language, 'Panel del administrador', 'Admin dashboard')}</Title>
        <ProfileButton label={tr(language, 'Salir', 'Sign out')} outline onPress={() => void signOut()} />
      </View>
      <View className="mt-5 flex-row items-center rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft">
        <MaterialCommunityIcons name="clipboard-check-outline" size={28} color="#087443" />
        <View className="ml-3 flex-1">
          <Text className="font-black text-ui-text dark:text-ui-dark-text">{tr(language, 'Pendientes de aprobación', 'Pending approvals')}</Text>
          <Text className="text-sm text-ui-text-muted dark:text-ui-dark-text-muted">
            {data.pendingSubmissions.length + data.commercialClaims.length + data.reports.length + data.suggestions.filter((item) => item.status !== 'resolved').length} {tr(language, 'elementos requieren revisión', 'items require review')}
          </Text>
        </View>
      </View>
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Nuevas inserciones', 'New submissions')}</Text>
      <ListEmpty empty={!data.pendingSubmissions.length} language={language}>
        {data.pendingSubmissions.map((item) => (
          <View className="mb-3 rounded-2xl border border-ui-border bg-ui-muted p-4 dark:border-ui-dark-border dark:bg-ui-dark-muted" key={`${item.kind}-${item.id}`}>
            <Text className="font-black text-ui-text dark:text-ui-dark-text">{item.title}</Text>
            <Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{item.detail}</Text>
            <Text className="mt-1 text-xs font-bold text-ui-primary">{new Date(item.created_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US')}</Text>
            <View className="mt-3 flex-row gap-2">
              <ProfileButton label={tr(language, 'Aprobar', 'Approve')} disabled={busy} onPress={() => void run(async () => { await reviewUserSubmission(item.kind, item.id, 'approved'); await refresh(); })} />
              <ProfileButton label={tr(language, 'Rechazar', 'Reject')} outline disabled={busy} onPress={() => void run(async () => { await reviewUserSubmission(item.kind, item.id, 'rejected'); await refresh(); })} />
            </View>
          </View>
        ))}
      </ListEmpty>
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Reclamos de comercios', 'Business ownership claims')}</Text>
      <ListEmpty empty={!data.commercialClaims.length} language={language}>
        {data.commercialClaims.map((claim) => (
          <View className="mb-3 rounded-2xl border border-ui-border bg-ui-muted p-4 dark:border-ui-dark-border dark:bg-ui-dark-muted" key={claim.id}>
            <View className="flex-row items-start">
              <MaterialCommunityIcons name="store-check-outline" size={24} color="#087443" />
              <View className="ml-3 flex-1">
                <Text className="font-black text-ui-text dark:text-ui-dark-text">{claim.service_title}</Text>
                <Text className="mt-1 text-xs font-bold text-ui-primary">
                  {claim.claimant_name} · {new Date(claim.created_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US')}
                </Text>
                {claim.message ? <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{claim.message}</Text> : null}
              </View>
            </View>
            <View className="mt-3 flex-row gap-2">
              <ProfileButton
                label={tr(language, 'Aprobar', 'Approve')}
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await reviewCommercialClaim(claim.id, 'approved');
                    await refresh();
                  })
                }
              />
              <ProfileButton
                label={tr(language, 'Rechazar', 'Reject')}
                outline
                disabled={busy}
                onPress={() =>
                  Alert.alert(tr(language, 'Rechazar reclamo', 'Reject claim'), tr(language, 'El usuario no obtendrá control sobre este comercio.', 'The user will not receive control of this business.'), [
                    { text: tr(language, 'Cancelar', 'Cancel') },
                    {
                      text: tr(language, 'Rechazar', 'Reject'),
                      style: 'destructive',
                      onPress: () =>
                        void run(async () => {
                          await reviewCommercialClaim(claim.id, 'rejected');
                          await refresh();
                        }),
                    },
                  ])
                }
              />
            </View>
          </View>
        ))}
      </ListEmpty>
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Sugerencias recibidas', 'Received suggestions')}</Text>
      <ListEmpty empty={!data.suggestions.length} language={language}>
        {data.suggestions.map((item) => (
          <View className="mb-3 rounded-2xl bg-ui-muted p-4 dark:bg-ui-dark-muted" key={item.id}>
            <View className="flex-row items-start">
              <MaterialCommunityIcons name="lightbulb-outline" size={24} color="#087443" />
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-ui-text dark:text-ui-dark-text">
                  {profileName(item.user)}: {item.message}
                </Text>
                <Text className="mt-1 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">
                  {new Date(item.created_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US')} · {suggestionStatusLabel(item.status, language)}
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {item.status === 'new' ? (
                <ProfileButton
                  label={tr(language, 'Marcar leída', 'Mark as read')}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await updateCreatorSuggestionStatus(item.id, 'read');
                      await refresh();
                    })
                  }
                />
              ) : null}
              {item.status === 'read' ? (
                <ProfileButton
                  label={tr(language, 'Resolver', 'Resolve')}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await updateCreatorSuggestionStatus(item.id, 'resolved');
                      await refresh();
                    })
                  }
                />
              ) : null}
            </View>
          </View>
        ))}
      </ListEmpty>
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Reportes de información', 'Information reports')}</Text>
      <ListEmpty empty={!data.reports.length} language={language}>
        {data.reports.map((report) => (
          <View className="mb-3 rounded-2xl bg-ui-muted p-4 dark:bg-ui-dark-muted" key={report.id}>
            <Text className="font-black text-ui-text dark:text-ui-dark-text">{report.target_label}</Text>
            <Text className="mt-1 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">
              {reportTypeLabel(report.report_type, language)} · {reportStatusLabel(report.status, language)}
            </Text>
            {report.details ? <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{report.details}</Text> : null}
            <View className="mt-3 flex-row flex-wrap gap-2">
              {report.status === 'open' ? (
                <ProfileButton
                  label={tr(language, 'Marcar leída', 'Mark as read')}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await updateInformationReportStatus(report.id, 'reviewing');
                      await refresh();
                    })
                  }
                />
              ) : null}
              <ProfileButton
                label={tr(language, 'Resolver', 'Resolve')}
                disabled={busy || report.status === 'resolved'}
                onPress={() =>
                  void run(async () => {
                    await updateInformationReportStatus(report.id, 'resolved');
                    await refresh();
                  })
                }
              />
              <ProfileButton
                label={tr(language, 'Descartar', 'Dismiss')}
                outline
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await updateInformationReportStatus(report.id, 'dismissed');
                    await refresh();
                  })
                }
              />
            </View>
          </View>
        ))}
      </ListEmpty>
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Publicaciones recientes', 'Recent posts')}</Text>
      <ListEmpty empty={!data.posts.length} language={language}>
        {data.posts.map((post) => (
          <View className="mb-3 rounded-2xl bg-ui-muted dark:bg-ui-dark-muted p-4" key={post.id}>
            <Text className="font-semibold text-ui-text dark:text-ui-dark-text">
              {post.user?.full_name || post.user?.username || tr(language, 'Viajero', 'Traveler')}: {post.body}
            </Text>
            <Pressable
              className="mt-3 self-start"
              disabled={busy}
              onPress={() =>
                Alert.alert(tr(language, 'Eliminar publicación', 'Delete post'), tr(language, 'Todos los usuarios dejarán de verla.', 'It will no longer be visible to any user.'), [
                  { text: tr(language, 'Cancelar', 'Cancel') },
                  {
                    text: tr(language, 'Eliminar', 'Delete'),
                    style: 'destructive',
                    onPress: () =>
                      void run(async () => {
                        await deleteTravelerPost(post.id);
                        await refresh();
                      }),
                  },
                ])
              }
            >
              <Text className="font-black text-red-400">{tr(language, 'Eliminar para todos', 'Delete for everyone')}</Text>
            </Pressable>
          </View>
        ))}
      </ListEmpty>
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Santuarios de fauna', 'Wildlife sanctuaries')}</Text>
      {data.sanctuaries.map((sanctuary) => (
        <View className="mb-3 flex-row items-center rounded-2xl bg-ui-muted p-4 dark:bg-ui-dark-muted" key={sanctuary.id}>
          {sanctuary.cover_image_url ? (
            <Image source={{ uri: sanctuary.cover_image_url }} style={{ borderRadius: 12, height: 52, width: 70 }} />
          ) : (
            <View className="h-[52px] w-[70px] items-center justify-center rounded-xl bg-ui-primary-soft">
              <MaterialCommunityIcons name="image-plus" size={24} color="#0B6B4F" />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-ui-text dark:text-ui-dark-text">{sanctuary.name}</Text>
            <Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{sanctuary.province}</Text>
          </View>
          <ProfileButton label={sanctuary.cover_image_url ? tr(language, 'Cambiar', 'Replace') : tr(language, 'Agregar', 'Add')} disabled={busy} onPress={() => setSanctuaryPhoto(sanctuary.id)} />
        </View>
      ))}
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Destinos aportados por usuarios', 'User-contributed destinations')}</Text>
      <ListEmpty empty={!data.communityDestinations.length} language={language}>
        {data.communityDestinations.map((place) => (
          <View className="mb-3 rounded-2xl bg-ui-muted p-4 dark:bg-ui-dark-muted" key={place.id}>
            <Text className="font-semibold text-ui-text dark:text-ui-dark-text">{place.name}</Text>
            <Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">
              {place.province} · {place.category}
            </Text>
            <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{place.description}</Text>
          </View>
        ))}
      </ListEmpty>
      <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">{tr(language, 'Fotos de sitios (máximo 10)', 'Place photos (maximum 10)')}</Text>
      <Text className="mb-3 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{tr(language, 'Los sitios sin fotos aparecen primero. Cada foto nueva queda como portada activa.', 'Places without photos appear first. Each new photo becomes the active cover.')}</Text>
      {data.destinations.map((place) => {
        const photos = data.photos.filter((photo) => photo.destination_id === place.id);
        return (
          <View className="mb-3 rounded-2xl bg-ui-muted dark:bg-ui-dark-muted p-4" key={place.id}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-semibold text-ui-text dark:text-ui-dark-text">{place.name}</Text>
                <Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">
                  {place.province} · {photos.length}/10
                </Text>
              </View>
              <ProfileButton label={tr(language, 'Agregar', 'Add')} disabled={busy || photos.length >= 10} onPress={() => void addPhoto(place.id, photos.length)} />
            </View>
            <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() =>
                    Alert.alert(tr(language, 'Eliminar foto', 'Delete photo'), tr(language, '¿Quitar esta foto del sitio?', 'Remove this photo from the place?'), [
                      { text: tr(language, 'Cancelar', 'Cancel') },
                      {
                        text: tr(language, 'Eliminar', 'Delete'),
                        style: 'destructive',
                        onPress: () =>
                          void run(async () => {
                            await deleteDestinationPhoto(photo.id, photo.image_url);
                            await refresh();
                          }),
                      },
                    ])
                  }
                >
                  <Image source={{ uri: photo.image_url }} style={{ borderRadius: 12, height: 90, width: 120 }} />
                  <View className="absolute right-1 top-1 rounded-full bg-black/70 p-1">
                    <MaterialCommunityIcons name="close" size={16} color="white" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

function NotificationRow({ item, language, notificationType, busy, onRead }: { item: NotificationItem; language: 'es' | 'en'; notificationType?: AppOption; busy: boolean; onRead: () => void }) {
  const actor = Array.isArray(item.actor) ? item.actor[0] : item.actor;
  const unread = !item.read_status;
  return (
    <View className={unread ? 'mb-3 rounded-2xl border border-ui-primary/30 bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft' : 'mb-3 rounded-2xl bg-ui-muted p-4 dark:bg-ui-dark-muted'}>
      <View className="flex-row items-start">
        <MaterialCommunityIcons name={notificationType?.icon ?? (unread ? 'bell-ring-outline' : 'bell-outline')} size={24} color="#0B6B4F" />
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-ui-text dark:text-ui-dark-text">{`${actor?.full_name || actor?.username || tr(language, 'Un viajero', 'A traveler')} ${notificationType ? (language === 'es' ? notificationType.label_es : notificationType.label_en) : tr(language, 'generó una actividad nueva', 'created new activity')}`}</Text>
          <Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(item.created_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US')}</Text>
        </View>
        {unread ? <ProfileButton label={tr(language, 'Marcar leída', 'Mark read')} disabled={busy} onPress={onRead} /> : <Text className="text-xs font-bold text-ui-primary dark:text-ui-dark-primary">{tr(language, 'Leída', 'Read')}</Text>}
      </View>
    </View>
  );
}

function MessagesPanel({ conversations, language, userId, userAvatarUrl, busy, refresh, run }: { conversations: PrivateConversation[]; language: 'es' | 'en'; userId: string; userAvatarUrl: string | null; busy: boolean; refresh: () => Promise<void>; run: (action: () => Promise<void>) => Promise<void> }) {
  const [activePartnerId, setActivePartnerId] = useState<string>();
  const [reply, setReply] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const active = conversations.find((conversation) => conversation.partner_id === activePartnerId);
  const openConversation = (conversation: PrivateConversation) =>
    void run(async () => {
      setActivePartnerId(conversation.partner_id);
      const unread = conversation.messages.filter((item) => item.recipient_id === userId && !item.read_status);
      if (unread.length) {
        await Promise.all(unread.map((item) => markMessageRead(item.id)));
        await refresh();
      }
    });
  const send = (attachment?: { uri: string; type: 'image' | 'audio'; durationMs?: number; width?: number }) =>
    void run(async () => {
      if (!active || (!reply.trim() && !attachment)) return;
      await sendTravelerMessage(userId, active.partner_id, reply, attachment);
      setReply('');
      await refresh();
    });
  const chooseImage = () =>
    void run(async () => {
      if (!active) return;
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(tr(language, 'Permití el acceso a fotos para enviar una imagen.', 'Allow photo access to send an image.'));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        exif: false,
      });
      if (!result.canceled)
        await sendTravelerMessage(userId, active.partner_id, reply, {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          type: 'image',
        });
      setReply('');
      await refresh();
    });
  const record = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
      if (recorder.uri)
        send({
          uri: recorder.uri,
          type: 'audio',
          durationMs: recorderState.durationMillis,
        });
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', tr(language, 'Permití el micrófono para grabar un audio.', 'Allow microphone access to record audio.'));
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };
  if (active)
    return (
      <View>
        <View className="mb-4 flex-row items-center">
          <Pressable accessibilityLabel={tr(language, 'Volver a conversaciones', 'Back to conversations')} className="mr-2 rounded-full bg-ui-muted p-2 dark:bg-ui-dark-muted" onPress={() => setActivePartnerId(undefined)}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0B6B4F" />
          </Pressable>
          <ChatAvatar url={active.partner_avatar_url} name={active.partner_name} />
          <Text className="ml-3 text-lg font-black text-ui-text dark:text-ui-dark-text">{active.partner_name}</Text>
        </View>
        <ScrollView className="max-h-96 rounded-2xl bg-ui-muted p-3 dark:bg-ui-dark-muted">
          {active.messages.map((item) => (
            <MessageBubble
              key={item.id}
              message={item}
              mine={item.sender_id === userId}
              language={language}
              userId={userId}
              avatarUrl={item.sender_id === userId ? userAvatarUrl : active.partner_avatar_url}
              senderName={item.sender_id === userId ? tr(language, 'Vos', 'You') : active.partner_name}
              onReact={(emoji) =>
                void run(async () => {
                  await toggleTravelerMessageReaction(item.id, emoji);
                  await refresh();
                })
              }
            />
          ))}
        </ScrollView>
        <View className="mt-3 flex-row items-end gap-2">
          <ChatAvatar url={userAvatarUrl} name={tr(language, 'Vos', 'You')} />
          <Pressable accessibilityLabel={tr(language, 'Enviar imagen', 'Send image')} className="rounded-full bg-ui-primary-soft p-3 dark:bg-ui-dark-primary-soft" disabled={busy || recorderState.isRecording} onPress={chooseImage}>
            <MaterialCommunityIcons name="image-plus" size={22} color="#0B6B4F" />
          </Pressable>
          <TextInput className="min-h-12 flex-1 rounded-2xl border border-ui-border bg-ui-surface px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-surface dark:text-ui-dark-text" editable={!busy && !recorderState.isRecording} onChangeText={setReply} placeholder={recorderState.isRecording ? tr(language, 'Grabando audio…', 'Recording audio…') : tr(language, 'Escribí una respuesta… 😀', 'Write a reply… 😀')} placeholderTextColor="#8f9bb2" value={reply} multiline />
          <Pressable accessibilityLabel={recorderState.isRecording ? tr(language, 'Enviar audio', 'Send audio') : tr(language, 'Grabar audio', 'Record audio')} className={recorderState.isRecording ? 'rounded-full bg-red-500 p-3' : 'rounded-full bg-ui-primary p-3'} disabled={busy} onPress={() => void record()}>
            <MaterialCommunityIcons name={recorderState.isRecording ? 'stop' : 'microphone'} size={22} color="white" />
          </Pressable>
          {reply.trim() ? (
            <Pressable accessibilityLabel={tr(language, 'Enviar mensaje', 'Send message')} className="rounded-full bg-ui-primary p-3" disabled={busy} onPress={() => send()}>
              <MaterialCommunityIcons name="send" size={21} color="white" />
            </Pressable>
          ) : null}
        </View>
        <View className="mt-2 flex-row gap-2">
          {['😀', '❤️', '👍', '😂'].map((emoji) => (
            <Pressable key={emoji} onPress={() => setReply((value) => `${value}${emoji}`)}>
              <Text className="text-xl">{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  return (
    <View>
      <Title>{tr(language, 'Conversaciones', 'Conversations')}</Title>
      <ListEmpty empty={!conversations.length} language={language}>
        {conversations.map((conversation) => {
          const last = conversation.messages[conversation.messages.length - 1];
          const preview = last?.media_type === 'image' ? '📷 Foto' : last?.media_type === 'audio' ? '🎙️ Audio' : last?.body;
          return (
            <Pressable className="mb-3 flex-row items-center rounded-2xl bg-ui-muted p-4 dark:bg-ui-dark-muted" disabled={busy} key={conversation.partner_id} onPress={() => openConversation(conversation)}>
              <ChatAvatar url={conversation.partner_avatar_url} name={conversation.partner_name} />
              <View className="ml-3 flex-1">
                <Text className="font-black text-ui-text dark:text-ui-dark-text">{conversation.partner_name}</Text>
                <Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>
                  {preview}
                </Text>
              </View>
              {conversation.unread_count ? (
                <View className="ml-2 min-w-7 items-center rounded-full bg-ui-primary px-2 py-1">
                  <Text className="text-xs font-black text-white">{conversation.unread_count}</Text>
                </View>
              ) : null}
              <MaterialCommunityIcons className="ml-2" name="chevron-right" size={20} color="#9eabc4" />
            </Pressable>
          );
        })}
      </ListEmpty>
    </View>
  );
}

function ChatAvatar({ url, name }: { url: string | null; name: string }) {
  return url ? (
    <Image cachePolicy="none" source={{ uri: url }} style={{ borderRadius: 22, height: 44, width: 44 }} />
  ) : (
    <View className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary">
      <Text className="font-black text-white">{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}
function AudioMessage({ url, mine }: { url: string; mine: boolean }) {
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);
  return (
    <Pressable className="mt-1 flex-row items-center" onPress={() => (status.playing ? player.pause() : player.play())}>
      <MaterialCommunityIcons name={status.playing ? 'pause-circle' : 'play-circle'} size={32} color={mine ? 'white' : '#0B6B4F'} />
      <Text className={mine ? 'ml-1 text-white' : 'ml-1 text-ui-primary'}>{status.duration ? `${Math.ceil(status.duration)} s` : 'Audio'}</Text>
    </Pressable>
  );
}
function MessageBubble({ message: item, mine, language, userId, avatarUrl, senderName, onReact }: { message: PrivateMessage; mine: boolean; language: 'es' | 'en'; userId: string; avatarUrl: string | null; senderName: string; onReact: (emoji: string) => void }) {
  const mediaOnly = item.body === '📷 Foto' || item.body === '🎙️ Audio';
  const reactions = [...new Set(item.reactions.map((reaction) => reaction.emoji))];
  return (
    <View className={mine ? 'mb-3 flex-row self-end' : 'mb-3 flex-row self-start'} style={{ maxWidth: '92%' }}>
      {!mine ? (
        <View className="mr-2 self-end">
          <ChatAvatar url={avatarUrl} name={senderName} />
        </View>
      ) : null}
      <View className={mine ? 'rounded-2xl rounded-br-sm bg-ui-primary px-4 py-3' : 'rounded-2xl rounded-bl-sm bg-ui-surface px-4 py-3 dark:bg-ui-dark-surface'} style={{ maxWidth: '85%' }}>
        {item.media_type === 'image' && item.media_url ? <Image source={{ uri: item.media_url }} contentFit="cover" style={{ borderRadius: 12, height: 210, width: 240 }} /> : null}
        {item.media_type === 'audio' && item.media_url ? <AudioMessage url={item.media_url} mine={mine} /> : null}
        {!mediaOnly ? <Text className={mine ? 'mt-1 text-white' : 'mt-1 text-ui-text dark:text-ui-dark-text'}>{item.body}</Text> : null}
        {item.media_type === 'image' ? (
          <View className="mt-2 flex-row items-center gap-2">
            <Pressable accessibilityLabel={tr(language, 'Reaccionar a la foto', 'React to photo')} onPress={() => onReact('❤️')}>
              <Text className="text-lg">❤️</Text>
            </Pressable>
            {reactions.map((emoji) => (
              <Pressable className="rounded-full bg-black/10 px-2 py-1" key={emoji} onPress={() => onReact(emoji)}>
                <Text>
                  {emoji} {item.reactions.filter((reaction) => reaction.emoji === emoji).length}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text className={mine ? 'mt-1 text-right text-[10px] text-white/70' : 'mt-1 text-[10px] text-ui-text-muted dark:text-ui-dark-text-muted'}>{new Date(item.created_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US')}</Text>
      </View>
      {mine ? (
        <View className="ml-2 self-end">
          <ChatAvatar url={avatarUrl} name={senderName} />
        </View>
      ) : null}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput className="mb-3 rounded-control border border-ui-border bg-ui-muted px-4 py-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" placeholderTextColor="#8f9bb2" {...props} />;
}
function ProfileButton({ label, onPress, outline, disabled }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) {
  return (
    <Pressable className={outline ? 'self-start rounded-full border border-ui-primary dark:border-ui-dark-primary px-5 py-3' : 'self-start rounded-full bg-ui-primary dark:bg-ui-dark-primary px-5 py-3'} disabled={disabled} onPress={onPress}>
      <Text className={outline ? 'font-black text-ui-primary dark:text-ui-dark-primary' : 'font-black text-white'}>{label}</Text>
    </Pressable>
  );
}
function Title({ children }: { children: ReactNode }) {
  return <Text className="text-xl font-bold text-ui-text dark:text-ui-dark-text">{children}</Text>;
}
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <Text className="font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">
      <Text className="text-ui-text dark:text-ui-dark-text">{value}</Text> {label}
    </Text>
  );
}
function Row({ icon, title, date, imageUrl, language = 'es' }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; date: string; imageUrl?: string | null; language?: 'es' | 'en' }) {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl bg-ui-muted dark:bg-ui-dark-muted p-4">
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} contentFit="cover" style={{ borderRadius: 12, height: 52, width: 70 }} />
      ) : (
        <View className="h-[52px] w-[70px] items-center justify-center rounded-xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
          <MaterialCommunityIcons name={icon} size={24} color="#0B6B4F" />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-ui-text dark:text-ui-dark-text">{title}</Text>
        <Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{date.includes('T') ? new Date(date).toLocaleString(language === 'es' ? 'es-CR' : 'en-US') : date}</Text>
      </View>
    </View>
  );
}
function ListEmpty({ empty, children, language = 'es' }: { empty: boolean; children: ReactNode; language?: 'es' | 'en' }) {
  return <View>{empty ? <Text className="py-8 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{tr(language, 'Todavía no hay actividad aquí.', 'There is no activity here yet.')}</Text> : children}</View>;
}
function suggestionStatusLabel(status: string, language: 'es' | 'en') {
  return tr(language, status === 'new' ? 'Nueva' : status === 'read' ? 'Leída' : 'Resuelta', status === 'new' ? 'New' : status === 'read' ? 'Read' : 'Resolved');
}
function reportStatusLabel(status: string, language: 'es' | 'en') {
  return tr(language, status === 'open' ? 'Pendiente' : status === 'reviewing' ? 'Leída' : status === 'resolved' ? 'Resuelta' : 'Descartada', status === 'open' ? 'Pending' : status === 'reviewing' ? 'Read' : status === 'resolved' ? 'Resolved' : 'Dismissed');
}
function message(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'object' && reason !== null && 'message' in reason && typeof reason.message === 'string') return reason.message;
  return 'Ocurrió un error inesperado.';
}
function profileName(value: { full_name?: string | null; username?: string | null } | { full_name?: string | null; username?: string | null }[] | null) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || profile?.username || 'Viajero';
}
function tr(language: 'es' | 'en', es: string, en: string) {
  return language === 'es' ? es : en;
}
