import { File as ExpoFile, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../../../shared/api/client';
import {
  authenticatedFetch,
  getAuthSession,
  refreshAuthSession,
} from '../../auth/api/authSession';
import {
  getOrCreateDiagnosisIdempotencyKey,
  type DiagnosisDraft,
} from '../state/diagnosisDraft';

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
    resultNumber?: string | null;
    status: 'DONE' | 'FAILED' | string;
    resultLabel?: string | null;
    resultConfidence?: number | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    imageUrl?: string | null;
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

function getDiagnosisParameters(
  draft: DiagnosisDraft,
  fileName: string,
  idempotencyKey: string,
): Record<string, string> {
  const parameters: Record<string, string> = {
    homebaseType: draft.homebaseType,
    homebaseName: draft.homebaseName,
    homebaseAddress: draft.homebaseAddress,
    diagnosisAwal: JSON.stringify(draft.diagnoses),
    patientMedicalId: draft.patientMedicalId,
    patientName: draft.patientName,
    fileName,
    idempotencyKey,
  };

  if (draft.patientAge !== undefined) {
    parameters.patientAge = String(draft.patientAge);
  }

  if (draft.patientGender) {
    parameters.patientGender = draft.patientGender;
  }

  if (draft.doctorNote?.trim()) {
    parameters.catatanDokter = draft.doctorNote.trim();
  }

  return parameters;
}

function parseJsonBody(body: string | null) {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function getErrorMessage(data: any, fallback: string) {
  const detail = data?.detail ?? data?.message ?? data?.data?.errorMessage ?? fallback;
  if (Array.isArray(detail)) {
    return detail[0]?.msg ?? fallback;
  }

  return typeof detail === 'string' && detail.trim() ? detail : fallback;
}

async function parseDiagnosisResponse(status: number, body: string | null): Promise<DiagnosisResponse> {
  const data = parseJsonBody(body);

  if (status < 200 || status >= 300) {
    throw new Error(getErrorMessage(data, 'Diagnosis gagal diproses'));
  }

  if (!data?.data?.id || !data?.data?.status) {
    throw new Error('Respons diagnosis tidak valid');
  }

  return data as DiagnosisResponse;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDiagnosisCompletion(
  initialResponse: DiagnosisResponse,
): Promise<DiagnosisResponse> {
  if (!['UPLOADED', 'PROCESSING'].includes(initialResponse.data.status)) {
    return initialResponse;
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await wait(2000);
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/v1/history/${initialResponse.data.id}`,
    );
    const payload = parseJsonBody(await response.text());
    if (!response.ok || !payload?.data?.status) {
      throw new Error(getErrorMessage(payload, 'Status diagnosis tidak dapat diperiksa'));
    }

    const result: DiagnosisResponse = {
      success: payload.data.status === 'DONE',
      message:
        payload.data.status === 'DONE'
          ? 'Diagnosis berhasil'
          : payload.data.status === 'FAILED'
            ? 'Diagnosis gagal'
            : 'Diagnosis sedang diproses',
      data: payload.data,
    };

    if (!['UPLOADED', 'PROCESSING'].includes(result.data.status)) {
      return result;
    }
  }

  throw new Error('Diagnosis masih diproses. Periksa kembali melalui menu riwayat.');
}

async function diagnoseDentalImageWeb(
  draft: DiagnosisDraft,
  fileName: string,
  mimeType: string,
  idempotencyKey: string,
): Promise<DiagnosisResponse> {
  const imageResponse = await fetch(draft.imageUri);
  if (!imageResponse.ok) {
    throw new Error('File gambar tidak bisa dibaca dari browser');
  }

  const imageBlob = await imageResponse.blob();
  const formData = new FormData();
  formData.append('file', imageBlob, fileName);

  const parameters = getDiagnosisParameters(draft, fileName, idempotencyKey);
  Object.entries(parameters).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/diagnose`, {
    method: 'POST',
    body: formData,
  });

  return parseDiagnosisResponse(response.status, await response.text());
}

async function diagnoseDentalImageNative(
  draft: DiagnosisDraft,
  fileName: string,
  mimeType: string,
  accessToken: string,
  idempotencyKey: string,
): Promise<DiagnosisResponse> {
  const imageFile = new ExpoFile(draft.imageUri);

  const upload = (token: string) =>
    imageFile.upload(`${API_BASE_URL}/api/v1/diagnose`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      parameters: getDiagnosisParameters(draft, fileName, idempotencyKey),
    });

  let uploadResult = await upload(accessToken);
  if (uploadResult.status === 401) {
    uploadResult = await upload(await refreshAuthSession());
  }

  return parseDiagnosisResponse(uploadResult.status, uploadResult.body || null);
}

export async function diagnoseDentalImage(draft: DiagnosisDraft): Promise<DiagnosisResponse> {
  const session = getAuthSession();
  if (!session.accessToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const fileName = getImageFileName(draft.imageUri, draft.imageName);
  const mimeType = getImageMimeType(fileName, draft.imageMimeType);
  const idempotencyKey = getOrCreateDiagnosisIdempotencyKey();

  let response: DiagnosisResponse;
  if (Platform.OS === 'web') {
    response = await diagnoseDentalImageWeb(draft, fileName, mimeType, idempotencyKey);
  } else {
    response = await diagnoseDentalImageNative(
      draft,
      fileName,
      mimeType,
      session.accessToken,
      idempotencyKey,
    );
  }

  return waitForDiagnosisCompletion(response);
}
