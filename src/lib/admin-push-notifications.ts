import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export async function registerAdminPushToken(userId: string) {
  // Expo Go for Android cannot load the remote-push implementation since SDK 53.
  // Keep it out of the module initialization path and enable it in real builds.
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo' || !Device.isDevice) return;
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('admin-moderation', { name: 'Moderación administrativa', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('No se encontró el projectId de EAS.');
  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.from('admin_push_tokens').upsert({ user_id: userId, expo_push_token: expoPushToken, platform: Platform.OS, active: true, last_seen_at: new Date().toISOString() }, { onConflict: 'expo_push_token' });
  if (error) throw error;
}
