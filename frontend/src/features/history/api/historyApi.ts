import { apiRequest } from '../../../shared/api/client';
import type { AuthUser } from '../../auth/api/authApi';
import type { DiagnosisPrediction } from '../../diagnosis/api/diagnosisApi';

export type Patient = {
  id: string;
  medicalId: string;
  name: string;
  age?: number | null;
  gender?: string | null;
};

export type HistoryItem = {
  id: string;
  resultNumber?: string | null;
  status: string;
  resultLabel?: string | null;
  resultConfidence?: number | null;
  imageUrl?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  homebaseType?: string | null;
  homebaseName?: string | null;
  patient?: Patient | null;
  createdAt: string;
  processedAt?: string | null;
  errorMessage?: string | null;
};

export type HistoryDetail = HistoryItem & {
  imageWidth?: number | null;
  imageHeight?: number | null;
  homebaseAddress: string;
  diagnosisAwal: string[];
  catatanDokter?: string | null;
  predictions?: DiagnosisPrediction[];
  doctor?: AuthUser | null;
};

type HistoryDetailResponse = {
  success: boolean;
  message: string;
  data: HistoryDetail;
};

type HistoryResponse = {
  success: boolean;
  message: string;
  data: {
    total: number;
    items: HistoryItem[];
  };
};

export async function getHistory(): Promise<HistoryItem[]> {
  const response = await apiRequest<HistoryResponse>('/api/v1/history', {
    authenticated: true,
  });
  return response.data.items;
}

export async function getHistoryDetail(id: string): Promise<HistoryDetail> {
  const response = await apiRequest<HistoryDetailResponse>(`/api/v1/history/${id}`, {
    authenticated: true,
  });
  return response.data;
}


