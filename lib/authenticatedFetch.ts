import { getApiBaseUrl } from './api';

export async function authenticatedFetch(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });
}
