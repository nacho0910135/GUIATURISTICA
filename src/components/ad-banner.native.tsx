import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import mobileAds, { AdsConsent, BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

let initialization: Promise<boolean> | undefined;

function initializeAds() {
  initialization ??= AdsConsent.gatherConsent()
    .then(async ({ canRequestAds }) => {
      if (!canRequestAds) return false;
      await mobileAds().initialize();
      return true;
    })
    .catch(() => false);
  return initialization;
}

export function AdBanner({ hidden = false }: { hidden?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (hidden) return;
    void initializeAds().then(setReady);
  }, [hidden]);

  const productionId = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  });
  const unitId = __DEV__ ? TestIds.BANNER : productionId;
  if (hidden || !ready || !unitId) return null;
  return (
    <View className="items-center bg-mint-50 py-2 dark:bg-forest-950">
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
