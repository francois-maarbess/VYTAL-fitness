import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export function createTokenCache() {
  if (Platform.OS === "web") {
    return {
      getToken: async (key: string) => {
        try { return localStorage.getItem(key); } catch { return null; }
      },
      saveToken: async (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch {}
      },
      clearToken: async (key: string) => {
        try { localStorage.removeItem(key); } catch {}
      },
    };
  }

  return {
    getToken: async (key: string) => {
      try { return await SecureStore.getItemAsync(key); } catch { return null; }
    },
    saveToken: async (key: string, value: string) => {
      try { await SecureStore.setItemAsync(key, value); } catch {}
    },
    clearToken: async (key: string) => {
      try { await SecureStore.deleteItemAsync(key); } catch {}
    },
  };
}

export const tokenCache = createTokenCache();
