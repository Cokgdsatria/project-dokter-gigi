import { API_BASE_URL } from '../../../shared/api/client';
import { getAuthSession } from '../../auth/api/authSession';

export type PatientOption = {
    id: string;
    medicalId: string;
    name: string;
    age?: number | null;
    gender?: string | null;
};

type PatientsResponse = {
    success: boolean;
    message: string;
    data: {
        total: number;
        items: PatientOption[];
    };
};

export async function searchPatients(query: string): Promise<PatientOption[]> {
    const session = getAuthSession();
    if (!session.accessToken) {
        throw new Error('Sesi login tidak ditemukan. Silakan login Ulang');
    }

    const params = new URLSearchParams({
        q: query,
        take: '5',
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/patients?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
        },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data?.detail || data?.message || 'Gagal mencari pasien');
    }

    return (data as PatientsResponse).data.items;
}