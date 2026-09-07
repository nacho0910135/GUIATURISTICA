import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export type TravelerProfile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null; role: string | null };
export type SharedLocation = { latitude: number; longitude: number };
export type DestinationRecommendation = { id: string; community: boolean };
export type TravelerTopic = string;
export type TravelerPost = { id: string; user_id: string; body: string; image_url: string | null; image_urls: string[]; latitude: number | null; longitude: number | null; recommended_destination_id: string | null; recommended_destination_is_community: boolean; topic: TravelerTopic; created_at: string; user?: TravelerProfile };
export type ReactionType = string;
export type TravelerReply = { id: string; post_id: string; parent_reply_id: string | null; user_id: string; body: string; created_at: string; user?: TravelerProfile };
export type GroupRide = {
  id: string;
  organizer_id: string;
  topic: TravelerTopic;
  title: string;
  place_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  created_at: string;
  organizer?: TravelerProfile;
  attendee_count: number;
  attending: boolean;
};

export async function getGroupRides(topic: TravelerTopic, userId?: string) {
  if (!['moteros', 'enduro', 'convoy_4x4'].includes(topic)) return [] as GroupRide[];
  const { data, error } = await supabase
    .from('group_rides')
    .select('id,organizer_id,topic,title,place_name,latitude,longitude,starts_at,created_at,organizer:users!group_rides_organizer_id_fkey(id,username,full_name,avatar_url,role),attendees:group_ride_attendees(user_id)')
    .eq('topic', topic)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(10);
  if (error) throw error;
  const oneProfile = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value;
  return (data ?? []).map((ride) => {
    const attendees = (ride.attendees ?? []) as { user_id: string }[];
    return {
      ...ride,
      organizer: oneProfile(ride.organizer) ?? undefined,
      attendee_count: attendees.length,
      attending: Boolean(userId && attendees.some((attendee) => attendee.user_id === userId)),
    } as GroupRide;
  });
}

export async function createGroupRide(input: { organizerId: string; topic: TravelerTopic; title: string; placeName: string; latitude: number; longitude: number; startsAt: Date }) {
  const title = input.title.trim();
  const placeName = input.placeName.trim();
  if (!['moteros', 'enduro', 'convoy_4x4'].includes(input.topic)) throw new Error('Este grupo no admite rodadas.');
  if (title.length < 3 || placeName.length < 3) throw new Error('Completá el nombre de la rodada y el punto de encuentro.');
  if (input.startsAt.getTime() <= Date.now()) throw new Error('Elegí una fecha y hora futuras.');
  const { error } = await supabase.from('group_rides').insert({
    organizer_id: input.organizerId,
    topic: input.topic,
    title,
    place_name: placeName,
    latitude: input.latitude,
    longitude: input.longitude,
    starts_at: input.startsAt.toISOString(),
  });
  if (error) throw error;
}

export async function setGroupRideAttendance(rideId: string, userId: string, attending: boolean) {
  const query = attending
    ? supabase.from('group_ride_attendees').upsert({ ride_id: rideId, user_id: userId }, { ignoreDuplicates: true, onConflict: 'ride_id,user_id' })
    : supabase.from('group_ride_attendees').delete().eq('ride_id', rideId).eq('user_id', userId);
  const { error } = await query;
  if (error) throw error;
}

