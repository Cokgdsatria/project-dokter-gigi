type AuthSession = {
  accessToken: string | null;
  tokenType: string | null;
};

const session: AuthSession = {
  accessToken: null,
  tokenType: null,
};

export function setAuthSession(accessToken: string, tokenType: string) {
  session.accessToken = accessToken;
  session.tokenType = tokenType;
}

export function getAuthSession() {
  return session;
}

export function clearAuthSession() {
  session.accessToken = null;
  session.tokenType = null;
}
