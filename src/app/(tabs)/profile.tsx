import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { addDestinationPhoto, deleteDestinationPhoto, deleteTravelerPost, getAdminDashboard, getSocialProfile, sendCreatorSuggestion, shareSightingToWall, updateTravelerProfile } from '@/lib/social-profile';
import { useApp } from '@/providers/app-provider';

type Dashboard = Awaited<ReturnType<typeof getSocialProfile>>;
type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
type Section = 'notifications' | 'community' | 'sightings' | 'saved' | 'messages' | 'suggestions' | 'login';

export default function ProfileScreen() {
  const { isAdmin, isAuthenticated, language, session, setAvatarUrl, signIn, signOut } = useApp();
  const [section, setSection] = useState<Section>('notifications');
  const [data, setData] = useState<Dashboard>();
  const [admin, setAdmin] = useState<AdminDashboard>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset>();
  const [editingProfile, setEditingProfile] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const userId = session!.user.id;

  const load = useCallback(async () => {
    try {
      setError(undefined);
      const next = await getSocialProfile(userId);
      setData(next); setBio(next.profile?.bio || ''); setContactEmail(next.profile?.contact_email || ''); setAvatarUrl(next.profile?.avatar_url ?? null);
      if (isAdmin) setAdmin(await getAdminDashboard());
    } catch (reason) { setError(message(reason)); }
  }, [isAdmin, setAvatarUrl, userId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch (reason) { Alert.alert('Descubriendo CR', message(reason)); }
    finally { setBusy(false); }
  };
  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Perfil', 'Necesitamos permiso para elegir una foto.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled) setAvatar(result.assets[0]);
  };
  const saveProfile = () => void run(async () => {
    await updateTravelerProfile(userId, { bio, contactEmail, avatar });
    setAvatar(undefined);
    setEditingProfile(false);
    await load();
    Alert.alert('Perfil', 'Tus cambios fueron guardados.');
  });
  const name = data?.profile?.full_name || data?.profile?.username || (language === 'es' ? 'Viajero invitado' : 'Guest traveler');
  const tabs: { key: Section; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; count?: number }[] = [
    { key: 'notifications', icon: 'bell-outline', label: 'Notificaciones', count: data?.notifications.filter((n) => !n.read_status).length ?? 0 },
    { key: 'community', icon: 'account-group-outline', label: 'Comunidad' },
    { key: 'sightings', icon: 'camera-outline', label: 'Mis avistamientos', count: data?.sightings.length ?? 0 },
    { key: 'saved', icon: 'heart-outline', label: 'Guardados', count: data?.saved.length ?? 0 },
    { key: 'messages', icon: 'message-outline', label: 'Mensajes', count: data?.messages.filter((m) => !m.read_status).length ?? 0 },
    { key: 'suggestions', icon: 'lightbulb-outline', label: 'Sugerencias' },
    { key: 'login', icon: isAuthenticated ? 'account-check-outline' : 'login', label: isAuthenticated ? (isAdmin ? 'Administrar' : 'Mi sesión') : 'Iniciar sesión' },
  ];

  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
    <View className="mx-auto w-full max-w-5xl rounded-[24px] border border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface"><View className="flex-row items-start">
      <Pressable accessibilityLabel="Editar foto de perfil" className="relative" onPress={() => void chooseAvatar()}>
        {avatar ? <Image source={{ uri: avatar.uri }} style={{ borderRadius: 40, height: 80, width: 80 }} /> : data?.profile?.avatar_url ? <Image source={{ uri: data.profile.avatar_url }} style={{ borderRadius: 40, height: 80, width: 80 }} /> : <View className="h-20 w-20 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary"><MaterialCommunityIcons name="account" size={40} color="white" /></View>}
        <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-ui-surface bg-ui-primary dark:border-ui-dark-surface dark:bg-ui-dark-primary"><MaterialCommunityIcons name="pencil" size={15} color="white" /></View>
      </Pressable>
      <View className="ml-4 flex-1">
        <Text className="text-2xl font-extrabold text-ui-text dark:text-ui-dark-text">{name}</Text>
        <View className="mt-2 flex-row items-center">
          {editingProfile ? <TextInput className="min-w-0 flex-1 rounded-xl bg-ui-muted px-3 py-2 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" multiline onChangeText={setBio} placeholder="Descripción" placeholderTextColor="#8f9bb2" value={bio} /> : <Text className="flex-1 text-ui-primary dark:text-ui-dark-primary">{data?.profile?.bio || 'Explorando Costa Rica'}</Text>}
          <Pressable accessibilityLabel="Editar descripción" className="ml-2 p-2" onPress={() => setEditingProfile(true)}><MaterialCommunityIcons name="pencil-outline" size={19} color="#0B6B4F" /></Pressable>
        </View>
        <View className="mt-2 flex-row items-center">
          <MaterialCommunityIcons name="email-outline" size={18} color="#8f9bb2" />
          {editingProfile ? <TextInput className="ml-2 min-w-0 flex-1 rounded-xl bg-ui-muted px-3 py-2 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="email-address" onChangeText={setContactEmail} placeholder="Correo de contacto" placeholderTextColor="#8f9bb2" value={contactEmail} /> : <Text className="ml-2 flex-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{data?.profile?.contact_email || session?.user.email || 'Agregar correo de contacto'}</Text>}
          <Pressable accessibilityLabel="Editar correo" className="ml-2 p-2" onPress={() => setEditingProfile(true)}><MaterialCommunityIcons name="pencil-outline" size={19} color="#0B6B4F" /></Pressable>
        </View>
        {editingProfile || avatar ? <View className="mt-3 flex-row gap-2"><Button label={busy ? 'Guardando...' : 'Guardar'} disabled={busy} onPress={saveProfile} /><Button label="Cancelar" outline onPress={() => { setBio(data?.profile?.bio || ''); setContactEmail(data?.profile?.contact_email || ''); setAvatar(undefined); setEditingProfile(false); }} /></View> : null}
        <View className="mt-3 flex-row flex-wrap gap-3"><Stat value={data?.followers.length ?? 0} label="seguidores" /><Stat value={data?.following.length ?? 0} label="siguiendo" /><Stat value={data?.sightings.length ?? 0} label="avistamientos" /><Stat value={data?.saved.length ?? 0} label="guardados" /></View>
      </View>
    </View></View>
    <View className="mx-auto mt-5 w-full max-w-5xl gap-2">{tabs.map((tab) => <Pressable className={section === tab.key ? 'flex-row items-center rounded-2xl bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary' : 'flex-row items-center rounded-2xl border border-ui-border bg-ui-surface px-4 py-3 dark:border-ui-dark-border dark:bg-ui-dark-surface'} key={tab.key} onPress={() => setSection(tab.key)}><MaterialCommunityIcons name={tab.icon} size={21} color={section === tab.key ? 'white' : '#9eabc4'} /><Text className={section === tab.key ? 'ml-3 flex-1 font-black text-white' : 'ml-3 flex-1 font-black text-ui-text-muted dark:text-ui-dark-text-muted'}>{tab.label}</Text>{tab.count !== undefined ? <Text className={section === tab.key ? 'font-black text-white' : 'font-black text-ui-primary dark:text-ui-dark-primary'}>{tab.count}</Text> : null}<MaterialCommunityIcons name="chevron-right" size={20} color={section === tab.key ? 'white' : '#9eabc4'} /></Pressable>)}</View>
    <View className="mx-auto mt-5 w-full max-w-5xl rounded-[30px] border border-ui-border dark:border-ui-dark-border bg-ui-surface dark:bg-ui-dark-surface p-5">
      {!data && !error ? <ActivityIndicator color="#13bd83" /> : null}{error ? <Text className="text-red-400">{error}</Text> : null}
      {data && section === 'notifications' ? <ListEmpty empty={!data.notifications.length}>{data.notifications.map((item) => <Row key={item.id} icon="bell-outline" title={`${item.actor?.full_name || item.actor?.username || 'Un viajero'} ${notificationText(item.type)}`} date={item.created_at} />)}</ListEmpty> : null}
      {data && section === 'community' ? <View><Title>Comunidad & Exploradores</Title><Text className="mt-3 text-ui-text-muted dark:text-ui-dark-text-muted">{data.followers.length} seguidores · {data.following.length} siguiendo</Text></View> : null}
      {data && section === 'sightings' ? <ListEmpty empty={!data.sightings.length}>{data.sightings.map((photo) => <View className="mb-4 overflow-hidden rounded-2xl bg-ui-muted dark:bg-ui-dark-muted" key={photo.id}><Image source={{ uri: photo.image_url }} contentFit="cover" style={{ height: 220, width: '100%' }} /><View className="p-4"><Text className="font-bold text-ui-text dark:text-ui-dark-text">{photo.fauna_species?.common_name_es || 'Avistamiento de fauna'}</Text><View className="mt-3 flex-row flex-wrap gap-2"><Button label="Comunidad Viajera" onPress={() => void shareSightingToWall(userId, photo.image_url, photo.caption)} /><Button label="WhatsApp / Más" outline onPress={() => void Share.share({ message: `${photo.caption || 'Mirá mi avistamiento en Descubriendo CR'}\n${photo.image_url}`, url: photo.image_url })} /></View></View></View>)}</ListEmpty> : null}
      {data && section === 'saved' ? <ListEmpty empty={!data.saved.length}>{data.saved.map((place) => <Row key={place.id} icon="map-marker-outline" title={place.name} date={place.province} />)}</ListEmpty> : null}
      {data && section === 'messages' ? <ListEmpty empty={!data.messages.length}>{data.messages.map((item) => <Row key={item.id} icon="message-text-outline" title={`${item.sender?.full_name || item.sender?.username || 'Viajero'}: ${item.body}`} date={item.created_at} />)}</ListEmpty> : null}
      {section === 'suggestions' ? <View><Title>Sugerencias para el creador</Title><Text className="mb-4 mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">Tus ideas llegarán directamente al panel del administrador.</Text><Field value={suggestion} onChangeText={setSuggestion} placeholder="Contanos qué mejorarías" multiline /><Button label={busy ? 'Enviando...' : 'Enviar sugerencia'} disabled={busy} onPress={() => void run(async () => { if (suggestion.trim().length < 3) throw new Error('Escribí una sugerencia.'); await sendCreatorSuggestion(userId, suggestion); setSuggestion(''); Alert.alert('Gracias', 'Tu sugerencia fue enviada al administrador.'); })} /></View> : null}
      {section === 'login' && !isAuthenticated ? <View><Title>Iniciar sesión</Title><Text className="mb-4 mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">Ingresá con tu correo y contraseña. Las cuentas autorizadas como administrador accederán automáticamente a las herramientas de moderación.</Text><Field value={adminEmail} onChangeText={setAdminEmail} placeholder="Correo electrónico" keyboardType="email-address" /><Field value={adminPassword} onChangeText={setAdminPassword} placeholder="Contraseña" secureTextEntry /><Button label={busy ? 'Ingresando...' : 'Iniciar sesión'} disabled={busy} onPress={() => void run(async () => { await signIn(adminEmail, adminPassword); setAdminPassword(''); })} /></View> : null}
      {section === 'login' && isAuthenticated && !isAdmin ? <View><Title>Sesión iniciada</Title><Text className="mb-4 mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{session?.user.email}</Text><Button label="Cerrar sesión" outline onPress={() => void signOut()} /></View> : null}
      {section === 'login' && isAdmin ? <AdminPanel data={admin} busy={busy} refresh={load} run={run} signOut={signOut} /> : null}
    </View>
  </ScrollView>;
}

function AdminPanel({ data, busy, refresh, run, signOut }: { data?: AdminDashboard; busy: boolean; refresh: () => Promise<void>; run: (action: () => Promise<void>) => Promise<void>; signOut: () => Promise<void> }) {
  const addPhoto = async (destinationId: string, count: number) => {
    if (count >= 5) return Alert.alert('Fotos del sitio', 'Este sitio ya tiene el máximo de 5 fotos.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) await run(async () => { await addDestinationPhoto(destinationId, result.assets[0], count); await refresh(); });
  };
  if (!data) return <ActivityIndicator color="#13bd83" />;
  return <View><View className="flex-row items-center justify-between"><Title>Panel del administrador</Title><Button label="Salir" outline onPress={() => void signOut()} /></View>
    <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">Sugerencias recibidas</Text><ListEmpty empty={!data.suggestions.length}>{data.suggestions.map((item) => <Row key={item.id} icon="lightbulb-outline" title={`${profileName(item.user)}: ${item.message}`} date={item.created_at} />)}</ListEmpty>
    <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">Publicaciones recientes</Text><ListEmpty empty={!data.posts.length}>{data.posts.map((post) => <View className="mb-3 rounded-2xl bg-ui-muted dark:bg-ui-dark-muted p-4" key={post.id}><Text className="font-semibold text-ui-text dark:text-ui-dark-text">{post.user?.full_name || post.user?.username || 'Viajero'}: {post.body}</Text><Pressable className="mt-3 self-start" disabled={busy} onPress={() => Alert.alert('Eliminar publicación', 'Todos los usuarios dejarán de verla.', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void run(async () => { await deleteTravelerPost(post.id); await refresh(); }) }])}><Text className="font-black text-red-400">Eliminar para todos</Text></Pressable></View>)}</ListEmpty>
    <Text className="mb-3 mt-6 text-lg font-bold text-ui-text dark:text-ui-dark-text">Fotos de sitios (máximo 5)</Text>{data.destinations.map((place) => { const photos = data.photos.filter((photo) => photo.destination_id === place.id); return <View className="mb-3 rounded-2xl bg-ui-muted dark:bg-ui-dark-muted p-4" key={place.id}><View className="flex-row items-center justify-between"><View className="flex-1"><Text className="font-semibold text-ui-text dark:text-ui-dark-text">{place.name}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{place.province} · {photos.length}/5</Text></View><Button label="Agregar" disabled={busy || photos.length >= 5} onPress={() => void addPhoto(place.id, photos.length)} /></View><ScrollView horizontal contentContainerStyle={{ gap: 8, paddingTop: 12 }}>{photos.map((photo) => <Pressable key={photo.id} onPress={() => Alert.alert('Eliminar foto', '¿Quitar esta foto del sitio?', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void run(async () => { await deleteDestinationPhoto(photo.id, photo.image_url); await refresh(); }) }])}><Image source={{ uri: photo.image_url }} style={{ borderRadius: 12, height: 90, width: 120 }} /><View className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><MaterialCommunityIcons name="close" size={16} color="white" /></View></Pressable>)}</ScrollView></View>; })}
  </View>;
}

