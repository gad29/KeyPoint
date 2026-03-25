import { documentLibrary, type BorrowerProfile, type CaseType } from '@/data/domain';

export const caseTypeOptions: Array<{ value: CaseType; label: { en: string; he: string }; hint: { en: string; he: string } }> = [
  { value: 'purchase-single-dwelling', label: { en: 'Purchase · single dwelling', he: 'רכישה · דירה יחידה' }, hint: { en: 'First or only home purchase.', he: 'רכישת דירה ראשונה או יחידה.' } },
  { value: 'purchase-replacement-dwelling', label: { en: 'Purchase · replacement dwelling', he: 'רכישה · דירה חלופית' }, hint: { en: 'Selling one home and buying another.', he: 'מכירת דירה קיימת ורכישת דירה אחרת.' } },
  { value: 'purchase-investment-dwelling', label: { en: 'Purchase · investment dwelling', he: 'רכישה · דירה להשקעה' }, hint: { en: 'Additional / investment property.', he: 'רכישת נכס נוסף או נכס להשקעה.' } },
  { value: 'refinance', label: { en: 'Refinance', he: 'מחזור משכנתא' }, hint: { en: 'Improve an existing mortgage structure.', he: 'שיפור מבנה המשכנתא הקיימת.' } },
  { value: 'all-purpose-against-home', label: { en: 'All-purpose against existing home', he: 'לכל מטרה על נכס קיים' }, hint: { en: 'Raise funds against owned property.', he: 'גיוס כספים כנגד נכס קיים.' } },
  { value: 'discounted-program', label: { en: 'Discounted program', he: 'תוכנית מוזלת' }, hint: { en: 'Programs such as מחיר למשתכן / דירה בהנחה.', he: 'תוכניות כמו מחיר למשתכן או דירה בהנחה.' } },
  { value: 'self-build', label: { en: 'Self build', he: 'בנייה עצמית' }, hint: { en: 'Construction-based financing flow.', he: 'מימון לפרויקט בנייה עצמית.' } },
  { value: 'renovation', label: { en: 'Renovation', he: 'שיפוץ' }, hint: { en: 'Renovation / improvement financing.', he: 'מימון לשיפוץ או השבחת נכס.' } },
];

export const borrowerProfileOptions: Array<{ value: BorrowerProfile; label: { en: string; he: string }; hint: { en: string; he: string } }> = [
  { value: 'salaried', label: { en: 'Salaried', he: 'שכיר' }, hint: { en: 'Payslips / salary based income.', he: 'הכנסה המבוססת על תלושי שכר.' } },
  { value: 'self-employed', label: { en: 'Self-employed', he: 'עצמאי' }, hint: { en: 'CPA and tax-return based income.', he: 'הכנסה המבוססת על אישור רו״ח ודוחות.' } },
  { value: 'student', label: { en: 'Student', he: 'סטודנט / אברך' }, hint: { en: 'Study-related proof or stipend support.', he: 'הכנסה או תמיכה הקשורה ללימודים או כולל.' } },
  { value: 'benefits', label: { en: 'Benefits', he: 'קצבאות' }, hint: { en: 'Government / support benefits.', he: 'קצבאות או תמיכות מהמוסדות.' } },
  { value: 'pensioner', label: { en: 'Pensioner', he: 'פנסיונר' }, hint: { en: 'Pension or retirement income.', he: 'הכנסה מפנסיה או קצבת פרישה.' } },
  { value: 'new-immigrant', label: { en: 'New immigrant', he: 'עולה חדש' }, hint: { en: 'Recent aliyah / immigrant profile.', he: 'פרופיל של עולה חדש או עליה recent.' } },
  { value: 'foreign-income', label: { en: 'Foreign income', he: 'הכנסה מחו״ל' }, hint: { en: 'Income sourced outside Israel.', he: 'הכנסה שמקורה מחוץ לישראל.' } },
];

