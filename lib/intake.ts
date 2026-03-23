import { documentLibrary, type BorrowerProfile, type CaseType } from '@/data/domain';

export const caseTypeOptions: Array<{ value: CaseType; label: string; hint: string }> = [
  { value: 'purchase-single-dwelling', label: 'Purchase · single dwelling', hint: 'First or only home purchase.' },
  { value: 'purchase-replacement-dwelling', label: 'Purchase · replacement dwelling', hint: 'Selling one home and buying another.' },
  { value: 'purchase-investment-dwelling', label: 'Purchase · investment dwelling', hint: 'Additional / investment property.' },
  { value: 'refinance', label: 'Refinance', hint: 'Improve an existing mortgage structure.' },
  { value: 'all-purpose-against-home', label: 'All-purpose against existing home', hint: 'Raise funds against owned property.' },
  { value: 'discounted-program', label: 'Discounted program', hint: 'Programs such as מחיר למשתכן / דירה בהנחה.' },
  { value: 'self-build', label: 'Self build', hint: 'Construction-based financing flow.' },
  { value: 'renovation', label: 'Renovation', hint: 'Renovation / improvement financing.' },
];

export const borrowerProfileOptions: Array<{ value: BorrowerProfile; label: string; hint: string }> = [
  { value: 'salaried', label: 'Salaried', hint: 'Payslips / salary based income.' },
  { value: 'self-employed', label: 'Self-employed', hint: 'CPA and tax-return based income.' },
  { value: 'student', label: 'Student', hint: 'Study-related proof or stipend support.' },
  { value: 'benefits', label: 'Benefits', hint: 'Government / support benefits.' },
  { value: 'pensioner', label: 'Pensioner', hint: 'Pension or retirement income.' },
  { value: 'new-immigrant', label: 'New immigrant', hint: 'Recent aliyah / immigrant profile.' },
  { value: 'foreign-income', label: 'Foreign income', hint: 'Income sourced outside Israel.' },
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
