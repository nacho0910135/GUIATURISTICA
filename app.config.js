const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

module.exports = ({ config }) => {
  const plugins = config.plugins.map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name !== 'react-native-google-mobile-ads') return plugin;
    return [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || TEST_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID || TEST_IOS_APP_ID,
        delayAppMeasurementInit: true,
      },
    ];
  });
  plugins.push(['expo-audio', { microphonePermission: false, recordAudioAndroid: false }]);
  plugins.push('expo-asset');
  plugins.push(['expo-location', { locationWhenInUsePermission: 'Permitir que Descubriendo CR comparta tu ubicación cuando vos lo elijás.' }]);
  return { ...config, plugins };
};