export type IntakePayload = {
  applicant: {
    fullName: string;
    idNumber?: string;
    birthDate?: string;
    maritalStatus?: string;
  };
  coApplicant: {
    hasCoApplicant: boolean;
    fullName?: string;
    idNumber?: string;
    birthDate?: string;
    relationship?: string;
  };
  contact: {
    phone: string;
    email?: string;
    preferredLanguage: 'he' | 'en';
    preferredChannel: 'whatsapp' | 'phone' | 'email';
    city?: string;
    bestTimeToReach?: string;
  };
  caseType: CaseType;
  incomeProfile: {
    borrowerProfiles: BorrowerProfile[];
    monthlyNetIncome?: string;
    additionalIncome?: string;
    employmentNotes?: string;
  };
  property: {
    purchasePrice?: string;
    requestedMortgageAmount?: string;
    propertyCity?: string;
    propertyValueEstimate?: string;
    equityAvailable?: string;
    timeline?: string;
  };
  liabilities: {
    hasExistingLoans: boolean;
    monthlyLoanRepayments?: string;
    liabilityNotes?: string;
  };
  consent: {
    privacyAccepted: boolean;
    advisorAuthorizationAccepted: boolean;
    accuracyConfirmed: boolean;
  };
  notes?: string;
};

export function makeNativeIntakeSubmissionId() {
  return `native-intake-${Date.now()}`;
}

export function getRequiredDocumentCodes(caseType: CaseType, borrowerProfiles: BorrowerProfile[]) {
  return documentLibrary
    .filter(
      (doc) =>
        (!doc.caseTypes || doc.caseTypes.includes(caseType)) &&
        (!doc.borrowerProfiles || doc.borrowerProfiles.some((profile) => borrowerProfiles.includes(profile))),
    )
    .map((doc) => doc.code);
}

export function summarizeIntakeForNotes(payload: IntakePayload) {
  const lines = [
    `Intake source: native-keypoint`,
    '',
    'Applicant',
    `- Full name: ${payload.applicant.fullName}`,
    `- ID number: ${payload.applicant.idNumber || '-'}`,
    `- Birth date: ${payload.applicant.birthDate || '-'}`,
    `- Marital status: ${payload.applicant.maritalStatus || '-'}`,
    '',
    'Co-applicant',
    `- Included: ${payload.coApplicant.hasCoApplicant ? 'yes' : 'no'}`,
    `- Full name: ${payload.coApplicant.fullName || '-'}`,
    `- ID number: ${payload.coApplicant.idNumber || '-'}`,
    `- Birth date: ${payload.coApplicant.birthDate || '-'}`,
    `- Relationship: ${payload.coApplicant.relationship || '-'}`,
    '',
    'Contact preferences',
    `- Phone: ${payload.contact.phone}`,
    `- Email: ${payload.contact.email || '-'}`,
    `- Preferred language: ${payload.contact.preferredLanguage}`,
    `- Preferred channel: ${payload.contact.preferredChannel}`,
    `- City: ${payload.contact.city || '-'}`,
    `- Best time to reach: ${payload.contact.bestTimeToReach || '-'}`,
    '',
    'Case details',
    `- Case type: ${payload.caseType}`,
    `- Borrower profiles: ${payload.incomeProfile.borrowerProfiles.join(', ') || '-'}`,
    `- Monthly net income: ${payload.incomeProfile.monthlyNetIncome || '-'}`,
    `- Additional income: ${payload.incomeProfile.additionalIncome || '-'}`,
    `- Employment notes: ${payload.incomeProfile.employmentNotes || '-'}`,
    '',
    'Property',
    `- Purchase price: ${payload.property.purchasePrice || '-'}`,
    `- Requested mortgage amount: ${payload.property.requestedMortgageAmount || '-'}`,
    `- Property city: ${payload.property.propertyCity || '-'}`,
    `- Property value estimate: ${payload.property.propertyValueEstimate || '-'}`,
    `- Equity available: ${payload.property.equityAvailable || '-'}`,
    `- Timeline: ${payload.property.timeline || '-'}`,
    '',
    'Liabilities',
    `- Existing loans: ${payload.liabilities.hasExistingLoans ? 'yes' : 'no'}`,
    `- Monthly loan repayments: ${payload.liabilities.monthlyLoanRepayments || '-'}`,
    `- Liability notes: ${payload.liabilities.liabilityNotes || '-'}`,
    '',
    'Consent',
    `- Privacy accepted: ${payload.consent.privacyAccepted ? 'yes' : 'no'}`,
    `- Advisor authorization accepted: ${payload.consent.advisorAuthorizationAccepted ? 'yes' : 'no'}`,
    `- Accuracy confirmed: ${payload.consent.accuracyConfirmed ? 'yes' : 'no'}`,
  ];

  if (payload.notes?.trim()) {
    lines.push('', 'Client notes', payload.notes.trim());
  }

  return lines.join('\n');
}
