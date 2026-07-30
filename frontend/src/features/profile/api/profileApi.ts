import { apiRequest } from '../../../shared/api/client';
import type { AuthUser } from '../../auth/api/authApi';
import { getAuthSession } from '../../auth/api/authSession';

type ProfileResponse = {
    success: boolean;
    message: string;
    data: AuthUser
};

export type UpdateProfilePayload = {
    fullname: string;
    phone: string;
    position: string;
};


function authHeaders() {
    const session = getAuthSession();

    if (!session.accessToken) {
        throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    }

    return {
        Authorization: `Bearer ${session.accessToken}`,
    };
}

export async function getProfile() {
    const response = await apiRequest<ProfileResponse>('/api/v1/profile', {
        headers: authHeaders(),
    });

    return response.data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
    const response = await apiRequest<ProfileResponse>('/api/v1/profile', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });

    return response.data;
}