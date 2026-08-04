import { apiRequest } from '../../../shared/api/client';
import type { AuthUser } from '../../auth/api/authApi';

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


export async function getProfile() {
    const response = await apiRequest<ProfileResponse>('/api/v1/profile', {
        authenticated: true,
    });

    return response.data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
    const response = await apiRequest<ProfileResponse>('/api/v1/profile', {
        method: 'PUT',
        authenticated: true,
        body: JSON.stringify(payload),
    });

    return response.data;
}
