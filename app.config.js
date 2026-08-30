module.exports = ({ config }) => {
  const plugins = [...config.plugins];
  plugins.push('expo-asset');
  plugins.push('expo-sqlite');
  plugins.push('expo-secure-store');
  plugins.push(['expo-location', { locationWhenInUsePermission: 'Permitir que Descubriendo CR comparta tu ubicación cuando vos lo elijás.' }]);
  return { ...config, plugins };
};
