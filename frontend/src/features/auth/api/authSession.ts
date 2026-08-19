import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../../../shared/api/config';
import type { AuthUser } from './authApi';

const SESSION_KEY = 'radia.auth-session.v3';
const LEGACY_SESSION_KEYS = ['cekgigi.auth-session.v2', 'cekgigi.auth-session.v1'];
const DEFAULT_SESSION_TIMEOUT_MINUTES = 8 * 60;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

function getSessionTimeoutMs() {
  const configuredMinutes = Number(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES);
  const timeoutMinutes =
    Number.isFinite(configuredMinutes) && configuredMinutes > 0
      ? configuredMinutes
      : DEFAULT_SESSION_TIMEOUT_MINUTES;
  return timeoutMinutes * 60 * 1000;
}

export type AuthSession = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  user: AuthUser | null;
  sessionExpiresAt: number | null;
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
  sessionExpiresAt: null,
};

let hydrated = false;
let refreshPromise: Promise<string> | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function scheduleSessionExpiry(expiresAt: number | null) {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  if (!expiresAt) {
    return;
  }

  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) {
    void clearAuthSession();
    return;
  }

  expiryTimer = setTimeout(() => {
    if (expiresAt <= Date.now()) {
      void clearAuthSession();
      return;
    }
    scheduleSessionExpiry(expiresAt);
  }, Math.min(remainingMs, MAX_TIMER_DELAY_MS));
}

function replaceSession(next: AuthSession) {
  session.accessToken = next.accessToken;
  session.refreshToken = next.refreshToken;
  session.tokenType = next.tokenType;
  session.user = next.user;
  session.sessionExpiresAt = next.sessionExpiresAt;
  scheduleSessionExpiry(next.sessionExpiresAt);
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
    typeof parsed.tokenType !== 'string' ||
    typeof parsed.sessionExpiresAt !== 'number' ||
    !Number.isFinite(parsed.sessionExpiresAt) ||
    parsed.sessionExpiresAt <= Date.now()
  ) {
    return null;
  }

  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    tokenType: parsed.tokenType,
    user: parsed.user ?? null,
    sessionExpiresAt: parsed.sessionExpiresAt,
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
  sessionExpiresAt?: number;
}) {
  const normalized: AuthSession = {
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    tokenType: next.tokenType,
    user: next.user ?? null,
    sessionExpiresAt: next.sessionExpiresAt ?? Date.now() + getSessionTimeoutMs(),
  };
  await persistSession(normalized);
  replaceSession(normalized);
}

export async function clearAuthSession() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    LEGACY_SESSION_KEYS.forEach((key) => globalThis.localStorage?.removeItem(key));
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await Promise.all(LEGACY_SESSION_KEYS.map((key) => SecureStore.deleteItemAsync(key)));
  }

  replaceSession({
    accessToken: null,
    refreshToken: null,
    tokenType: null,
    user: null,
    sessionExpiresAt: null,
  });
}

async function requireActiveSession(): Promise<string> {
  if (
    !session.accessToken ||
    !session.refreshToken ||
    !session.sessionExpiresAt ||
    session.sessionExpiresAt <= Date.now()
  ) {
    await clearAuthSession();
    throw new Error('Sesi sudah berakhir. Silakan login ulang.');
  }

  return session.accessToken;
}

async function performRefresh(): Promise<string> {
  await requireActiveSession();
  const refreshToken = session.refreshToken!;
  const sessionExpiresAt = session.sessionExpiresAt!;

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = (await response.json().catch(() => null)) as AuthTokenPayload | null;

  if (!response.ok || !data?.access_token || !data.refresh_token) {
    await clearAuthSession();
    throw new Error('Sesi sudah berakhir. Silakan login ulang.');
  }

  if (sessionExpiresAt <= Date.now()) {
    await clearAuthSession();
    throw new Error('Sesi sudah berakhir. Silakan login ulang.');
  }

  await setAuthSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    user: data.user ?? session.user,
    sessionExpiresAt,
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
  const currentAccessToken = await requireActiveSession();

  const execute = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers });
  };

  let response = await execute(currentAccessToken);
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
