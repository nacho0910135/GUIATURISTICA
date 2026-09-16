import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { headingDegrees, smoothHeading } from '@/lib/compass';
import { isUsablePosition, LOCATION_MAX_ACCURACY_METERS, LOCATION_MAX_AGE_MS } from '@/lib/location-quality';

export function useCompass(retry: number) {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [locationStatus, setLocationStatus] = useState('waiting');
  const [sensorStatus, setSensorStatus] = useState('waiting');
  const [degrees, setDegrees] = useState<number | null>(null);
  const rotation = useSharedValue(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!active || !focused) return;
    let disposed = false;
    const subscriptions: { remove(): void }[] = [];
    const keep = (subscription: { remove(): void }) => disposed ? subscription.remove() : subscriptions.push(subscription);
    let latest: Location.LocationHeadingObject | null = null;
    let filtered: number | null = null;
    let magneticAt = 0;
    let fix: Location.LocationObject | null = null;
    setSensorStatus(Platform.OS === 'web' ? 'unavailable' : 'waiting');
    setLocationStatus('waiting');

    async function start() {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
        if (disposed) return;
        if (!permission.granted) { setLocationStatus('denied'); return; }
        const cached = await Location.getLastKnownPositionAsync({ maxAge: LOCATION_MAX_AGE_MS, requiredAccuracy: LOCATION_MAX_ACCURACY_METERS });
        if (!disposed && cached && !cached.mocked && isUsablePosition(cached)) {
          fix = cached; setPosition(cached); setLocationStatus('ready');
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (disposed) return;
        fix = current;
        const valid = !current.mocked && isUsablePosition(current);
        setPosition(valid ? current : null);
        setLocationStatus(valid ? 'ready' : 'imprecise');
      } catch { if (!disposed) setLocationStatus('error'); }
    }
    async function sensors() {
      if (Platform.OS === 'web') return;
      try {
        if (!await Magnetometer.isAvailableAsync()) { if (!disposed) setSensorStatus('unavailable'); return; }
        if (disposed) return;
        const permission = await Magnetometer.requestPermissionsAsync();
        if (disposed) return;
        if (!permission.granted) { setSensorStatus('denied'); return; }
        // Native heading supplies tilt compensation and magnetic declination.
        // atan2(x,y) alone cannot correctly orient a geographic map.
        keep(await Location.watchHeadingAsync((value) => { if (!disposed) latest = value; }));
        if (disposed) return;
        Magnetometer.setUpdateInterval(50);
        keep(Magnetometer.addListener(({ x, y, z }) => {
          if (disposed) return;
          const strength = Math.hypot(x, y, z);
          magneticAt = Date.now();
          const heading = latest && headingDegrees(latest);
          if (!Number.isFinite(strength) || strength < 10 || strength > 100 || heading === null) {
            setSensorStatus('calibrate'); setDegrees(null); return;
          }
          const firstReading = filtered === null;
          filtered = smoothHeading(filtered, heading);
          if (filtered === null) return;
          rotation.value = firstReading ? filtered : withTiming(filtered, { duration: 75 });
          setDegrees(filtered);
          setSensorStatus('ready');
        }));
      } catch { if (!disposed) setSensorStatus('unavailable'); }
    }
    void start().then(() => { if (!disposed) void sensors(); });
    const watchdog = setInterval(() => {
      if (fix && !isUsablePosition(fix)) { setPosition(null); setLocationStatus('imprecise'); }
      // Native headings emit only when direction changes; freshness is checked
      // against the continuous magnetometer stream, not a stationary heading.
      if (magneticAt && Date.now() - magneticAt > 3000) {
        setDegrees(null); setSensorStatus('calibrate');
      }
    }, 1000);
    const timeout = setTimeout(() => {
      if (!fix) setLocationStatus((status) => status === 'waiting' ? 'error' : status);
      if (!magneticAt) setSensorStatus((status) => status === 'waiting' ? 'unavailable' : status);
    }, 15000);
    return () => { disposed = true; subscriptions.forEach((subscription) => subscription.remove()); clearInterval(watchdog); clearTimeout(timeout); };
  }, [active, focused, retry, rotation]);
  return { degrees: active && focused ? degrees : null, locationStatus, position, rotation, sensorStatus };
}
