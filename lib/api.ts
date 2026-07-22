export function getApiBaseUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/`;
  }
  return 'http://192.168.1.7:8080/';
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { getToken } = await import('@clerk/clerk-expo');
    const token = await getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}
