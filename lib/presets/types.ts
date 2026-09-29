/**
 * Preset system for Agency OS.
 *
 * A preset is a bundle of vocabulary + workflow that shapes the platform for a
 * specific kind of business. The generic default preset works for any small
 * service business (client onboarding + invoice chase). Vertical presets like
 * "mortgage-advisor" add extra fields, document requirements, and side-panels.
 *
 * A tenant picks one primary preset in settings; features unique to other
 * presets stay hidden.
 */

import type { BorrowerProfile, CaseType, DocumentRequirement } from '@/data/domain';

export type PresetId = 'default' | 'mortgage-advisor';

export type WizardFieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'number';

export interface WizardField {
  key: string;
  labelEn: string;
  labelHe: string;
  kind: WizardFieldKind;
  required?: boolean;
  placeholderEn?: string;
  placeholderHe?: string;
  hintEn?: string;
  hintHe?: string;
  options?: Array<{ value: string; labelEn: string; labelHe: string }>;
}

export interface WizardStep {
  key: string;
  labelEn: string;
  labelHe: string;
  titleEn: string;
  titleHe: string;
  descriptionEn?: string;
  descriptionHe?: string;
  fields: WizardField[];
}

export interface PresetFeatures {
  /** Show the bank-offers panel on the case-detail page. */
  bankOffers: boolean;
  /** Include appraiser-related activity types + workflows. */
  appraiser: boolean;
  /** Show mortgage-specific columns (case type, borrower profiles) in the dashboard. */
  mortgageColumns: boolean;
  /** Enable invoice + payment chase for this preset. Always true for default. */
  invoicing: boolean;
}

export interface Preset {
  id: PresetId;
  name: string;
  nameHe: string;
  tagline: string;
  taglineHe: string;
  /** Wizard steps shown at /intake. Order matters. */
  wizardSteps: WizardStep[];
  /** Document library for this preset. Optional (default preset has none preset). */
  documentLibrary?: DocumentRequirement[];
  /** Feature flags. */
  features: PresetFeatures;
  /** Legacy mortgage enums: retained on the mortgage preset for the existing Airtable mappings. */
  mortgage?: {
    caseTypes: CaseType[];
    borrowerProfiles: BorrowerProfile[];
  };
}
