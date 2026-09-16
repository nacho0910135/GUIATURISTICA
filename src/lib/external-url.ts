import { Linking } from 'react-native';

export function openExternalUrl(value: string, allowedProtocols = ['https:']) {
  const url = new URL(value);
  if (!allowedProtocols.includes(url.protocol)) throw new Error('unsupported_url_protocol');
  return Linking.openURL(url.toString());
}
