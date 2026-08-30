import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export type TravelerProfile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
export type SharedLocation = { latitude: number; longitude: number };
export type TravelerTopic = 'general' | 'moteros' | 'enduro' | 'convoy_4x4';
export type TravelerPost = { id: string; user_id: string; body: string; image_url: string | null; latitude: number | null; longitude: number | null; topic: TravelerTopic; created_at: string; user?: TravelerProfile };
export type ReactionType = 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';
export type TravelerReply = { id: string; post_id: string; parent_reply_id: string | null; user_id: string; body: string; created_at: string; user?: TravelerProfile };

export async function getTravelerWall(userId?: string, topic: TravelerTopic = 'general') {
  const postsQuery = supabase.from('traveler_posts').select('*, user:users!traveler_posts_user_id_fkey(id,username,full_name,avatar_url)').eq('topic', topic).order('created_at', { ascending: false }).limit(40);
  const [posts, replies, reactions, follows] = await Promise.all([
    postsQuery,
    supabase.from('traveler_replies').select('*, user:users(id,username,full_name,avatar_url)').order('created_at').limit(200),
    supabase.from('traveler_reactions').select('post_id,user_id,reaction'),
    userId ? supabase.from('user_follows').select('followed_id').eq('follower_id', userId) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = posts.error ?? replies.error ?? reactions.error ?? follows.error;
  if (error) throw error;
  const reactionRows = (reactions.data ?? []) as { post_id: string; user_id: string; reaction: ReactionType }[];
  return {
    posts: (posts.data ?? []) as TravelerPost[],
    replies: (replies.data ?? []) as TravelerReply[],
    myReactions: reactionRows.reduce<Record<string, ReactionType>>((mine, row) => { if (row.user_id === userId) mine[row.post_id] = row.reaction; return mine; }, {}),
    followedUserIds: new Set((follows.data ?? []).map((row) => row.followed_id as string)),
    reactionCounts: reactionRows.reduce<Record<string, Record<ReactionType, number>>>((counts, row) => { const post = counts[row.post_id] ??= {} as Record<ReactionType, number>; post[row.reaction] = (post[row.reaction] ?? 0) + 1; return counts; }, {}),
  };
}

async function uploadPostImage(userId: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600) });
  const rendered = await context.renderAsync();
  const file = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await fetch(file.uri).then((response) => response.arrayBuffer());
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('traveler-posts').upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('traveler-posts').getPublicUrl(path).data.publicUrl;
}

export async function createTravelerPost(userId: string, body: string, asset?: ImagePickerAsset, location?: SharedLocation, topic: TravelerTopic = 'general') {
  const imageUrl = asset ? await uploadPostImage(userId, asset) : null;
  const { error } = await supabase.from('traveler_posts').insert({
    user_id: userId,
    body: body.trim(),
    image_url: imageUrl,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    topic,
  });
  if (error) throw error;
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
  const query = followed
    ? supabase.from('user_follows').delete().eq('follower_id', userId).eq('followed_id', followedId)
    : supabase.from('user_follows').insert({ follower_id: userId, followed_id: followedId });
  const { error } = await query;
  if (error) throw error;
}

export async function getFollowedTravelerIds(userId?: string) {
  if (!userId) return new Set<string>();
  const { data, error } = await supabase.from('user_follows').select('followed_id').eq('follower_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.followed_id as string));
}
