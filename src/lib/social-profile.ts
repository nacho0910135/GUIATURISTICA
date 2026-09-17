import { supabase } from '@/lib/supabase';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

import { getAdminCommercialClaims } from '@/lib/commerce';
import { getInformationReportsForAdmin } from '@/lib/reports';

export type PrivateMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  media_path: string | null;
  media_type: 'image' | 'audio' | null;
  media_duration_ms: number | null;
  media_url?: string | null;
  reactions: { user_id: string; emoji: string }[];
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

type PrivateConversationSummaryRow = Omit<PrivateMessage, 'id' | 'reactions' | 'media_url'> & {
  partner_id: string;
  partner_name: string;
  partner_avatar_url: string | null;
  unread_count: number | string;
  message_id: string;
};

async function enrichPrivateMessages(rawMessages: Omit<PrivateMessage, 'reactions' | 'media_url'>[]) {
  const messageIds = rawMessages.map((item) => item.id);
  const paths = rawMessages.flatMap((item) => item.media_path ? [item.media_path] : []);
  const [reactionsResult, signedResult] = await Promise.all([
    messageIds.length ? supabase.from('traveler_message_reactions').select('message_id,user_id,emoji').in('message_id', messageIds) : Promise.resolve({ data: [], error: null }),
    paths.length ? supabase.storage.from('chat-media').createSignedUrls(paths, 60 * 60) : Promise.resolve({ data: [], error: null }),
  ]);
  if (reactionsResult.error || signedResult.error) throw reactionsResult.error ?? signedResult.error;
  const reactionsByMessage = new Map<string, { user_id: string; emoji: string }[]>();
  for (const reaction of reactionsResult.data ?? []) reactionsByMessage.set(reaction.message_id, [...(reactionsByMessage.get(reaction.message_id) ?? []), reaction]);
  const mediaUrlByPath = new Map((signedResult.data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
  return rawMessages.map((item) => ({ ...item, media_url: item.media_path ? mediaUrlByPath.get(item.media_path) ?? null : null, reactions: reactionsByMessage.get(item.id) ?? [] })) as PrivateMessage[];
}

export async function getPrivateConversations(_userId: string): Promise<PrivateConversation[]> {
  const { data, error } = await supabase.rpc('get_private_conversation_summaries', { p_limit: 30 });
  if (error) throw error;
  const rows = (data ?? []) as PrivateConversationSummaryRow[];
  const messages = await enrichPrivateMessages(rows.map((row) => ({
    id: row.message_id, sender_id: row.sender_id, recipient_id: row.recipient_id, body: row.body,
    media_path: row.media_path, media_type: row.media_type as PrivateMessage['media_type'],
    media_duration_ms: row.media_duration_ms, read_status: row.read_status, created_at: row.created_at,
  })));
  return rows.map((row, index) => ({
    partner_id: row.partner_id,
    partner_name: row.partner_name,
    partner_avatar_url: row.partner_avatar_url,
    unread_count: Number(row.unread_count),
    messages: [messages[index]],
  }));
}

export async function getPrivateMessages(partnerId: string, cursor?: { createdAt: string; id: string }) {
  const { data, error } = await supabase.rpc('get_private_messages', {
    p_partner_id: partnerId,
    p_cursor_created_at: cursor?.createdAt,
    p_cursor_id: cursor?.id,
    p_limit: 50,
  });
  if (error) throw error;
  const messages = await enrichPrivateMessages((data ?? []) as Omit<PrivateMessage, 'reactions' | 'media_url'>[]);
  const oldest = messages.at(-1);
  return { messages: messages.reverse(), nextCursor: messages.length === 50 && oldest ? { createdAt: oldest.created_at, id: oldest.id } : undefined };
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
  const { error } = await supabase.from('notifications').update({ read_status: true }).eq('recipient_id', auth.user.id).eq('read_status', false).select('id');
  if (error) throw error;
}

export async function markMessageRead(messageId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('authentication_required');
  const { error } = await supabase.from('traveler_messages').update({ read_status: true }).eq('id', messageId).eq('recipient_id', auth.user.id);
  if (error) throw error;
}

export async function getSocialProfile(userId: string) {
  const [profile, followers, following, posts, sightings, saved, notifications] = await Promise.all([
    supabase.from('users').select('id,username,full_name,avatar_url,bio,contact_email').eq('id', userId).single(),
    supabase.from('user_follows').select('follower_id', { count: 'exact' }).eq('followed_id', userId).limit(100),
    supabase.from('user_follows').select('followed_id', { count: 'exact' }).eq('follower_id', userId).limit(100),
    supabase.from('traveler_posts').select('id,user_id,body,image_url,latitude,longitude,topic,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('fauna_photos').select('id,fauna_id,user_id,image_url,caption,likes_count,created_at,fauna_species(common_name_es,common_name_en)', { count: 'exact' }).eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('likes').select('target_id', { count: 'exact' }).eq('user_id', userId).eq('target_type', 'destination').limit(100),
    supabase.from('notifications').select('id,recipient_id,actor_id,type,target_id,read_status,created_at,actor:users!notifications_actor_id_fkey(username,full_name,avatar_url)').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);
  const profileError = profile.error ?? followers.error ?? following.error ?? posts.error ?? sightings.error ?? saved.error ?? notifications.error;
  if (profileError) throw profileError;
  const followerIds = (followers.data ?? []).map((item) => item.follower_id);
  const followerProfiles = followerIds.length
    ? await supabase.from('users').select('id,username,full_name,avatar_url').in('id', followerIds)
    : { data: [], error: null };
  if (followerProfiles.error) throw followerProfiles.error;
  const savedIds = (saved.data ?? []).map((item) => item.target_id);
  const destinations = savedIds.length ? await supabase.from('destinations').select('id,name,province,cover_image_url,destination_photos(image_url,sort_order)').in('id', savedIds) : { data: [], error: null };
  const savedDestinations = (destinations.data ?? []).map((destination) => ({ ...destination, cover_image_url: destination.cover_image_url ?? destination.destination_photos?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url ?? null }));
  const normalizedSightings = (sightings.data ?? []).map((photo) => ({
    ...photo,
    fauna_species: Array.isArray(photo.fauna_species) ? photo.fauna_species[0] : photo.fauna_species,
  }));
  return {
    profile: profile.data,
    followers: followerProfiles.data ?? [],
    followersCount: followers.count ?? followerIds.length,
    following: following.data ?? [],
    followingCount: following.count ?? following.data?.length ?? 0,
    posts: posts.data ?? [],
    sightings: normalizedSightings,
    sightingsCount: sightings.count ?? normalizedSightings.length,
    saved: savedDestinations,
    savedCount: saved.count ?? savedDestinations.length,
    notifications: notifications.data ?? [],
  };
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
  const [suggestions, destinations, photos, sanctuaries, communityDestinations, posts, reports, commercialClaims, pendingDestinations, pendingFauna, pendingCommerce] = await Promise.all([
    supabase.from('creator_suggestions').select('id,user_id,message,status,created_at,user:users(username,full_name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('destinations').select('id,name,province').order('name'),
    supabase.from('destination_photos').select('id,destination_id,image_url,sort_order').order('sort_order'),
    supabase.from('fauna_sanctuaries').select('id,name,province,cover_image_url').eq('verified', true).order('name'),
    supabase.from('destination_suggestions').select('id,name,province,category,description,created_at').eq('status', 'published').order('created_at', { ascending: false }),
    supabase.from('traveler_posts').select('id,body,created_at,user:users!traveler_posts_user_id_fkey(username,full_name)').order('created_at', { ascending: false }).limit(50),
    getInformationReportsForAdmin(),
    getAdminCommercialClaims(),
    supabase.from('destination_suggestions').select('id,name,province,district,category,description,difficulty,price_national_crc,latitude,longitude,photos,created_at').eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('fauna_species').select('id,common_name_es,scientific_name,category,description,habitat,province,image_url,created_at').eq('moderation_status', 'pending').order('created_at', { ascending: false }),
    supabase.from('commercial_services').select('id,title,category,subcategories,description,phone_whatsapp,whatsapp,opening_hours,price_range,booking_url,menu_url,external_url,parking,has_parking,payment_methods,accessibility,languages,experience_type,certifications,photos,cover_image_url,location,created_at').eq('moderation_status', 'pending').order('created_at', { ascending: false }),
  ]);
  const error = suggestions.error ?? destinations.error ?? photos.error ?? sanctuaries.error ?? communityDestinations.error ?? posts.error ?? pendingDestinations.error ?? pendingFauna.error ?? pendingCommerce.error;
  if (error) throw error;
  const oneProfile = <T,>(value: T | T[]) => Array.isArray(value) ? value[0] : value;
  const destinationsWithPhotos = new Set((photos.data ?? []).map((photo) => photo.destination_id));
  const orderedDestinations = [
    ...(destinations.data ?? []).filter((destination) => !destinationsWithPhotos.has(destination.id)),
    ...(destinations.data ?? []).filter((destination) => destinationsWithPhotos.has(destination.id)),
  ];
  return {
    suggestions: (suggestions.data ?? []).map((row) => ({ ...row, user: oneProfile(row.user) })),
    destinations: orderedDestinations, photos: photos.data ?? [], sanctuaries: sanctuaries.data ?? [], communityDestinations: communityDestinations.data ?? [],
    posts: (posts.data ?? []).map((row) => ({ ...row, user: oneProfile(row.user) })), reports, commercialClaims,
    pendingSubmissions: [
      ...(pendingDestinations.data ?? []).map((item) => ({ ...item, kind: 'destination' as const, title: item.name, detail: `${item.category} · ${item.province}` })),
      ...(pendingFauna.data ?? []).map((item) => ({ ...item, kind: 'fauna' as const, title: item.common_name_es, detail: `${item.scientific_name} · ${item.province ?? ''}` })),
      ...(pendingCommerce.data ?? []).map((item) => ({ ...item, kind: 'commerce' as const, detail: item.category ?? '' })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  };
}

export async function reviewUserSubmission(kind: 'destination' | 'fauna' | 'commerce', id: string, decision: 'approved' | 'rejected') {
  const { error } = await supabase.rpc('review_user_submission', { p_kind: kind, p_id: id, p_decision: decision });
  if (error) throw error;
}

export async function addDestinationPhoto(destinationId: string, asset: ImagePickerAsset, sortOrder: number) {
  const imageUrl = await uploadImage('destination-photos', destinationId, asset);
  const { error } = await supabase.from('destination_photos').insert({ destination_id: destinationId, image_url: imageUrl, sort_order: sortOrder });
  if (!error) return;
  const path = decodeURIComponent(imageUrl.split('/destination-photos/')[1] || '');
  if (path) await supabase.storage.from('destination-photos').remove([path]);
  throw error;
}

export async function setSanctuaryCover(sanctuaryId: string, asset: ImagePickerAsset) {
  const imageUrl = await uploadImage('destination-photos', `sanctuaries/${sanctuaryId}`, asset);
  const { error } = await supabase.from('fauna_sanctuaries').update({ cover_image_url: imageUrl }).eq('id', sanctuaryId);
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

export async function sendTravelerMessage(senderId: string, recipientId: string, body: string, attachment?: { uri: string; type: 'image' | 'audio'; durationMs?: number; width?: number }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== senderId) throw new Error('Debés iniciar sesión para enviar mensajes.');
  if (attachment) {
    let bytes: ArrayBuffer;
    let contentType: string;
    if (attachment.type === 'image') {
      const context = ImageManipulator.manipulate(attachment.uri);
      context.resize({ width: Math.min(attachment.width || 1600, 1600) });
      const rendered = await context.renderAsync();
      const file = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
      bytes = await fetch(file.uri).then((response) => response.arrayBuffer());
      contentType = 'image/jpeg';
    } else {
      const file = new File(attachment.uri);
      if (!file.exists) throw new Error('No se pudo leer el audio grabado.');
      contentType = file.type || (attachment.uri.endsWith('.webm') ? 'audio/webm' : 'audio/mp4');
      bytes = await file.arrayBuffer();
    }
    const extension = attachment.type === 'image' ? 'jpg' : contentType.includes('webm') ? 'webm' : 'm4a';
    const messageId = Crypto.randomUUID();
    const path = `${senderId}/${messageId}.${extension}`;
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('El adjunto supera el límite de 10 MB.');
    const { error: messageError } = await supabase.from('traveler_messages').insert({
      id: messageId,
      sender_id: senderId,
      recipient_id: recipientId,
      body: body.trim() || (attachment.type === 'image' ? '📷 Foto' : '🎙️ Audio'),
      media_path: path,
      media_type: attachment.type,
      media_duration_ms: attachment.durationMs ?? null,
    });
    if (messageError) throw messageError;
    const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, bytes, { contentType, cacheControl: '3600', upsert: false });
    if (uploadError) {
      await supabase.storage.from('chat-media').remove([path]);
      await supabase.rpc('discard_failed_traveler_message', { p_message_id: messageId });
      throw uploadError;
    }
    return;
  }
  const { error } = await supabase.from('traveler_messages').insert({
    sender_id: senderId,
    recipient_id: recipientId,
    body: body.trim(),
    media_path: null,
    media_type: null,
    media_duration_ms: null,
  });
  if (error) throw error;
}

export async function toggleTravelerMessageReaction(messageId: string, emoji: string) {
  const { error } = await supabase.rpc('toggle_traveler_message_reaction', { p_message_id: messageId, p_emoji: emoji });
  if (error) throw error;
}

export async function shareSightingToWall(userId: string, imageUrl: string, caption?: string | null) {
  const { error } = await supabase.from('traveler_posts').insert({ user_id: userId, image_url: imageUrl, body: caption?.trim() || 'Compartí un nuevo avistamiento de Fauna CR.' });
  if (error) throw error;
}

export async function getPublicTravelerProfile(userId: string, viewerId?: string) {
  const [profile, followers, following, posts] = await Promise.all([
    supabase.from('users').select('id,username,full_name,avatar_url,bio,contact_email').eq('id', userId).single(),
    supabase.from('user_follows').select('follower_id').eq('followed_id', userId),
    supabase.from('user_follows').select('followed_id').eq('follower_id', userId),
    supabase.from('traveler_posts').select('id,user_id,body,image_url,topic,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);
  const followed = viewerId
    ? await supabase.from('user_follows').select('followed_id').eq('follower_id', viewerId).eq('followed_id', userId).maybeSingle()
    : { data: null, error: null };
  const blocked = viewerId
    ? await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', viewerId).eq('blocked_id', userId).maybeSingle()
    : { data: null, error: null };
  const error = profile.error ?? followers.error ?? following.error ?? posts.error ?? followed.error ?? blocked.error;
  if (error) throw error;
  return { profile: profile.data, followers: followers.data ?? [], following: following.data ?? [], posts: posts.data ?? [], followed: Boolean(followed.data), blocked: Boolean(blocked.data) };
}
