module.exports = ({ config }) => {
  const existingPlugins = config.plugins || [];

  const plugins = [
    ...existingPlugins,
    'expo-asset',
    'expo-sqlite',
    'expo-secure-store',
    'expo-image',
    'expo-video',
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
