import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

type NotificationTarget = { actorId?: string | null; targetId?: string | null; type?: string | null };

export async function openNotification({ actorId, targetId, type }: NotificationTarget) {
  if (!type) return false;
  if (['comment', 'like', 'new_post'].includes(type) && targetId) router.push({ pathname: '/(tabs)/friends', params: { postId: targetId } });
  else if (['comment_reply', 'comment_reaction'].includes(type) && targetId) {
    const { data } = await supabase.from('traveler_replies').select('post_id').eq('id', targetId).maybeSingle();
    if (!data?.post_id) return false;
    router.push({ pathname: '/(tabs)/friends', params: { postId: data.post_id, commentId: targetId } });
  } else if (type === 'message' && actorId) router.push({ pathname: '/(aux)/private-messages', params: { partnerId: actorId } });
  else if (type === 'follow' && (actorId || targetId)) router.push({ pathname: '/(aux)/traveler-profile', params: { id: actorId ?? targetId! } });
  else if (type === 'new_destination' && targetId) router.push({ pathname: '/(aux)/province', params: { destinationId: targetId, direct: '1' } });
  else if (type === 'new_business' && targetId) router.push({ pathname: '/(tabs)/commerce', params: { serviceId: targetId } });
  else if (['ride_attendance', 'ride_comment', 'ride_cancelled'].includes(type)) router.push('/(tabs)/friends');
  else if (type === 'claim_verified') router.push({ pathname: '/(tabs)/profile', params: { section: 'suggestions' } });
  else if (type === 'admin_approval') router.push({ pathname: '/(tabs)/profile', params: { section: 'suggestions' } });
  else if (['review', 'photo_featured'].includes(type) && targetId) {
    const request = type === 'review'
      ? supabase.from('reviews').select('target_id').eq('id', targetId).eq('target_type', 'destination').maybeSingle()
      : supabase.from('destination_user_photos').select('destination_id').eq('id', targetId).maybeSingle();
    const { data } = await request;
    const destinationId = data && ('target_id' in data ? data.target_id : data.destination_id);
    if (!destinationId) return false;
    router.push({ pathname: '/(aux)/province', params: { destinationId, direct: '1' } });
  } else return false;
  return true;
}