export async function getTravelerWall(userId?: string, topic: TravelerTopic = 'general') {
  const [postsResult, blocksResult] = await Promise.all([
    supabase.from('traveler_posts').select('id,user_id,body,image_url,image_urls,latitude,longitude,recommended_destination_id,recommended_destination_is_community,topic,created_at,user:users!traveler_posts_user_id_fkey(id,username,full_name,avatar_url,role)').eq('topic', topic).order('created_at', { ascending: false }).limit(40),
    userId ? supabase.from('user_blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`) : Promise.resolve({ data: [], error: null }),
  ]);
  if (postsResult.error || blocksResult.error) throw postsResult.error ?? blocksResult.error;
  const blockedIds = new Set((blocksResult.data ?? []).map((row) => row.blocker_id === userId ? row.blocked_id : row.blocker_id));
  const postRows = (postsResult.data ?? []).filter((post) => !blockedIds.has(post.user_id));
  const postIds = (postRows ?? []).map((post) => post.id);
  const [replies, reactions, follows] = await Promise.all([
    postIds.length
      ? supabase.from('traveler_replies').select('id,post_id,parent_reply_id,user_id,body,created_at,user:users(id,username,full_name,avatar_url,role)').in('post_id', postIds).order('created_at').limit(200)
      : Promise.resolve({ data: [], error: null }),
    postIds.length
      ? supabase.from('traveler_reactions').select('post_id,user_id,reaction').in('post_id', postIds)
      : Promise.resolve({ data: [], error: null }),
    userId ? supabase.from('user_follows').select('followed_id').eq('follower_id', userId) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = replies.error ?? reactions.error ?? follows.error;
  if (error) throw error;
  const oneProfile = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value;
  const reactionRows = (reactions.data ?? []) as { post_id: string; user_id: string; reaction: ReactionType }[];
  return {
    posts: (postRows ?? []).map((post) => ({ ...post, user: oneProfile(post.user) ?? undefined })) as TravelerPost[],
    replies: (replies.data ?? []).map((reply) => ({ ...reply, user: oneProfile(reply.user) ?? undefined })) as TravelerReply[],
    myReactions: reactionRows.reduce<Record<string, ReactionType>>((mine, row) => { if (row.user_id === userId) mine[row.post_id] = row.reaction; return mine; }, {}),
    followedUserIds: new Set((follows.data ?? []).map((row) => row.followed_id as string)),
    reactionCounts: reactionRows.reduce<Record<string, Record<ReactionType, number>>>((counts, row) => { const post = counts[row.post_id] ??= {} as Record<ReactionType, number>; post[row.reaction] = (post[row.reaction] ?? 0) + 1; return counts; }, {}),
  };
}

async function uploadPostImage(userId: string, asset: ImagePickerAsset, index: number) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600) });
  const rendered = await context.renderAsync();
  const file = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await fetch(file.uri).then((response) => response.arrayBuffer());
  const path = `${userId}/${Date.now()}-${index}.jpg`;
  const { error } = await supabase.storage.from('traveler-posts').upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return { path, url: supabase.storage.from('traveler-posts').getPublicUrl(path).data.publicUrl };
}

export async function createTravelerPost(userId: string, body: string, assets: ImagePickerAsset[] = [], location?: SharedLocation, topic: TravelerTopic = 'general', recommendation?: DestinationRecommendation) {
  if (assets.length > 5) throw new Error('Podés adjuntar un máximo de 5 imágenes.');
  const uploads = await Promise.all(assets.map(async (asset, index) => {
    try { return { image: await uploadPostImage(userId, asset, index) }; }
    catch (error) { return { error }; }
  }));
  const images = uploads.flatMap((result) => result.image ? [result.image] : []);
  const uploadError = uploads.find((result) => result.error)?.error;
  if (uploadError) {
    if (images.length) await supabase.storage.from('traveler-posts').remove(images.map((image) => image.path));
    throw uploadError;
  }
  const { error } = await supabase.from('traveler_posts').insert({
    user_id: userId,
    body: body.trim(),
    image_url: images[0]?.url ?? null,
    image_urls: images.map((image) => image.url),
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    recommended_destination_id: recommendation?.id ?? null,
    recommended_destination_is_community: recommendation?.community ?? false,
    topic,
  });
  if (error) {
    if (images.length) await supabase.storage.from('traveler-posts').remove(images.map((image) => image.path));
    throw error;
  }
}

export async function addTravelerReply(postId: string, userId: string, body: string, parentReplyId?: string) {
  const { error } = await supabase.from('traveler_replies').insert({ post_id: postId, user_id: userId, body: body.trim(), parent_reply_id: parentReplyId ?? null });
  if (error) throw error;
}

export async function setTravelerReaction(postId: string, userId: string, reaction: ReactionType, current?: ReactionType) {
  const query = current === reaction
    ? supabase.from('traveler_reactions').delete().eq('user_id', userId).eq('post_id', postId)
    : supabase.from('traveler_reactions').upsert({ user_id: userId, post_id: postId, reaction });
  const { error } = await query;
  if (error) throw error;
}

export async function toggleTravelerFollow(userId: string, followedId: string, followed: boolean) {
  if (userId === followedId) throw new Error('No se puede seguir esta misma cuenta.');
  const query = followed
    ? supabase.from('user_follows').delete().eq('follower_id', userId).eq('followed_id', followedId)
    : supabase.from('user_follows').upsert(
      { follower_id: userId, followed_id: followedId },
      { ignoreDuplicates: true, onConflict: 'follower_id,followed_id' },
    );
  const { error } = await query;
  if (error) throw error;
}

export async function blockTraveler(blockedId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id === blockedId) throw new Error('No se puede bloquear esta cuenta.');
  const { error } = await supabase.from('user_blocks').upsert({ blocker_id: auth.user.id, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockTraveler(blockedId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Debés iniciar sesión para desbloquear esta cuenta.');
  const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', auth.user.id).eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function getFollowedTravelerIds(userId?: string) {
  if (!userId) return new Set<string>();
  const { data, error } = await supabase.from('user_follows').select('followed_id').eq('follower_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.followed_id as string));
}
