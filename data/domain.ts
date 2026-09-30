/**
 * Full lifecycle vocabulary. Union of the generic small-business lifecycle
 * (default preset) and the mortgage-advisor lifecycle. A tenant only ever sees
 * the stages relevant to its active preset.
 *
 * Generic (default preset) stages map to the 5 canonical actions:
 *   1. Send onboarding link   → 'invited'
 *   2. Client is filling in    → 'onboarding'
 *   3. Submitted, agency reviews → 'intake-submitted'
 *   4. Docs missing, remind    → 'documents-in-progress'
 *   5. Work in progress        → 'in-service'
 *   6. Invoice issued          → 'invoice-sent'
 *   7. Payment received        → 'paid'
 *   8. Payment overdue, chase  → 'overdue'
 *   9. Done                    → 'completed' / 'archived'
 */
export type CaseStage =
  // shared with any preset
  | 'new-lead'
  | 'invited'
  | 'onboarding'
  | 'intake-submitted'
  | 'documents-in-progress'
  | 'in-service'
  | 'invoice-sent'
  | 'paid'
  | 'overdue'
  | 'completed'
  | 'archived'
  // mortgage-advisor preset only
  | 'approved'
  | 'portal-activated'
  | 'secretary-review'
  | 'waiting-appraiser'
  | 'appraisal-received'
  | 'ready-for-bank'
  | 'bank-negotiation'
  | 'recommendation-prepared';

/** Aliased for callers using the newer name. */
export type LifecycleStage = CaseStage;

export type BorrowerProfile =
  | 'salaried'
  | 'self-employed'
  | 'student'
  | 'benefits'
  | 'pensioner'
  | 'new-immigrant'
  | 'foreign-income';

export type CaseType =
  | 'purchase-single-dwelling'
  | 'purchase-replacement-dwelling'
  | 'purchase-investment-dwelling'
  | 'refinance'
  | 'all-purpose-against-home'
  | 'discounted-program'
  | 'self-build'
  | 'renovation';

export type DocumentStatus =
  | 'not-uploaded'
  | 'uploaded'
  | 'under-review'
  | 'approved'
  | 'resubmit-needed'
  | 'not-applicable';

export interface DocumentRequirement {
  code: string;
  group: string;
  labelEn: string;
  labelHe: string;
  description: string;
  borrowerProfiles?: BorrowerProfile[];
  caseTypes?: CaseType[];
}

export interface CaseRecord {
  id: string;
  leadName: string;
  spouseName?: string;
  phone: string;
  email?: string;
  stage: CaseStage;
  caseType: CaseType;
  borrowerProfiles: BorrowerProfile[];
  missingItems: number;
  assignedTo: string;
  bankTargets: string[];
  nextAction: string;
  portalStatus?: string;
  airtableRecordId?: string;
  /** Onboarding template the client signed up through (Postgres/demo backends). */
  templateSlug?: string;
}

export interface BankOffer {
  bank: string;
  status: 'not-started' | 'requested' | 'received' | 'expired';
  firstPayment?: string;
  maxPayment?: string;
  totalRepayment?: string;
  expiresAt?: string;
}

export const documentLibrary: DocumentRequirement[] = [
  {
    code: 'id-card',
    group: 'Identity',
    labelEn: 'ID card',
    labelHe: 'תעודת זהות',
    description: 'Primary identity document for all applicants.',
  },
  {
    code: 'couple-id-open-appendix',
    group: 'Identity',
    labelEn: 'Both spouses ID cards with open appendix',
    labelHe: 'ת. זהות של שני בני הזוג עם ספח פתוח',
    description: 'Full ID cards for both spouses including the open appendix / family insert.',
  },
  {
    code: 'advisor-authorization',
    group: 'Identity',
    labelEn: 'Advisor authorization letter',
    labelHe: 'כתב הסמכה ליועץ',
    description: 'Allows the office to communicate with lenders on behalf of the client.',
  },
  {
    code: 'payslips-3m',
    group: 'Income',
    labelEn: 'Last 3 payslips',
    labelHe: 'תלושי שכר 3 חודשים אחרונים',
    description: 'Required for salaried borrowers.',
    borrowerProfiles: ['salaried'],
  },
  {
    code: 'accountant-confirmation',
    group: 'Income',
    labelEn: 'CPA confirmation',
    labelHe: 'אישור רואה חשבון',
    description: 'Required for self-employed borrowers.',
    borrowerProfiles: ['self-employed'],
  },
  {
    code: 'study-confirmation',
    group: 'Income',
    labelEn: 'Study confirmation',
    labelHe: 'אישור לימודים',
    description: 'Useful for students or scholarship-backed applicants.',
    borrowerProfiles: ['student'],
  },
  {
    code: 'kollel-confirmation',
    group: 'Income',
    labelEn: 'Kollel confirmation',
    labelHe: 'אישורי כולל',
    description: 'Income/support confirmation for kollel or Torah-study based household income.',
    borrowerProfiles: ['student'],
  },
  {
    code: 'benefits-confirmation',
    group: 'Income',
    labelEn: 'National Insurance benefits confirmation',
    labelHe: 'אישור קצבה מביטוח לאומי',
    description: 'Official National Insurance (Bituach Leumi) benefit confirmation.',
    borrowerProfiles: ['benefits'],
  },
  {
    code: 'bank-statements-3m',
    group: 'Banking',
    labelEn: 'Bank statements - last 3 months',
    labelHe: 'עובר ושב 3 חודשים אחרונים',
    description: 'Core financial capacity document.',
  },
  {
    code: 'loan-summary',
    group: 'Banking',
    labelEn: 'Existing loan balance summary',
    labelHe: 'יתרת הלוואות',
    description: 'Required when existing loans appear in the current account statements.',
  },
  {
    code: 'sale-agreement',
    group: 'Property',
    labelEn: 'Purchase agreement',
    labelHe: 'חוזה רכישה',
    description: 'Purchase contract / sale agreement for purchase cases.',
    caseTypes: ['purchase-single-dwelling', 'purchase-replacement-dwelling', 'purchase-investment-dwelling', 'discounted-program'],
  },
  {
    code: 'contractor-payment-vouchers',
    group: 'Property',
    labelEn: 'Paid contractor vouchers',
    labelHe: 'צילומי שוברים ששולמו לקבלן',
    description: 'Copies of vouchers already paid to the contractor.',
    caseTypes: ['purchase-single-dwelling', 'purchase-replacement-dwelling', 'purchase-investment-dwelling', 'discounted-program', 'self-build'],
  },
  {
    code: 'tabu-extract',
    group: 'Property',
    labelEn: 'Land registry extract',
    labelHe: 'נסח טאבו',
    description: 'Property rights extract.',
  },
  {
    code: 'ila-rights',
    group: 'Property',
    labelEn: 'ILA rights confirmation',
    labelHe: 'אישור זכויות מינהל',
    description: 'Needed for some Israel Land Authority managed properties.',
  },
  {
    code: 'renovation-quote',
    group: 'Process',
    labelEn: 'Renovation quote',
    labelHe: 'הצעת שיפוץ',
    description: 'Quote for renovation-related mortgage cases.',
    caseTypes: ['renovation'],
  },
  {
    code: 'appraisal-referral',
    group: 'Process',
    labelEn: 'Appraisal referral',
    labelHe: 'הפניה לשמאות',
    description: 'Tracks when the office sends a file to the appraiser.',
  },
];

