import type { BankOffer, CaseStage } from '@/data/domain';

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

export interface CreateCaseInput {
  leadName: string;
  spouseName?: string;
  phone: string;
  email?: string;
  caseType: string;
  borrowerProfiles: string[];
  assignedTo?: string;
  notes?: string;
  submissionId?: string;
  stage?: string;
  source?: string;
  missingItemsCount?: number;
  portalStatus?: string;
  nextAction?: string;
}

export interface CaseUpdateInput {
  stage?: CaseStage;
  assignedTo?: string;
  notesAppend?: string;
  portalStatus?: string;
  nextAction?: string;
  missingItemsCount?: number;
}

export interface CreateBankOfferInput extends BankOffer {
  caseId: string;
}

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
