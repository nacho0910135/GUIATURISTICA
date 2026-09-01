module.exports = ({ config }) => {
  const plugins = [...config.plugins];
  plugins.push('expo-asset');
  plugins.push('expo-sqlite');
  plugins.push('expo-secure-store');
  plugins.push('expo-image');
  plugins.push('expo-web-browser');
  plugins.push('expo-status-bar');
  return { ...config, plugins };
};
