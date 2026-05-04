import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'vocal-teleprompter' });

export const mmkvPersistConfig = {
  setItem: (key: string, value: string) => storage.set(key, value),
  getItem: (key: string) => storage.getString(key) ?? null,
  removeItem: (key: string) => storage.remove(key),
};
