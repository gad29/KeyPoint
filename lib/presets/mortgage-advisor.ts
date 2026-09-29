import type { Preset } from '@/lib/presets/types';
import { documentLibrary, type BorrowerProfile, type CaseType } from '@/data/domain';

const caseTypes: CaseType[] = [
  'purchase-single-dwelling',
  'purchase-replacement-dwelling',
  'purchase-investment-dwelling',
  'refinance',
  'all-purpose-against-home',
  'discounted-program',
  'self-build',
  'renovation',
];

const borrowerProfiles: BorrowerProfile[] = [
  'salaried',
  'self-employed',
  'student',
  'benefits',
  'pensioner',
  'new-immigrant',
  'foreign-income',
];

const caseTypeLabels: Record<CaseType, { en: string; he: string }> = {
  'purchase-single-dwelling': { en: 'Purchase · single dwelling', he: 'רכישה · דירה יחידה' },
  'purchase-replacement-dwelling': { en: 'Purchase · replacement dwelling', he: 'רכישה · דירה חלופית' },
  'purchase-investment-dwelling': { en: 'Purchase · investment dwelling', he: 'רכישה · דירה להשקעה' },
  refinance: { en: 'Refinance', he: 'מחזור משכנתא' },
  'all-purpose-against-home': { en: 'All-purpose against existing home', he: 'לכל מטרה על נכס קיים' },
  'discounted-program': { en: 'Discounted program', he: 'תוכנית מוזלת' },
  'self-build': { en: 'Self build', he: 'בנייה עצמית' },
  renovation: { en: 'Renovation', he: 'שיפוץ' },
};

const borrowerProfileLabels: Record<BorrowerProfile, { en: string; he: string }> = {
  salaried: { en: 'Salaried', he: 'שכיר' },
  'self-employed': { en: 'Self-employed', he: 'עצמאי' },
  student: { en: 'Student', he: 'סטודנט / אברך' },
  benefits: { en: 'Benefits', he: 'קצבאות' },
  pensioner: { en: 'Pensioner', he: 'פנסיונר' },
  'new-immigrant': { en: 'New immigrant', he: 'עולה חדש' },
  'foreign-income': { en: 'Foreign income', he: 'הכנסה מחו״ל' },
};

export const mortgageAdvisorPreset: Preset = {
  id: 'mortgage-advisor',
  name: 'Mortgage advisor',
  nameHe: 'ייעוץ משכנתאות',
  tagline: 'Open a client file, collect docs, run bank offers.',
  taglineHe: 'פתיחת תיק, איסוף מסמכים והרצת הצעות מהבנקים.',
  features: {
    bankOffers: true,
    appraiser: true,
    mortgageColumns: true,
    invoicing: true,
  },
  documentLibrary,
  mortgage: {
    caseTypes,
    borrowerProfiles,
  },
  wizardSteps: [
    {
      key: 'personal',
      labelEn: 'Personal',
      labelHe: 'פרטים',
      titleEn: 'Personal details & contact',
      titleHe: 'פרטים אישיים ויצירת קשר',
      descriptionEn: 'Applicant, co-applicant, and how to reach you.',
      descriptionHe: 'לווה ראשי, לווה נוסף ואופן יצירת קשר.',
      fields: [
        { key: 'applicantFullName', labelEn: 'Full name', labelHe: 'שם מלא', kind: 'text', required: true },
        { key: 'applicantIdNumber', labelEn: 'ID number', labelHe: 'מספר תעודת זהות', kind: 'text' },
        { key: 'applicantBirthDate', labelEn: 'Date of birth', labelHe: 'תאריך לידה', kind: 'date' },
        { key: 'applicantMaritalStatus', labelEn: 'Marital status', labelHe: 'מצב משפחתי', kind: 'text' },
        { key: 'contactPhone', labelEn: 'Phone', labelHe: 'טלפון', kind: 'tel', required: true },
        { key: 'contactEmail', labelEn: 'Email', labelHe: 'אימייל', kind: 'email' },
      ],
    },
    {
      key: 'caseAndIncome',
      labelEn: 'Case & income',
      labelHe: 'תיק והכנסה',
      titleEn: 'Case type & income',
      titleHe: 'סוג התיק והכנסות',
      fields: [
        {
          key: 'caseType',
          labelEn: 'Case type',
          labelHe: 'סוג תיק',
          kind: 'select',
          required: true,
          options: caseTypes.map((value) => ({ value, labelEn: caseTypeLabels[value].en, labelHe: caseTypeLabels[value].he })),
        },
        {
          key: 'borrowerProfiles',
          labelEn: 'Income profile',
          labelHe: 'פרופיל הכנסה',
          kind: 'multiselect',
          required: true,
          options: borrowerProfiles.map((value) => ({ value, labelEn: borrowerProfileLabels[value].en, labelHe: borrowerProfileLabels[value].he })),
        },
        { key: 'monthlyNetIncome', labelEn: 'Monthly net income (₪)', labelHe: 'הכנסה חודשית נטו (₪)', kind: 'text' },
      ],
    },
    {
      key: 'property',
      labelEn: 'Property',
      labelHe: 'נכס',
      titleEn: 'Property & liabilities',
      titleHe: 'הנכס והתחייבויות',
      fields: [
        { key: 'purchasePrice', labelEn: 'Purchase price (₪)', labelHe: 'מחיר רכישה (₪)', kind: 'text' },
        { key: 'requestedMortgageAmount', labelEn: 'Requested mortgage amount (₪)', labelHe: 'סכום המשכנתא המבוקש (₪)', kind: 'text' },
        { key: 'propertyCity', labelEn: 'Property city', labelHe: 'עיר הנכס', kind: 'text' },
      ],
    },
    {
      key: 'consent',
      labelEn: 'Consent',
      labelHe: 'אישורים',
      titleEn: 'Consent',
      titleHe: 'אישורים',
      descriptionEn: 'Required to open your file.',
      descriptionHe: 'נדרש לפתיחת התיק.',
      fields: [
        { key: 'privacyAccepted', labelEn: 'I agree to the privacy policy.', labelHe: 'אני מאשר/ת את מדיניות הפרטיות.', kind: 'checkbox', required: true },
        { key: 'advisorAuthorizationAccepted', labelEn: 'I authorize the advisor to contact lenders on my behalf.', labelHe: 'אני מאשר/ת ליועץ ליצור קשר עם הבנקים בשמי.', kind: 'checkbox', required: true },
        { key: 'accuracyConfirmed', labelEn: 'I confirm the details above are accurate.', labelHe: 'אני מאשר/ת שהפרטים מעלה מדויקים.', kind: 'checkbox', required: true },
      ],
    },
  ],
};
