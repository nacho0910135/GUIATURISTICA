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