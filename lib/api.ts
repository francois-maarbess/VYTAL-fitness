import { Platform } from "react-native";

const DEV_API_HOST = Platform.select({
  android: "10.0.2.2",
  default: "localhost",
});

export function getApiBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/`;
  }
  return `http://${DEV_API_HOST}:8080/`;
}

export function getAuthHeaders(token?: string | null): Record<string, string> {
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}