function Field(props: React.ComponentProps<typeof TextInput>) { return <TextInput className="mb-3 rounded-control border border-ui-border bg-ui-muted px-4 py-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" placeholderTextColor="#8f9bb2" {...props} />; }
function Button({ label, onPress, outline, disabled }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) { return <Pressable className={outline ? 'self-start rounded-full border border-ui-primary dark:border-ui-dark-primary px-5 py-3' : 'self-start rounded-full bg-ui-primary dark:bg-ui-dark-primary px-5 py-3'} disabled={disabled} onPress={onPress}><Text className={outline ? 'font-black text-ui-primary dark:text-ui-dark-primary' : 'font-black text-white'}>{label}</Text></Pressable>; }
function Title({ children }: { children: ReactNode }) { return <Text className="text-xl font-bold text-ui-text dark:text-ui-dark-text">{children}</Text>; }
function Stat({ value, label }: { value: number; label: string }) { return <Text className="font-semibold text-ui-text-muted dark:text-ui-dark-text-muted"><Text className="text-ui-text dark:text-ui-dark-text">{value}</Text> {label}</Text>; }
function Row({ icon, title, date }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; date: string }) { return <View className="mb-3 flex-row items-center rounded-2xl bg-ui-muted dark:bg-ui-dark-muted p-4"><MaterialCommunityIcons name={icon} size={24} color="#0B6B4F" /><View className="ml-3 flex-1"><Text className="font-semibold text-ui-text dark:text-ui-dark-text">{title}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{date.includes('T') ? new Date(date).toLocaleString() : date}</Text></View></View>; }
function ListEmpty({ empty, children }: { empty: boolean; children: ReactNode }) { return <View>{empty ? <Text className="py-8 text-center text-ui-text-muted dark:text-ui-dark-text-muted">Todavía no hay actividad aquí.</Text> : children}</View>; }
function notificationText(type: string) { return ({ like: 'reaccionó a tu publicación', follow: 'empezó a seguirte', comment: 'respondió a tu conversación', new_post: 'publicó algo nuevo', message: 'te envió un mensaje' } as Record<string,string>)[type] || 'generó una actividad nueva'; }
function message(reason: unknown) { return reason instanceof Error ? reason.message : 'Ocurrió un error inesperado.'; }
function profileName(value: { full_name?: string | null; username?: string | null } | { full_name?: string | null; username?: string | null }[] | null) { const profile = Array.isArray(value) ? value[0] : value; return profile?.full_name || profile?.username || 'Viajero'; }
