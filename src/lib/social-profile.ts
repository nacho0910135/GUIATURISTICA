import { supabase } from '@/lib/supabase';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function getSocialProfile(userId: string) {
  const [profile, followers, following, posts, sightings, saved, notifications, messages] = await Promise.all([
    supabase.from('users').select('id,username,full_name,avatar_url,bio,contact_email').eq('id', userId).single(),
    supabase.from('user_follows').select('follower_id').eq('followed_id', userId),
    supabase.from('user_follows').select('followed_id').eq('follower_id', userId),
    supabase.from('traveler_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('fauna_photos').select('*,fauna_species(common_name_es,common_name_en)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'destination'),
    supabase.from('notifications').select('*,actor:users!notifications_actor_id_fkey(username,full_name,avatar_url)').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('traveler_messages').select('*,sender:users!traveler_messages_sender_id_fkey(username,full_name,avatar_url)').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);
  const error = profile.error ?? followers.error ?? following.error ?? posts.error ?? sightings.error ?? saved.error ?? notifications.error ?? messages.error;
  if (error) throw error;
  const savedIds = (saved.data ?? []).map((item) => item.target_id);
  const destinations = savedIds.length ? await supabase.from('destinations').select('id,name,province,cover_image_url').in('id', savedIds) : { data: [], error: null };
  if (destinations.error) throw destinations.error;
  return { profile: profile.data, followers: followers.data ?? [], following: following.data ?? [], posts: posts.data ?? [], sightings: sightings.data ?? [], saved: destinations.data ?? [], notifications: notifications.data ?? [], messages: messages.data ?? [] };
}

async function uploadImage(bucket: 'profile-avatars' | 'destination-photos', owner: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600), height: null });
  const rendered = await context.renderAsync();
  const file = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await fetch(file.uri).then((response) => response.arrayBuffer());
  const path = `${owner}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function updateTravelerProfile(userId: string, values: { bio: string; contactEmail: string; avatar?: ImagePickerAsset }) {
  const avatarUrl = values.avatar ? await uploadImage('profile-avatars', userId, values.avatar) : undefined;
  const update: Record<string, string | null> = { bio: values.bio.trim() || null, contact_email: values.contactEmail.trim() || null };
  if (avatarUrl) update.avatar_url = avatarUrl;
  const { error } = await supabase.from('users').update(update).eq('id', userId);
  if (error) throw error;
}

export async function sendCreatorSuggestion(userId: string, message: string) {
  const { error } = await supabase.from('creator_suggestions').insert({ user_id: userId, message: message.trim() });
  if (error) throw error;
}

export async function getAdminDashboard() {
  const [suggestions, destinations, photos, posts] = await Promise.all([
    supabase.from('creator_suggestions').select('*,user:users(username,full_name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('destinations').select('id,name,province').order('name').limit(100),
    supabase.from('destination_photos').select('*').order('sort_order'),
    supabase.from('traveler_posts').select('id,body,created_at,user:users(username,full_name)').order('created_at', { ascending: false }).limit(50),
  ]);
  const error = suggestions.error ?? destinations.error ?? photos.error ?? posts.error;
  if (error) throw error;
  const oneProfile = <T,>(value: T | T[]) => Array.isArray(value) ? value[0] : value;
  return {
    suggestions: (suggestions.data ?? []).map((row) => ({ ...row, user: oneProfile(row.user) })),
    destinations: destinations.data ?? [], photos: photos.data ?? [],
    posts: (posts.data ?? []).map((row) => ({ ...row, user: oneProfile(row.user) })),
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
