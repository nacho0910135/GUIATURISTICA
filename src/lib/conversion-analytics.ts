import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

export async function trackConversion(name: string, params?: Record<string, string | number | boolean>) {
  try { logEvent(getAnalytics(), name, params); } catch { /* La medición nunca debe bloquear el viaje ni el pago. */ }
}
