import { File as ExpoFile, UploadType } from 'expo-file-system';

import { API_BASE_URL } from '../../../shared/api/client';
import { getAuthSession } from '../../auth/api/authSession';
import type { DiagnosisDraft } from '../state/diagnosisDraft';

export type DiagnosisResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: 'DONE' | 'FAILED' | string;
    resultLabel?: string | null;
    resultConfidence?: number | null;
    errorMessage?: string | null;
  };
};

function getImageFileName(uri: string, fallbackName?: string) {
  return fallbackName || uri.split('/').pop() || `rontgen-${Date.now()}.jpg`;
}

function getImageMimeType(fileName: string, fallbackMimeType?: string) {
  if (fallbackMimeType) {
    return fallbackMimeType;
  }

  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerFileName.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

export async function diagnoseDentalImage(draft: DiagnosisDraft): Promise<DiagnosisResponse> {
  const session = getAuthSession();
  if (!session.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const fileName = getImageFileName(draft.imageUri, draft.imageName);
  const mimeType = getImageMimeType(fileName, draft.imageMimeType);
  const imageFile = new ExpoFile(draft.imageUri);

  const uploadResult = await imageFile.upload(`${API_BASE_URL}/api/v1/diagnose`, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    parameters: {
      homebaseType: draft.homebaseType,
      homebaseName: draft.homebaseName,
      homebaseAddress: draft.homebaseAddress,
      diagnosisAwal: JSON.stringify(draft.diagnoses),
      ...(draft.doctorNote?.trim() ? { catatanDokter: draft.doctorNote.trim() } : {}),
      fileName,
    },
  });

  const data = uploadResult.body ? JSON.parse(uploadResult.body) : null;

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    const detail = data?.detail ?? 'Diagnosis gagal diproses';
    throw new Error(Array.isArray(detail) ? detail[0]?.msg ?? 'Request diagnosis tidak valid' : detail);
  }

  return data as DiagnosisResponse;
}
