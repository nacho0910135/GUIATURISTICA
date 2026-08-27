import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export type TravelerProfile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
export type TravelerPost = { id: string; user_id: string; body: string; image_url: string | null; created_at: string; user?: TravelerProfile };
export type TravelerReply = { id: string; post_id: string; user_id: string; body: string; created_at: string; user?: TravelerProfile };

export async function getTravelerWall(userId?: string) {
  const [posts, replies, likes, follows] = await Promise.all([
    supabase.from('traveler_posts').select('*, user:users(id,username,full_name,avatar_url)').order('created_at', { ascending: false }).limit(40),
    supabase.from('traveler_replies').select('*, user:users(id,username,full_name,avatar_url)').order('created_at').limit(200),
    userId ? supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'traveler_post') : Promise.resolve({ data: [], error: null }),
    userId ? supabase.from('user_follows').select('followed_id').eq('follower_id', userId) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = posts.error ?? replies.error ?? likes.error ?? follows.error;
  if (error) throw error;
  const postIds = (posts.data ?? []).map((post) => post.id as string);
  const { data: allLikes, error: likesError } = postIds.length
    ? await supabase.from('likes').select('target_id').eq('target_type', 'traveler_post').in('target_id', postIds)
    : { data: [], error: null };
  if (likesError) throw likesError;
  return {
    posts: (posts.data ?? []) as TravelerPost[],
    replies: (replies.data ?? []) as TravelerReply[],
    likedPostIds: new Set((likes.data ?? []).map((row) => row.target_id as string)),
    followedUserIds: new Set((follows.data ?? []).map((row) => row.followed_id as string)),
    likeCounts: (allLikes ?? []).reduce<Record<string, number>>((counts, row) => { counts[row.target_id] = (counts[row.target_id] ?? 0) + 1; return counts; }, {}),
  };
}

async function uploadPostImage(userId: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600), height: null });
  const rendered = await context.renderAsync();
  const file = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await fetch(file.uri).then((response) => response.arrayBuffer());
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('traveler-posts').upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('traveler-posts').getPublicUrl(path).data.publicUrl;
}

export async function createTravelerPost(userId: string, body: string, asset?: ImagePickerAsset) {
  const imageUrl = asset ? await uploadPostImage(userId, asset) : null;
  const { error } = await supabase.from('traveler_posts').insert({ user_id: userId, body: body.trim(), image_url: imageUrl });
  if (error) throw error;
}

export async function addTravelerReply(postId: string, userId: string, body: string) {
  const { error } = await supabase.from('traveler_replies').insert({ post_id: postId, user_id: userId, body: body.trim() });
  if (error) throw error;
}

export async function toggleTravelerLike(postId: string, userId: string, liked: boolean) {
  const query = liked
    ? supabase.from('likes').delete().eq('user_id', userId).eq('target_type', 'traveler_post').eq('target_id', postId)
    : supabase.from('likes').insert({ user_id: userId, target_type: 'traveler_post', target_id: postId });
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
