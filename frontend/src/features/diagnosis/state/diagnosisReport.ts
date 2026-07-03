import type { AuthUser } from '../../auth/api/authApi';
import type { DiagnosisResponse } from '../api/diagnosisApi';
import type { DiagnosisDraft } from './diagnosisDraft';

export type DiagnosisReport = {
  resultNumber: string;
  createdAt: string;
  doctor: AuthUser | null;
  draft: DiagnosisDraft;
  response: DiagnosisResponse;
};

let diagnosisReport: DiagnosisReport | null = null;

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
