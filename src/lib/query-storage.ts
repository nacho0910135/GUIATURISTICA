type StorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memory = new Map<string, string>();

export const queryStorage: StorageAdapter = {
  getItem: (key) => typeof localStorage === 'undefined' ? (memory.get(key) ?? null) : localStorage.getItem(key),
  setItem: (key, value) => typeof localStorage === 'undefined' ? memory.set(key, value) : localStorage.setItem(key, value),
  removeItem: (key) => typeof localStorage === 'undefined' ? void memory.delete(key) : localStorage.removeItem(key),
};

export const offlineStorage = queryStorage;
