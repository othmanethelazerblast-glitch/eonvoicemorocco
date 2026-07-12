import * as SecureStore from "expo-secure-store";

/** Clerk's recommended persistent token cache for Expo (Keychain/Keystore). */
export const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};
