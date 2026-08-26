import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'descubriendo-cr-offline' });

export const queryStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => { storage.remove(key); },
};

export const offlineStorage = queryStorage;
