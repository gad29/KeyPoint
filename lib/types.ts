export interface PortalInvite {
  token: string;
  caseId: string;
  leadName: string;
  phone: string;
  expiresAt: string;
}

export interface UploadRecord {
  id: string;
  caseId: string;
  documentCode: string;
  fileName: string;
  uploadedAt: string;
  path: string;
}

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
