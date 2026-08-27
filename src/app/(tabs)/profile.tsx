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
type Section = 'notifications' | 'community' | 'sightings' | 'saved' | 'messages' | 'edit' | 'suggestions' | 'admin';

export default function ProfileScreen() {
  const { isAdmin, language, session, signInAdmin, signOutAdmin } = useApp();
  const [section, setSection] = useState<Section>('notifications');
  const [data, setData] = useState<Dashboard>();
  const [admin, setAdmin] = useState<AdminDashboard>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset>();
  const [suggestion, setSuggestion] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const userId = session!.user.id;

  const load = useCallback(async () => {
    try {
      setError(undefined);
      const next = await getSocialProfile(userId);
      setData(next); setBio(next.profile?.bio || ''); setContactEmail(next.profile?.contact_email || '');
      if (isAdmin) setAdmin(await getAdminDashboard());
    } catch (reason) { setError(message(reason)); }
  }, [isAdmin, userId]);
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
  const name = data?.profile?.full_name || data?.profile?.username || (language === 'es' ? 'Viajero invitado' : 'Guest traveler');
  const tabs: { key: Section; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; count?: number }[] = [
    { key: 'notifications', icon: 'bell-outline', label: 'Notificaciones', count: data?.notifications.filter((n) => !n.read_status).length ?? 0 },
    { key: 'community', icon: 'account-group-outline', label: 'Comunidad' },
    { key: 'sightings', icon: 'camera-outline', label: 'Mis avistamientos', count: data?.sightings.length ?? 0 },
    { key: 'saved', icon: 'heart-outline', label: 'Guardados', count: data?.saved.length ?? 0 },
    { key: 'messages', icon: 'message-outline', label: 'Mensajes', count: data?.messages.filter((m) => !m.read_status).length ?? 0 },
    { key: 'edit', icon: 'account-edit-outline', label: 'Editar perfil' },
    { key: 'suggestions', icon: 'lightbulb-outline', label: 'Sugerencias' },
    { key: 'admin', icon: 'shield-crown-outline', label: isAdmin ? 'Administrar' : 'Admin' },
  ];

  return <ScrollView className="flex-1 bg-[#101625]" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
    <View className="mx-auto w-full max-w-5xl rounded-[32px] border border-[#344059] bg-[#202a3f] p-6"><View className="flex-row items-center">
      {data?.profile?.avatar_url ? <Image source={{ uri: data.profile.avatar_url }} style={{ borderRadius: 50, height: 100, width: 100 }} /> : <View className="h-24 w-24 items-center justify-center rounded-full bg-[#13bd83]"><MaterialCommunityIcons name="account" size={50} color="white" /></View>}
      <View className="ml-5 flex-1"><Text className="text-3xl font-black text-white">{name}</Text><Text className="mt-2 text-[#10e3a0]">{data?.profile?.bio || 'Explorando Costa Rica'}</Text><View className="mt-4 flex-row flex-wrap gap-5"><Stat value={data?.followers.length ?? 0} label="seguidores" /><Stat value={data?.following.length ?? 0} label="siguiendo" /><Stat value={data?.sightings.length ?? 0} label="avistamientos" /><Stat value={data?.saved.length ?? 0} label="guardados" /></View></View>
    </View></View>
    <ScrollView horizontal className="mx-auto mt-5 w-full max-w-5xl" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{tabs.map((tab) => <Pressable className={section === tab.key ? 'flex-row items-center rounded-full bg-[#13bd83] px-5 py-3' : 'flex-row items-center rounded-full px-5 py-3'} key={tab.key} onPress={() => setSection(tab.key)}><MaterialCommunityIcons name={tab.icon} size={21} color={section === tab.key ? 'white' : '#9eabc4'} /><Text className={section === tab.key ? 'ml-2 font-black text-white' : 'ml-2 font-black text-[#9eabc4]'}>{tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}</Text></Pressable>)}</ScrollView>
    <View className="mx-auto mt-5 w-full max-w-5xl rounded-[30px] border border-[#344059] bg-[#202a3f] p-5">
      {!data && !error ? <ActivityIndicator color="#13bd83" /> : null}{error ? <Text className="text-red-400">{error}</Text> : null}
      {data && section === 'notifications' ? <ListEmpty empty={!data.notifications.length}>{data.notifications.map((item) => <Row key={item.id} icon="bell-outline" title={`${item.actor?.full_name || item.actor?.username || 'Un viajero'} ${notificationText(item.type)}`} date={item.created_at} />)}</ListEmpty> : null}
      {data && section === 'community' ? <View><Title>Comunidad & Exploradores</Title><Text className="mt-3 text-[#aeb9cf]">{data.followers.length} seguidores · {data.following.length} siguiendo</Text></View> : null}
      {data && section === 'sightings' ? <ListEmpty empty={!data.sightings.length}>{data.sightings.map((photo) => <View className="mb-4 overflow-hidden rounded-2xl bg-[#162035]" key={photo.id}><Image source={{ uri: photo.image_url }} contentFit="cover" style={{ height: 220, width: '100%' }} /><View className="p-4"><Text className="font-black text-white">{photo.fauna_species?.common_name_es || 'Avistamiento de fauna'}</Text><View className="mt-3 flex-row flex-wrap gap-2"><Button label="Amigos Viajeros" onPress={() => void shareSightingToWall(userId, photo.image_url, photo.caption)} /><Button label="WhatsApp / Más" outline onPress={() => void Share.share({ message: `${photo.caption || 'Mirá mi avistamiento en Descubriendo CR'}\n${photo.image_url}`, url: photo.image_url })} /></View></View></View>)}</ListEmpty> : null}
      {data && section === 'saved' ? <ListEmpty empty={!data.saved.length}>{data.saved.map((place) => <Row key={place.id} icon="map-marker-outline" title={place.name} date={place.province} />)}</ListEmpty> : null}
      {data && section === 'messages' ? <ListEmpty empty={!data.messages.length}>{data.messages.map((item) => <Row key={item.id} icon="message-text-outline" title={`${item.sender?.full_name || item.sender?.username || 'Viajero'}: ${item.body}`} date={item.created_at} />)}</ListEmpty> : null}
      {section === 'edit' ? <View><Title>Editar mi perfil</Title><Pressable className="my-5 self-start" onPress={chooseAvatar}>{avatar ? <Image source={{ uri: avatar.uri }} style={{ borderRadius: 45, height: 90, width: 90 }} /> : <View className="h-20 w-20 items-center justify-center rounded-full bg-[#13bd83]"><MaterialCommunityIcons name="camera-plus" size={32} color="white" /></View>}<Text className="mt-2 font-bold text-[#10e3a0]">Cambiar foto</Text></Pressable><Field value={bio} onChangeText={setBio} placeholder="Descripción" multiline /><Field value={contactEmail} onChangeText={setContactEmail} placeholder="Email de contacto" keyboardType="email-address" /><Button label={busy ? 'Guardando...' : 'Guardar cambios'} disabled={busy} onPress={() => void run(async () => { await updateTravelerProfile(userId, { bio, contactEmail, avatar }); setAvatar(undefined); await load(); Alert.alert('Perfil', 'Tus cambios fueron guardados.'); })} /></View> : null}
      {section === 'suggestions' ? <View><Title>Sugerencias para el creador</Title><Text className="mb-4 mt-2 text-[#aeb9cf]">Tus ideas llegarán directamente al panel del administrador.</Text><Field value={suggestion} onChangeText={setSuggestion} placeholder="Contanos qué mejorarías" multiline /><Button label={busy ? 'Enviando...' : 'Enviar sugerencia'} disabled={busy} onPress={() => void run(async () => { if (suggestion.trim().length < 3) throw new Error('Escribí una sugerencia.'); await sendCreatorSuggestion(userId, suggestion); setSuggestion(''); Alert.alert('Gracias', 'Tu sugerencia fue enviada al administrador.'); })} /></View> : null}
      {section === 'admin' && !isAdmin ? <View><Title>Acceso de administrador</Title><Text className="mb-4 mt-2 text-[#aeb9cf]">El modo invitado continúa disponible para todos. Esta entrada es solo para moderación.</Text><Field value={adminEmail} onChangeText={setAdminEmail} placeholder="Correo administrador" keyboardType="email-address" /><Field value={adminPassword} onChangeText={setAdminPassword} placeholder="Contraseña" secureTextEntry /><Button label={busy ? 'Ingresando...' : 'Ingresar'} disabled={busy} onPress={() => void run(async () => { await signInAdmin(adminEmail, adminPassword); setAdminPassword(''); setSection('admin'); })} /></View> : null}
      {section === 'admin' && isAdmin ? <AdminPanel data={admin} busy={busy} refresh={load} run={run} signOut={signOutAdmin} /> : null}
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
    <Text className="mb-3 mt-6 text-lg font-black text-white">Sugerencias recibidas</Text><ListEmpty empty={!data.suggestions.length}>{data.suggestions.map((item) => <Row key={item.id} icon="lightbulb-outline" title={`${profileName(item.user)}: ${item.message}`} date={item.created_at} />)}</ListEmpty>
    <Text className="mb-3 mt-6 text-lg font-black text-white">Publicaciones recientes</Text><ListEmpty empty={!data.posts.length}>{data.posts.map((post) => <View className="mb-3 rounded-2xl bg-[#182238] p-4" key={post.id}><Text className="font-bold text-white">{post.user?.full_name || post.user?.username || 'Viajero'}: {post.body}</Text><Pressable className="mt-3 self-start" disabled={busy} onPress={() => Alert.alert('Eliminar publicación', 'Todos los usuarios dejarán de verla.', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void run(async () => { await deleteTravelerPost(post.id); await refresh(); }) }])}><Text className="font-black text-red-400">Eliminar para todos</Text></Pressable></View>)}</ListEmpty>
    <Text className="mb-3 mt-6 text-lg font-black text-white">Fotos de sitios (máximo 5)</Text>{data.destinations.map((place) => { const photos = data.photos.filter((photo) => photo.destination_id === place.id); return <View className="mb-3 rounded-2xl bg-[#182238] p-4" key={place.id}><View className="flex-row items-center justify-between"><View className="flex-1"><Text className="font-black text-white">{place.name}</Text><Text className="text-xs text-[#8f9bb2]">{place.province} · {photos.length}/5</Text></View><Button label="Agregar" disabled={busy || photos.length >= 5} onPress={() => void addPhoto(place.id, photos.length)} /></View><ScrollView horizontal contentContainerStyle={{ gap: 8, paddingTop: 12 }}>{photos.map((photo) => <Pressable key={photo.id} onPress={() => Alert.alert('Eliminar foto', '¿Quitar esta foto del sitio?', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void run(async () => { await deleteDestinationPhoto(photo.id, photo.image_url); await refresh(); }) }])}><Image source={{ uri: photo.image_url }} style={{ borderRadius: 12, height: 90, width: 120 }} /><View className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><MaterialCommunityIcons name="close" size={16} color="white" /></View></Pressable>)}</ScrollView></View>; })}
  </View>;
}

