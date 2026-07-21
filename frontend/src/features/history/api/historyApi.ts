import { API_BASE_URL } from '../../../shared/api/client';
import { getAuthSession } from '../../auth/api/authSession';
import type { AuthUser } from '../../auth/api/authApi';
import type { DiagnosisPrediction } from '../../diagnosis/api/diagnosisApi';

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
  patient?: unknown;
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

function parseHistoryError(data: any) {
  const message = data?.detail ?? data?.message ?? 'Gagal mengambil riwayat';
  return typeof message === 'string' && message.trim() ? message : 'Gagal mengambil riwayat';
}

export async function getHistory(): Promise<HistoryItem[]> {
  const session = getAuthSession();
  if (!session.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/history`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(parseHistoryError(data));
  }

  return (data as HistoryResponse).data.items;
}
export async function getHistoryDetail(id: string): Promise<HistoryDetail> {
  const session = getAuthSession();
  if (!session.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/history/${id}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(parseHistoryError(data));
  }

  return (data as HistoryDetailResponse).data;
}


