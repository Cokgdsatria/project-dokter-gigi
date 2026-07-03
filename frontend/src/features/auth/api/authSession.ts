import type { AuthUser } from './authApi';

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

export function setAuthSession(accessToken: string, tokenType: string, user?: AuthUser | null) {
  session.accessToken = accessToken;
  session.tokenType = tokenType;
  session.user = user ?? null;
}

export function getAuthSession() {
  return session;
}

export function clearAuthSession() {
  session.accessToken = null;
  session.tokenType = null;
  session.user = null;
}
