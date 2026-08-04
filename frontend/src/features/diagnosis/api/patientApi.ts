import { apiRequest } from '../../../shared/api/client';

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
    const params = new URLSearchParams({
        q: query,
        take: '5',
    });

    const response = await apiRequest<PatientsResponse>(
      `/api/v1/patients?${params.toString()}`,
      {
        authenticated: true,
      },
    );
    return response.data.items;
}
