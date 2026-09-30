import type { WizardStep } from '@/lib/presets/types';

export interface TemplateDocument {
  code: string;
  labelEn: string;
  labelHe: string;
  required: boolean;
}

export interface TemplateContract {
  titleEn: string;
  titleHe: string;
  bodyEn: string;
  bodyHe: string;
}

export interface OnboardingTemplate {
  slug: string;
  name: string;
  nameHe: string;
  description?: string;
  steps: WizardStep[];
  documents: TemplateDocument[];
  contract: TemplateContract | null;
  active: boolean;
  /** True for the preset-derived template that exists without any configuration. */
  builtIn?: boolean;
}

export interface ContractSignatureInput {
  templateSlug?: string;
  contractTitle: string;
  contractBody: string;
  contentHash: string;
  signerName: string;
  signatureImage: string;
  ip?: string;
  userAgent?: string;
}

export interface ContractSignature extends ContractSignatureInput {
  id: string;
  caseId: string;
  signedAt: string;
}

export interface AgencyBranding {
  name: string;
  nameHe: string;
  logoUrl: string;
  primaryColor: string;
}
