export type BackendHomebaseType = 'RUMAH_SAKIT' | 'KLINIK' | 'LAINNYA';

export type DiagnosisDraft = {
  homebaseType: BackendHomebaseType;
  homebaseName: string;
  homebaseAddress: string;
  imageUri: string;
  imageName?: string;
  imageMimeType?: string;
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
  const { homebaseType, homebaseName, homebaseAddress, imageUri, diagnoses } = diagnosisDraft;

  if (!homebaseType || !homebaseName || !homebaseAddress || !imageUri || !diagnoses?.length) {
    return null;
  }

  return diagnosisDraft as DiagnosisDraft;
}

export function clearDiagnosisDraft() {
  diagnosisDraft = {};
}
