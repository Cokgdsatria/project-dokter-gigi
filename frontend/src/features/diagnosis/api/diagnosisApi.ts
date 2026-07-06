import { File as ExpoFile, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../../../shared/api/client';
import { getAuthSession } from '../../auth/api/authSession';
import type { DiagnosisDraft } from '../state/diagnosisDraft';

export type SegmentationPoint = {
  x: number;
  y: number;
};

export type DiagnosisPrediction = {
  class?: string | null;
  confidence?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  points?: SegmentationPoint[];
  classId?: number | null;
  detectionId?: string | null;
};

export type DiagnosisResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: 'DONE' | 'FAILED' | string;
    resultLabel?: string | null;
    resultConfidence?: number | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    errorMessage?: string | null;
    predictions?: DiagnosisPrediction[];
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

function getDiagnosisParameters(draft: DiagnosisDraft, fileName: string) {
  return {
    homebaseType: draft.homebaseType,
    homebaseName: draft.homebaseName,
    homebaseAddress: draft.homebaseAddress,
    diagnosisAwal: JSON.stringify(draft.diagnoses),
    ...(draft.doctorNote?.trim() ? { catatanDokter: draft.doctorNote.trim() } : {}),
    fileName,
  };
}

async function parseDiagnosisResponse(status: number, body: string | null): Promise<DiagnosisResponse> {
  const data = body ? JSON.parse(body) : null;

  if (status < 200 || status >= 300) {
    const detail = data?.detail ?? 'Diagnosis gagal diproses';
    throw new Error(Array.isArray(detail) ? detail[0]?.msg ?? 'Request diagnosis tidak valid' : detail);
  }

  return data as DiagnosisResponse;
}

async function diagnoseDentalImageWeb(
  draft: DiagnosisDraft,
  fileName: string,
  mimeType: string,
  accessToken: string
): Promise<DiagnosisResponse> {
  const imageResponse = await fetch(draft.imageUri);
  if (!imageResponse.ok) {
    throw new Error('File gambar tidak bisa dibaca dari browser');
  }

  const imageBlob = await imageResponse.blob();
  const formData = new FormData();
  formData.append('file', imageBlob, fileName);

  const parameters = getDiagnosisParameters(draft, fileName);
  Object.entries(parameters).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/diagnose`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // Browser akan otomatis mengisi multipart boundary.
    },
    body: formData,
  });

  return parseDiagnosisResponse(response.status, await response.text());
}

async function diagnoseDentalImageNative(
  draft: DiagnosisDraft,
  fileName: string,
  mimeType: string,
  accessToken: string
): Promise<DiagnosisResponse> {
  const imageFile = new ExpoFile(draft.imageUri);

  const uploadResult = await imageFile.upload(`${API_BASE_URL}/api/v1/diagnose`, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    parameters: getDiagnosisParameters(draft, fileName),
  });

  return parseDiagnosisResponse(uploadResult.status, uploadResult.body || null);
}

export async function diagnoseDentalImage(draft: DiagnosisDraft): Promise<DiagnosisResponse> {
  const session = getAuthSession();
  if (!session.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const fileName = getImageFileName(draft.imageUri, draft.imageName);
  const mimeType = getImageMimeType(fileName, draft.imageMimeType);

  if (Platform.OS === 'web') {
    return diagnoseDentalImageWeb(draft, fileName, mimeType, session.accessToken);
  }

  return diagnoseDentalImageNative(draft, fileName, mimeType, session.accessToken);
}