export const sampleCases: CaseRecord[] = [
  {
    id: 'CASE-1024',
    leadName: 'Noa Levi',
    spouseName: 'Amit Levi',
    phone: '+972-50-123-4567',
    email: 'noa@example.com',
    stage: 'documents-in-progress',
    caseType: 'purchase-single-dwelling',
    borrowerProfiles: ['salaried'],
    missingItems: 3,
    assignedTo: 'Dana',
    bankTargets: ['Mizrahi-Tefahot', 'Leumi', 'Discount'],
    nextAction: 'Request updated bank statements and authorization letter.',
  },
  {
    id: 'CASE-1038',
    leadName: 'Yossi Cohen',
    phone: '+972-52-222-3311',
    email: 'yossi@example.com',
    stage: 'waiting-appraiser',
    caseType: 'renovation',
    borrowerProfiles: ['self-employed'],
    missingItems: 1,
    assignedTo: 'Shira',
    bankTargets: ['Hapoalim'],
    nextAction: 'Confirm valuation appointment and upload renovation quote.',
  },
  {
    id: 'CASE-1042',
    leadName: 'Maya Ben David',
    phone: '+972-54-555-8877',
    email: 'maya@example.com',
    stage: 'bank-negotiation',
    caseType: 'discounted-program',
    borrowerProfiles: ['salaried', 'new-immigrant'],
    missingItems: 0,
    assignedTo: 'Eli',
    bankTargets: ['Leumi', 'Benleumi'],
    nextAction: 'Compare approval-in-principle baskets before expiry.',
  },
];

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  /** Price per unit before VAT, in major units (e.g. 1500 = ₪1,500). */
  unitAmount: number;
}

/**
 * A payment request issued by the app. It is not a legal tax invoice (חשבונית מס) unless
 * an accounting provider (Green Invoice / iCount) issued one, recorded in externalId/externalDocUrl.
 */
export interface InvoiceRecord {
  id: string;
  caseId: string | null;
  number: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  amountPaid: number;
  summary?: string;
  notes?: string;
  status: InvoiceStatus;
  issuedAt?: string;
  dueAt?: string;
  paidAt?: string;
  viewedAt?: string;
  createdAt: string;
  /** Opaque token for the client-facing /pay page. */
  publicToken: string;
  chasePaused: boolean;
  /** 'internal' or the accounting provider that issued the tax document. */
  sourceAdapter: string;
  externalId?: string;
  externalDocUrl?: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  externalRef?: string;
  paidAt: string;
}

export type ChaseTone = 'friendly' | 'reminder' | 'firm' | 'final';

export interface ChaseStep {
  /** Days after the due date. */
  dayOffset: number;
  tone: ChaseTone;
}

export type ChaseRunStatus = 'draft' | 'sent' | 'skipped' | 'failed';

export interface ChaseRun {
  id: string;
  invoiceId: string;
  stepIndex: number;
  tone: ChaseTone;
  channel: 'email' | 'whatsapp' | 'manual';
  status: ChaseRunStatus;
  subject: string;
  body: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export const defaultChaseCadence: ChaseStep[] = [
  { dayOffset: 3, tone: 'friendly' },
  { dayOffset: 10, tone: 'reminder' },
  { dayOffset: 21, tone: 'firm' },
  { dayOffset: 30, tone: 'final' },
];

export const sampleOffers: BankOffer[] = [
  {
    bank: 'Mizrahi-Tefahot',
    status: 'received',
    firstPayment: '₪6,420',
    maxPayment: '₪7,210',
    totalRepayment: '₪2.14M',
    expiresAt: '2026-03-30',
  },
  {
    bank: 'Leumi',
    status: 'requested',
    expiresAt: '2026-03-28',
  },
  {
    bank: 'Discount',
    status: 'received',
    firstPayment: '₪6,510',
    maxPayment: '₪7,340',
    totalRepayment: '₪2.18M',
    expiresAt: '2026-03-29',
  },
];
