import { supabase } from '@/lib/supabase';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { getAdminCommercialClaims } from '@/lib/commerce';
import { getInformationReportsForAdmin } from '@/lib/reports';

export type PrivateMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_status: boolean;
  created_at: string;
};

export type PrivateConversation = {
  partner_id: string;
  partner_name: string;
  partner_avatar_url: string | null;
  messages: PrivateMessage[];
  unread_count: number;
};

export async function getPrivateConversations(userId: string): Promise<PrivateConversation[]> {
  const { data, error } = await supabase
    .from('traveler_messages')
    .select('id,sender_id,recipient_id,body,read_status,created_at')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const messages = (data ?? []) as PrivateMessage[];
  const partnerIds = [...new Set(messages.map((item) => item.sender_id === userId ? item.recipient_id : item.sender_id))];
  if (!partnerIds.length) return [];
  const { data: profiles, error: profilesError } = await supabase.from('users').select('id,username,full_name,avatar_url').in('id', partnerIds);
  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const conversations = new Map<string, PrivateConversation>();
  for (const message of messages) {
    const partnerId = message.sender_id === userId ? message.recipient_id : message.sender_id;
    const profile = profileById.get(partnerId);
    const current: PrivateConversation = conversations.get(partnerId) ?? {
      partner_id: partnerId,
      partner_name: profile?.full_name || profile?.username || 'Viajero',
      partner_avatar_url: profile?.avatar_url ?? null,
      messages: [] as PrivateMessage[],
      unread_count: 0,
    };
    current.messages.push(message);
    if (message.recipient_id === userId && !message.read_status) current.unread_count += 1;
    conversations.set(partnerId, current);
  }
  return [...conversations.values()].sort((a, b) => {
    const latestA = a.messages[a.messages.length - 1]?.created_at ?? '';
    const latestB = b.messages[b.messages.length - 1]?.created_at ?? '';
    return latestB.localeCompare(latestA);
  });
}

export async function markNotificationRead(notificationId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('authentication_required');
  const { error } = await supabase.from('notifications').update({ read_status: true }).eq('id', notificationId).eq('recipient_id', auth.user.id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('authentication_required');
  const { error } = await supabase.from('notifications').update({ read_status: true }).eq('recipient_id', auth.user.id).eq('read_status', false);
  if (error) throw error;
}

export async function markMessageRead(messageId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('authentication_required');
  const { error } = await supabase.from('traveler_messages').update({ read_status: true }).eq('id', messageId).eq('recipient_id', auth.user.id);
  if (error) throw error;
}

export async function getSocialProfile(userId: string) {
  const [profile, followers, following, posts, sightings, saved, notifications, conversations] = await Promise.all([
    supabase.from('users').select('id,username,full_name,avatar_url,bio,contact_email').eq('id', userId).single(),
    supabase.from('user_follows').select('follower_id').eq('followed_id', userId),
    supabase.from('user_follows').select('followed_id').eq('follower_id', userId),
    supabase.from('traveler_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('fauna_photos').select('*,fauna_species(common_name_es,common_name_en)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'destination'),
    supabase.from('notifications').select('*,actor:users!notifications_actor_id_fkey(username,full_name,avatar_url)').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50),
    getPrivateConversations(userId),
  ]);
  const error = profile.error ?? followers.error ?? following.error ?? posts.error ?? sightings.error ?? saved.error ?? notifications.error;
  if (error) throw error;
  const savedIds = (saved.data ?? []).map((item) => item.target_id);
  const destinations = savedIds.length ? await supabase.from('destinations').select('id,name,province,cover_image_url').in('id', savedIds) : { data: [], error: null };
  if (destinations.error) throw destinations.error;
  return { profile: profile.data, followers: followers.data ?? [], following: following.data ?? [], posts: posts.data ?? [], sightings: sightings.data ?? [], saved: destinations.data ?? [], notifications: notifications.data ?? [], conversations };
}

