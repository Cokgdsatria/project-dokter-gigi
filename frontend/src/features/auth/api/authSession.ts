import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthUser } from './authApi';

const SESSION_KEY = 'cekgigi.auth-session.v1';

type AuthSession = {
  accessToken: string | null;
  tokenType: string | null;
  user: AuthUser | null;
};

const session: AuthSession = {
  accessToken: null,
  tokenType: null,
  user: null,
};

let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function replaceSession(next: AuthSession) {
  session.accessToken = next.accessToken;
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

async function readPersistedSession() {
  const raw = 
     Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.tokenType !== 'string') {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      tokenType: parsed.tokenType,
      user: parsed.user ?? null,
    };
}

export async function hydrateSession() {
  try {
    const stored = await readPersistedSession();
    if (stored) replaceSession(stored);
  } catch {
    await clearAuthSession();
  } finally {
    hydrated = true;
    notify();
  }
}

export async function setAuthSession(
  accessToken: string,
  tokenType: string,
  user?: AuthUser | null,
) {
  const next = { accessToken, tokenType, user: user ?? null };
  await persistSession(next);
  replaceSession(next);
}

export async function clearAuthSession() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }

  replaceSession({ accessToken: null, tokenType: null, user: null });
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
