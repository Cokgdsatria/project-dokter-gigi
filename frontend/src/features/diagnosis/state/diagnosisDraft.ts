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

type EditableDiagnosisDraft = Partial<DiagnosisDraft>;

let diagnosisDraft: EditableDiagnosisDraft = {};

export function updateDiagnosisDraft(nextDraft: EditableDiagnosisDraft) {
  diagnosisDraft = {
    ...diagnosisDraft,
    ...nextDraft,
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

export function clearDiagnosisDraft() {
  diagnosisDraft = {};
}

