import { apiRequest } from '@/shared/api/client';

type TokenResponse = {
  access_token: string;
  token_type: string;
};

type RegisterResponse = TokenResponse & {
  user: {
    id: string;
    email: string;
    fullname: string;
    phone?: string | null;
    position?: string | null;
    role: string;
  };
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
