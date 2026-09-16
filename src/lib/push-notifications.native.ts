import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { openNotification } from '@/lib/notification-route';
import { supabase } from '@/lib/supabase';

let token: string | undefined;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

export async function registerPushNotifications() {
  await Notifications.setNotificationChannelAsync('default', { name: 'Descubriendo CR', importance: Notifications.AndroidImportance.HIGH });
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === 'granted' ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return false;
  token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc('register_push_token', { p_expo_push_token: token, p_platform: Platform.OS });
  if (error) throw error;
  return true;
}

export async function unregisterPushNotifications() {
  const { error } = await supabase.rpc('unregister_all_push_tokens');
  if (error) throw error;
  token = undefined;
}

export function observePushNotifications() {
  const open = (notification: Notifications.Notification) => {
    const data = notification.request.content.data ?? {};
    void openNotification({ actorId: typeof data.actorId === 'string' ? data.actorId : null, targetId: typeof data.targetId === 'string' ? data.targetId : null, type: typeof data.type === 'string' ? data.type : null });
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) open(last.notification);
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => open(response.notification));
  return () => subscription.remove();
}
