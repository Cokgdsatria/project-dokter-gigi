import { apiRequest } from '../../../shared/api/client';

export type AuthUser = {
  id: string;
  email: string;
  fullname: string;
  phone?: string | null;
  position?: string | null;
  role: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  user?: AuthUser | null;
};

type RegisterResponse = TokenResponse & {
  user: AuthUser;
};

type RegisterPayload = {
  email: string;
  password: string;
  fullname: string;
  phone?: string;
  position: string;
};

export async function login(payload: { email: string; password: string }) {
  const body = new URLSearchParams({
    username: payload.email,
    password: payload.password,
  });

  return apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: body.toString(),
    formUrlEncoded: true,
  });
}

export async function register(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

