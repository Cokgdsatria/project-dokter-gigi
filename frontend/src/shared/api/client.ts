import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000');

type ApiRequestOptions = RequestInit & {
  formUrlEncoded?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { formUrlEncoded = false, headers, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(formUrlEncoded ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(!formUrlEncoded && requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.detail ?? 'Terjadi kesalahan pada server';
    throw new Error(Array.isArray(message) ? message[0]?.msg ?? 'Request tidak valid' : message);
  }

  return data as T;
}
