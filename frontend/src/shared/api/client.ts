import { authenticatedFetch } from '../../features/auth/api/authSession';
import { API_BASE_URL } from './config';

export { API_BASE_URL } from './config';

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
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
  const { authenticated = false, formUrlEncoded = false, headers, ...requestOptions } = options;
  const request = authenticated ? authenticatedFetch : fetch;
  const response = await request(`${API_BASE_URL}${path}`, {
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