async function uploadImage(bucket: 'profile-avatars' | 'destination-photos', owner: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600) });
  const rendered = await context.renderAsync();
  const file = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('No se pudo leer la imagen preparada.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('La imagen supera el límite de 6 MB.');
  const path = `${owner}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { cacheControl: '3600', contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function updateTravelerProfile(userId: string, values: { username?: string; bio: string; contactEmail: string; avatar?: ImagePickerAsset }) {
  const username = values.username?.trim().toLowerCase();
  if (username !== undefined && !/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('El nickname debe tener entre 3 y 24 caracteres: letras, números o guion bajo.');
  const avatarUrl = values.avatar ? await uploadImage('profile-avatars', userId, values.avatar) : undefined;
  const update: Record<string, string | null> = { bio: values.bio.trim() || null, contact_email: values.contactEmail.trim() || null };
  if (username !== undefined) update.username = username;
  if (avatarUrl) update.avatar_url = avatarUrl;
  const { data, error } = await supabase.from('users').update(update).eq('id', userId).select('id,username,full_name,avatar_url,bio,contact_email').single();
  if (error?.code === '23505') throw new Error('Ese nickname ya está en uso.');
  if (error) throw error;
  if (!data) throw new Error('No se pudo confirmar el guardado del perfil.');
  return data;
}

export async function sendCreatorSuggestion(userId: string, message: string) {
  const { error } = await supabase.from('creator_suggestions').insert({ user_id: userId, message: message.trim() });
  if (error) throw error;
}

export type CreatorSuggestionStatus = 'new' | 'read' | 'resolved';

export async function updateCreatorSuggestionStatus(id: string, status: CreatorSuggestionStatus) {
  const { error } = await supabase.from('creator_suggestions').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function getAdminDashboard() {
  const [suggestions, destinations, photos, posts, reports, commercialClaims] = await Promise.all([
    supabase.from('creator_suggestions').select('*,user:users(username,full_name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('destinations').select('id,name,province').order('name'),
    supabase.from('destination_photos').select('*').order('sort_order'),
    supabase.from('traveler_posts').select('id,body,created_at,user:users!traveler_posts_user_id_fkey(username,full_name)').order('created_at', { ascending: false }).limit(50),
    getInformationReportsForAdmin(),
    getAdminCommercialClaims(),
  ]);
  const error = suggestions.error ?? destinations.error ?? photos.error ?? posts.error;
  if (error) throw error;
  const oneProfile = <T,>(value: T | T[]) => Array.isArray(value) ? value[0] : value;
  return {
    suggestions: (suggestions.data ?? []).map((row) => ({ ...row, user: oneProfile(row.user) })),
    destinations: destinations.data ?? [], photos: photos.data ?? [],
    posts: (posts.data ?? []).map((row) => ({ ...row, user: oneProfile(row.user) })), reports, commercialClaims,
  };
}

export async function addDestinationPhoto(destinationId: string, asset: ImagePickerAsset, sortOrder: number) {
  const imageUrl = await uploadImage('destination-photos', destinationId, asset);
  const { error } = await supabase.from('destination_photos').insert({ destination_id: destinationId, image_url: imageUrl, sort_order: sortOrder });
  if (error) throw error;
}

export async function deleteDestinationPhoto(id: string, imageUrl: string) {
  const { error } = await supabase.from('destination_photos').delete().eq('id', id);
  if (error) throw error;
  const marker = '/destination-photos/';
  const path = decodeURIComponent(imageUrl.split(marker)[1] || '');
  if (path) await supabase.storage.from('destination-photos').remove([path]);
}

export async function deleteTravelerPost(postId: string) {
  const { error } = await supabase.from('traveler_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function sendTravelerMessage(senderId: string, recipientId: string, body: string) {
  const { error } = await supabase.from('traveler_messages').insert({ sender_id: senderId, recipient_id: recipientId, body: body.trim() });
  if (error) throw error;
}

export async function shareSightingToWall(userId: string, imageUrl: string, caption?: string | null) {
  const { error } = await supabase.from('traveler_posts').insert({ user_id: userId, image_url: imageUrl, body: caption?.trim() || 'Compartí un nuevo avistamiento de Fauna CR.' });
  if (error) throw error;
}

export async function getPublicTravelerProfile(userId: string, viewerId: string) {
  const [profile, followers, following, posts, followed] = await Promise.all([
    supabase.from('users').select('id,username,full_name,avatar_url,bio').eq('id', userId).single(),
    supabase.from('user_follows').select('follower_id').eq('followed_id', userId),
    supabase.from('user_follows').select('followed_id').eq('follower_id', userId),
    supabase.from('traveler_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('user_follows').select('followed_id').eq('follower_id', viewerId).eq('followed_id', userId).maybeSingle(),
  ]);
  const error = profile.error ?? followers.error ?? following.error ?? posts.error ?? followed.error;
  if (error) throw error;
  return { profile: profile.data, followers: followers.data ?? [], following: following.data ?? [], posts: posts.data ?? [], followed: Boolean(followed.data) };
}
