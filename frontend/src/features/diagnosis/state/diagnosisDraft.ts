export type BackendHomebaseType = 'RUMAH_SAKIT' | 'KLINIK' | 'LAINNYA';

export type PatientGender = 'Laki-laki' | 'Perempuan';

export type DiagnosisDraft = {
  homebaseType: BackendHomebaseType;
  homebaseName: string;
  homebaseAddress: string;

  patientMedicalId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: PatientGender;

  imageUri: string;
  imageName?: string;
  imageMimeType?: string;
  imageSize?: number;
  diagnoses: string[];
  doctorNote?: string;
};

type EditableDiagnosisDraft = Partial<DiagnosisDraft> & {
  idempotencyKey?: string;
};

let diagnosisDraft: EditableDiagnosisDraft = {};

export function updateDiagnosisDraft(nextDraft: EditableDiagnosisDraft) {
  const changesDiagnosisInput = Object.keys(nextDraft).some(
    (key) => key !== 'idempotencyKey' && nextDraft[key as keyof EditableDiagnosisDraft] !== diagnosisDraft[key as keyof EditableDiagnosisDraft],
  );

  diagnosisDraft = {
    ...diagnosisDraft,
    ...nextDraft,
    ...(changesDiagnosisInput ? { idempotencyKey: undefined } : {}),
  };
}

export function getDiagnosisDraft(): EditableDiagnosisDraft {
  return diagnosisDraft;
}

export function getCompleteDiagnosisDraft(): DiagnosisDraft | null {
  const { 
    homebaseType, 
    homebaseName, 
    homebaseAddress, 
    imageUri, 
    diagnoses,
    patientMedicalId,
    patientName,
  } = diagnosisDraft;

  if (!homebaseType || !homebaseName || !homebaseAddress || !patientMedicalId || !patientName || !imageUri || !diagnoses?.length) {
    return null;
  }

  return diagnosisDraft as DiagnosisDraft;
}

export function getOrCreateDiagnosisIdempotencyKey(): string {
  if (!diagnosisDraft.idempotencyKey) {
    diagnosisDraft.idempotencyKey =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  return diagnosisDraft.idempotencyKey;
}

export function clearDiagnosisDraft() {
  diagnosisDraft = {};
}
