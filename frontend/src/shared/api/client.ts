import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000');

type ApiRequestOptions = RequestInit & {
  formUrlEncoded?: boolean;
};

function parseJsonBody(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getApiErrorMessage(data: any) {
  const message = data?.detail ?? data?.message ?? 'Terjadi kesalahan pada server';
  if (Array.isArray(message)) {
    return message[0]?.msg ?? 'Request tidak valid';
  }

  return typeof message === 'string' && message.trim() ? message : 'Terjadi kesalahan pada server';
}

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
  const data = parseJsonBody(text);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  return data as T;
}
