module.exports = ({ config }) => {
  const existingPlugins = config.plugins || [];

  const plugins = [
    ...existingPlugins,
    'expo-asset',
    'expo-sqlite',
    'expo-secure-store',
    'expo-image',
    'expo-web-browser',
    'expo-status-bar',
    'expo-notifications',
    '@react-native-firebase/app',
    [
      '@react-native-firebase/analytics',
      { ios: { withoutAdIdSupport: true } },
    ],
    '@react-native-firebase/crashlytics',
    '@react-native-firebase/app-check',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
      },
    ],
    [
      'expo-build-properties',
      { ios: { useFrameworks: 'static' } },
    ],
    '@react-native-community/datetimepicker',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN || '',
      },
    ],
  ];

  return {
    ...config,
    plugins,
  };
};
