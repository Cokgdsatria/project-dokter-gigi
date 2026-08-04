import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../../../shared/api/config';
import type { AuthUser } from './authApi';

const SESSION_KEY = 'cekgigi.auth-session.v2';
const LEGACY_SESSION_KEY = 'cekgigi.auth-session.v1';

export type AuthSession = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  user: AuthUser | null;
};

export type AuthTokenPayload = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: AuthUser | null;
};

const session: AuthSession = {
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  user: null,
};

let hydrated = false;
let refreshPromise: Promise<string> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function replaceSession(next: AuthSession) {
  session.accessToken = next.accessToken;
  session.refreshToken = next.refreshToken;
  session.tokenType = next.tokenType;
  session.user = next.user;
  notify();
}

async function persistSession(next: AuthSession) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(next));
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next));
}

async function readPersistedSession(): Promise<AuthSession | null> {
  const raw =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);

  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as Partial<AuthSession>;
  if (
    typeof parsed.accessToken !== 'string' ||
    typeof parsed.refreshToken !== 'string' ||
    typeof parsed.tokenType !== 'string'
  ) {
    return null;
  }

  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    tokenType: parsed.tokenType,
    user: parsed.user ?? null,
  };
}

export async function hydrateSession() {
  try {
    const stored = await readPersistedSession();
    if (stored) {
      replaceSession(stored);
    } else {
      await clearAuthSession();
    }
  } catch {
    await clearAuthSession();
  } finally {
    hydrated = true;
    notify();
  }
}

export async function setAuthSession(next: {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user?: AuthUser | null;
}) {
  const normalized: AuthSession = {
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    tokenType: next.tokenType,
    user: next.user ?? null,
  };
  await persistSession(normalized);
  replaceSession(normalized);
}

export async function clearAuthSession() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    globalThis.localStorage?.removeItem(LEGACY_SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY);
  }

  replaceSession({
    accessToken: null,
    refreshToken: null,
    tokenType: null,
    user: null,
  });
}

async function performRefresh(): Promise<string> {
  if (!session.refreshToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  const data = (await response.json().catch(() => null)) as AuthTokenPayload | null;

  if (!response.ok || !data?.access_token || !data.refresh_token) {
    await clearAuthSession();
    throw new Error('Sesi sudah berakhir. Silakan login ulang.');
  }

  await setAuthSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    user: data.user ?? session.user,
  });
  return data.access_token;
}

export async function refreshAuthSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  if (!session.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const execute = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers });
  };

  let response = await execute(session.accessToken);
  if (response.status === 401 && session.refreshToken) {
    const accessToken = await refreshAuthSession();
    response = await execute(accessToken);
  }
  return response;
}

export async function logoutAuthSession() {
  const refreshToken = session.refreshToken;
  try {
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } catch {
    // Local logout must still complete when the API is unreachable.
  } finally {
    await clearAuthSession();
  }
}

export function getAuthSession() {
  return session;
}

export function isAuthSessionHydrated() {
  return hydrated;
}

export function subscribeAuthSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
