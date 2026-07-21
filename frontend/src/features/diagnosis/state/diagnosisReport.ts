import type { AuthUser } from '../../auth/api/authApi';
import type { DiagnosisResponse } from '../api/diagnosisApi';
import type { BackendHomebaseType, DiagnosisDraft } from './diagnosisDraft';
import type { HistoryDetail } from '../../history/api/historyApi';

function normalizeHomebaseType(value?: string | null): BackendHomebaseType {
  return value === 'KLINIK' || value === 'LAINNYA' || value === 'RUMAH_SAKIT' ? value : 'RUMAH_SAKIT';
}

export type DiagnosisReport = {
  resultNumber: string;
  createdAt: string;
  doctor: AuthUser | null;
  draft: DiagnosisDraft;
  response: DiagnosisResponse;
};

let diagnosisReport: DiagnosisReport | null = null;

function createResultNumberFromHistory(item: HistoryDetail) {
  if (item.resultNumber?.trim()) {
    return item.resultNumber;
  }

  const date = new Date(item.processedAt || item.createdAt || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const suffix = item.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0001';

  return `${year}${month}${suffix}`;
}

function createResultNumber(response: DiagnosisResponse) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const suffix = response.data.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0001';

  return `${year}${month}${suffix}`;
}

export function setDiagnosisReport(draft: DiagnosisDraft, response: DiagnosisResponse, doctor: AuthUser | null) {
  diagnosisReport = {
    resultNumber: createResultNumber(response),
    createdAt: new Date().toISOString(),
    doctor,
    draft: {
      ...draft,
      diagnoses: [...draft.diagnoses],
    },
    response,
  };
}

export function getDiagnosisReport() {
  return diagnosisReport;
}

export function clearDiagnosisReport() {
  diagnosisReport = null;
}
export function setDiagnosisReportFromHistory(item: HistoryDetail, fallbackDoctor: AuthUser | null) {
  diagnosisReport = {
    resultNumber: createResultNumberFromHistory(item),
    createdAt: item.processedAt || item.createdAt || new Date().toISOString(),
    doctor: item.doctor ?? fallbackDoctor,
    draft: {
      homebaseType: normalizeHomebaseType(item.homebaseType),
      homebaseName: item.homebaseName || '-',
      homebaseAddress: item.homebaseAddress || '-',
      imageUri: item.imageUrl || '',
      imageName: item.filename || undefined,
      imageMimeType: item.mimeType || undefined,
      imageSize: item.fileSize || undefined,
      diagnoses: item.diagnosisAwal?.length ? [...item.diagnosisAwal] : ['-'],
      doctorNote: item.catatanDokter || undefined,
    },
    response: {
      success: item.status === 'DONE',
      message: item.status === 'DONE' ? 'Diagnosis berhasil' : 'Diagnosis gagal',
      data: {
        id: item.id,
        status: item.status,
        resultLabel: item.resultLabel,
        resultConfidence: item.resultConfidence,
        imageWidth: item.imageWidth,
        imageHeight: item.imageHeight,
        imageUrl: item.imageUrl,
        errorMessage: item.errorMessage,
        predictions: item.predictions ?? [],
      },
    },
  };
}

