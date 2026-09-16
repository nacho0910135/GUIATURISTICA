import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { usePaidAccess } from '@/components/subscription-required';

const productionUnitId = Platform.select({
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID,
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS,
});

export function AdBanner({ hidden = false }: { hidden?: boolean }) {
  const access = usePaidAccess();
  const [ready, setReady] = useState(false);
  const shouldShow = !hidden && access.data?.trialDaysRemaining === 0 && !access.data.hasPersonalPlan;

  useEffect(() => {
    if (!shouldShow) { setReady(false); return; }
    let mounted = true;
    void mobileAds().initialize().then(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [shouldShow]);

  const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : productionUnitId;
  if (!shouldShow || !ready || !unitId) return null;

  return <View className="mt-2 items-center overflow-hidden">
    <BannerAd requestOptions={{ requestNonPersonalizedAdsOnly: true }} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} unitId={unitId} />
  </View>;
}
