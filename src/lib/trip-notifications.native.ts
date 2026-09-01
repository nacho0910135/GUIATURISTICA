import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { scheduleFerryReminder, type FerryRoute, type TripPlan } from '@/lib/logistics';

export async function scheduleTripReminders(plan: TripPlan, ferry?: FerryRoute | null) {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('EXPO_GO_NOTIFICATIONS_UNAVAILABLE');
  }
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('PERMISSION_DENIED');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('trip', { name: 'Mi viaje', importance: Notifications.AndroidImportance.HIGH });
  const schedule = async (date: Date, title: string, body: string) => {
    if (date.getTime() <= Date.now() + 30_000) return;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'trip' } });
  };
  const start = new Date(plan.startsAt);
  await schedule(new Date(start.getTime() - 30 * 60 * 1000), 'Mi viaje', 'Tu ruta empieza en 30 minutos. Revisá agua, documentos y transporte.');
  await Promise.all(plan.stops.map((stop) => schedule(new Date(new Date(stop.arrivalAt).getTime() - 15 * 60 * 1000), `Check-in: ${stop.destination.name}`, 'Llegás en 15 minutos. Confirmá horario y condiciones de ingreso.')));
  if (ferry) await scheduleFerryReminder(ferry);
}