function Field(props: React.ComponentProps<typeof TextInput>) { return <TextInput className="mb-3 rounded-2xl bg-[#162035] px-4 py-4 text-white" placeholderTextColor="#8f9bb2" {...props} />; }
function Button({ label, onPress, outline, disabled }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) { return <Pressable className={outline ? 'self-start rounded-full border border-[#13bd83] px-5 py-3' : 'self-start rounded-full bg-[#13bd83] px-5 py-3'} disabled={disabled} onPress={onPress}><Text className={outline ? 'font-black text-[#13bd83]' : 'font-black text-white'}>{label}</Text></Pressable>; }
function Title({ children }: { children: ReactNode }) { return <Text className="text-xl font-black text-white">{children}</Text>; }
function Stat({ value, label }: { value: number; label: string }) { return <Text className="font-bold text-[#c9d1e1]"><Text className="text-white">{value}</Text> {label}</Text>; }
function Row({ icon, title, date }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; date: string }) { return <View className="mb-3 flex-row items-center rounded-2xl bg-[#182238] p-4"><MaterialCommunityIcons name={icon} size={24} color="#13bd83" /><View className="ml-3 flex-1"><Text className="font-bold text-white">{title}</Text><Text className="mt-1 text-xs text-[#8f9bb2]">{date.includes('T') ? new Date(date).toLocaleString() : date}</Text></View></View>; }
function ListEmpty({ empty, children }: { empty: boolean; children: ReactNode }) { return <View>{empty ? <Text className="py-8 text-center text-[#9eabc4]">Todavía no hay actividad aquí.</Text> : children}</View>; }
function notificationText(type: string) { return ({ like: 'reaccionó a tu publicación', follow: 'empezó a seguirte', comment: 'respondió a tu conversación', new_post: 'publicó algo nuevo', message: 'te envió un mensaje' } as Record<string,string>)[type] || 'generó una actividad nueva'; }
function message(reason: unknown) { return reason instanceof Error ? reason.message : 'Ocurrió un error inesperado.'; }
function profileName(value: { full_name?: string | null; username?: string | null } | { full_name?: string | null; username?: string | null }[] | null) { const profile = Array.isArray(value) ? value[0] : value; return profile?.full_name || profile?.username || 'Viajero'; }
