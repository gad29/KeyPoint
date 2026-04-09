'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n';
import { UploadForm } from '@/components/forms/upload-form';
import { borrowerProfileOptions, caseTypeOptions, type IntakePayload } from '@/lib/intake';

type StepKey = 'applicant' | 'coApplicant' | 'contact' | 'caseType' | 'income' | 'property' | 'liabilities' | 'consent' | 'review';

type Lang = 'en' | 'he';

type StepDefinition = { key: StepKey; label: Record<Lang, string>; title: Record<Lang, string>; description: Record<Lang, string> };

const steps: StepDefinition[] = [
  { key: 'applicant', label: { en: 'Applicant', he: 'לווה ראשי' }, title: { en: 'Main applicant', he: 'לווה ראשי' }, description: { en: 'Full name and ID details.', he: 'שם מלא ופרטי זיהוי.' } },
  { key: 'coApplicant', label: { en: 'Co-applicant', he: 'לווה נוסף' }, title: { en: 'Second borrower', he: 'לווה נוסף' }, description: { en: 'Only if part of the mortgage.', he: 'רק אם רלוונטי לתיק.' } },
  { key: 'contact', label: { en: 'Contact', he: 'יצירת קשר' }, title: { en: 'Contact', he: 'יצירת קשר' }, description: { en: 'Phone and preferred channel.', he: 'טלפון ודרך קשר.' } },
  { key: 'caseType', label: { en: 'Case type', he: 'סוג תיק' }, title: { en: 'Case type', he: 'סוג תיק' }, description: { en: 'Purchase, refinance, etc.', he: 'רכישה, מיחזור וכו׳.' } },
  { key: 'income', label: { en: 'Income', he: 'הכנסות' }, title: { en: 'Income', he: 'הכנסות' }, description: { en: 'Select all that apply.', he: 'סמנו את כל הרלוונטי.' } },
  { key: 'property', label: { en: 'Property', he: 'נכס' }, title: { en: 'Property', he: 'נכס' }, description: { en: 'Rough numbers are fine.', he: 'מספיקה הערכה.' } },
  { key: 'liabilities', label: { en: 'Liabilities', he: 'התחייבויות' }, title: { en: 'Loans & debt', he: 'הלוואות' }, description: { en: 'Existing monthly obligations.', he: 'התחייבויות חודשיות.' } },
  { key: 'consent', label: { en: 'Consent', he: 'אישורים' }, title: { en: 'Consent', he: 'אישורים' }, description: { en: 'Required to process your file.', he: 'נדרש לטיפול בתיק.' } },
  { key: 'review', label: { en: 'Review', he: 'סקירה' }, title: { en: 'Review & send', he: 'סקירה ושליחה' }, description: { en: 'Check and submit.', he: 'בדיקה ושליחה.' } },
];

const initialState: IntakePayload = {
  applicant: { fullName: '', idNumber: '', birthDate: '', maritalStatus: '' },
  coApplicant: { hasCoApplicant: false, fullName: '', idNumber: '', birthDate: '', relationship: '' },
  contact: { phone: '', email: '', preferredLanguage: 'he', preferredChannel: 'whatsapp', city: '', bestTimeToReach: '' },
  caseType: 'purchase-single-dwelling',
  incomeProfile: { borrowerProfiles: ['salaried'], monthlyNetIncome: '', additionalIncome: '', employmentNotes: '' },
  property: { purchasePrice: '', requestedMortgageAmount: '', propertyCity: '', propertyValueEstimate: '', equityAvailable: '', timeline: '' },
  liabilities: { hasExistingLoans: false, monthlyLoanRepayments: '', liabilityNotes: '' },
  consent: { privacyAccepted: false, advisorAuthorizationAccepted: false, accuracyConfirmed: false },
  notes: '',
};

const copy = {
  en: {
    nativeIntake: 'New case intake',
    missing: 'Missing',
    notProvided: 'Not provided yet',
    complete: 'Complete',
    approvalsMissing: 'Still missing approvals',
    applicantRequired: 'Applicant full name is required.',
    coApplicantRequired: 'Co-applicant name is required when a second borrower is included.',
    phoneRequired: 'Phone number is required.',
    emailInvalid: 'Enter a valid email address.',
    caseTypeRequired: 'Choose a case type.',
    incomeRequired: 'Select at least one income profile.',
    consentRequired: 'All consent confirmations are required before submission.',
    submitFail: 'Intake submission failed',
    submitFailShort: 'Failed to submit intake',
    successEyebrow: 'Case received',
    successTitle: 'Your case was received successfully',
    successBody: 'We will contact you. You can upload documents below.',
    caseId: 'Case ID',
    submissionId: 'Submission ID',
    source: 'Source',
    startAnother: 'Start another case',
    uploadNow: 'Upload first documents',
    uploadNowNote: 'PDF or photos — clear and readable.',
    of: 'of',
    fullName: 'Full name *',
    idNumber: 'ID number',
    birthDate: 'Date of birth',
    maritalStatus: 'Marital status',
    includeCoApplicant: 'Include a co-applicant',
    includeCoApplicantNote: 'Turn this on if a spouse or second borrower is part of the application.',
    noSecondBorrower: 'No second borrower will be included in this case.',
    coApplicantName: 'Co-applicant full name *',
    relationship: 'Relationship',
    phone: 'Phone *',
    email: 'Email',
    preferredLanguage: 'Preferred language',
    preferredChannel: 'Preferred channel',
    city: 'City',
    bestTime: 'Best time to reach you',
    monthlyIncome: 'Estimated monthly net income',
    additionalIncome: 'Additional income',
    employmentNotes: 'Employment notes',
    purchasePrice: 'Purchase price',
    mortgageAmount: 'Requested mortgage amount',
    propertyCity: 'Property city',
    propertyValue: 'Property value estimate',
    equity: 'Available equity',
    timeline: 'Desired timeline',
    hasLoans: 'There are existing loans or fixed monthly debt obligations',
    hasLoansNote: 'Mark this if there are current loan repayments or similar liabilities.',
    monthlyRepayments: 'Monthly loan repayments',
    liabilityNotes: 'Liability notes',
    privacy: 'I agree to share the submitted information for mortgage intake and case handling.',
    privacyNote: 'Required so the office can open and process the case.',
    authorization: 'I authorize the office to review the case and continue follow-up.',
    authorizationNote: 'This covers the first review, document requests, and process activation.',
    accuracy: 'I confirm the information is accurate to the best of my knowledge.',
    accuracyNote: 'Details can still be updated later with the office.',
    notes: 'Anything else the advisor should know?',
    back: 'Back',
    continue: 'Continue',
    submitting: 'Submitting…',
    submit: 'Submit case',
    reviewSummary: 'Summary before sending',
    reviewHint: 'Submit opens your file with the office.',
  },
  he: {
    nativeIntake: 'פתיחת תיק חדש',
    missing: 'חסר',
    notProvided: 'טרם הוזן',
    complete: 'מלא',
    approvalsMissing: 'חסרים עדיין אישורים',
    applicantRequired: 'יש למלא שם מלא של הלווה הראשי.',
    coApplicantRequired: 'אם יש לווה נוסף, יש למלא את שמו המלא.',
    phoneRequired: 'יש למלא מספר טלפון.',
    emailInvalid: 'יש להזין כתובת אימייל תקינה.',
    caseTypeRequired: 'יש לבחור סוג תיק.',
    incomeRequired: 'יש לבחור לפחות פרופיל הכנסה אחד.',
    consentRequired: 'יש לאשר את כל סעיפי ההסכמה לפני שליחת הטופס.',
    submitFail: 'שליחת הטופס נכשלה',
    submitFailShort: 'לא ניתן היה לשלוח את הטופס',
    successEyebrow: 'התיק התקבל',
    successTitle: 'הבקשה נקלטה בהצלחה',
    successBody: 'נחזור אליכם. אפשר להעלות מסמכים למטה.',
    caseId: 'מספר תיק',
    submissionId: 'מספר שליחה',
    source: 'מקור',
    startAnother: 'פתיחת תיק נוסף',
    uploadNow: 'העלאת מסמכים ראשונים',
    uploadNowNote: 'PDF או צילומים — ברורים וקריאים.',
    of: 'מתוך',
    fullName: 'שם מלא *',
    idNumber: 'תעודת זהות',
    birthDate: 'תאריך לידה',
    maritalStatus: 'מצב משפחתי',
    includeCoApplicant: 'יש לווה נוסף בתיק',
    includeCoApplicantNote: 'יש להפעיל אפשרות זו אם בן/בת הזוג או לווה נוסף הם חלק מהבקשה.',
    noSecondBorrower: 'לא יצורף לווה נוסף לתיק זה.',
    coApplicantName: 'שם מלא של הלווה הנוסף *',
    relationship: 'קשר ללווה הראשי',
    phone: 'טלפון *',
    email: 'אימייל',
    preferredLanguage: 'שפה מועדפת',
    preferredChannel: 'אופן יצירת קשר מועדף',
    city: 'עיר',
    bestTime: 'מתי נוח ליצור קשר',
    monthlyIncome: 'הכנסה חודשית נטו משוערת',
    additionalIncome: 'הכנסות נוספות',
    employmentNotes: 'הערות לגבי ההכנסה',
    purchasePrice: 'מחיר רכישה',
    mortgageAmount: 'סכום משכנתא מבוקש',
    propertyCity: 'עיר הנכס',
    propertyValue: 'שווי נכס משוער',
    equity: 'הון עצמי זמין',
    timeline: 'לוח זמנים רצוי',
    hasLoans: 'קיימות הלוואות או התחייבויות חודשיות קבועות',
    hasLoansNote: 'יש לסמן אם קיימות הלוואות פעילות, החזרים חודשיים או התחייבויות דומות.',
    monthlyRepayments: 'סך החזרים חודשיים',
    liabilityNotes: 'הערות לגבי התחייבויות',
    privacy: 'אני מאשר/ת להעביר את המידע שנמסר לצורך פתיחת תיק וטיפול במשכנתא.',
    privacyNote: 'נדרש כדי שהמשרד יוכל לפתוח את התיק ולהתחיל לטפל בו.',
    authorization: 'אני מאשר/ת למשרד לעבור על התיק ולהמשיך בטיפול ובמעקב.',
    authorizationNote: 'זה כולל בדיקה ראשונית, בקשות למסמכים והפעלת תהליך העבודה.',
    accuracy: 'אני מאשר/ת שהפרטים שמסרתי נכונים ככל הידוע לי.',
    accuracyNote: 'אפשר לעדכן פרטים בהמשך מול המשרד במידת הצורך.',
    notes: 'יש משהו נוסף שחשוב שנדע?',
    back: 'חזרה',
    continue: 'המשך',
    submitting: 'שולח…',
    submit: 'שליחת תיק',
    reviewSummary: 'סיכום לפני שליחה',
    reviewHint: 'השליחה פותחת את התיק מול המשרד.',
  },
};

function currencyPlaceholder(language: Lang) {
  return language === 'he' ? '₪ לדוגמה 1,850,000' : '₪ e.g. 1,850,000';
}

export function IntakeForm() {
  const { language, dir } = useI18n();
  const t = copy[language];
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<IntakePayload>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<null | { caseId: string; submissionId: string; intakeSource: string; seededDocuments: string[] }>(null);

  const currentStep = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const reviewItems = useMemo(
    () => [
      { label: t.fullName.replace(' *', ''), value: form.applicant.fullName || t.missing },
      { label: t.phone.replace(' *', ''), value: form.contact.phone || t.missing },
      { label: steps[3].label[language], value: caseTypeOptions.find((item) => item.value === form.caseType)?.label[language] || form.caseType },
      { label: steps[4].label[language], value: form.incomeProfile.borrowerProfiles.length ? form.incomeProfile.borrowerProfiles.join(', ') : t.missing },
      { label: t.propertyCity, value: form.property.propertyCity || t.notProvided },
      { label: steps[7].label[language], value: form.consent.privacyAccepted && form.consent.advisorAuthorizationAccepted && form.consent.accuracyConfirmed ? t.complete : t.approvalsMissing },
    ],
    [form, language, t],
  );

  function updateSection<K extends keyof IntakePayload>(section: K, values: Partial<IntakePayload[K]>) {
    setForm((current) => ({ ...current, [section]: { ...(current[section] as object), ...(values as object) } }));
  }

  function validateStep(index = stepIndex) {
    const step = steps[index];
    switch (step.key) {
      case 'applicant':
        if (!form.applicant.fullName.trim()) return t.applicantRequired;
        return null;
      case 'coApplicant':
        if (form.coApplicant.hasCoApplicant && !form.coApplicant.fullName?.trim()) return t.coApplicantRequired;
        return null;
      case 'contact':
        if (!form.contact.phone.trim()) return t.phoneRequired;
        if (form.contact.email && !/^\S+@\S+\.\S+$/.test(form.contact.email)) return t.emailInvalid;
        return null;
      case 'caseType':
        if (!form.caseType) return t.caseTypeRequired;
        return null;
      case 'income':
        if (!form.incomeProfile.borrowerProfiles.length) return t.incomeRequired;
        return null;
      case 'consent':
        if (!form.consent.privacyAccepted || !form.consent.advisorAuthorizationAccepted || !form.consent.accuracyConfirmed) return t.consentRequired;
        return null;
      default:
        return null;
    }
  }

  function nextStep() {
    const validationError = validateStep();
    if (validationError) return setError(validationError);
    setError('');
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setError('');
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit() {
    const validationError = validateStep(stepIndex);
    if (validationError) return setError(validationError);
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'native-intake', intake: form }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || t.submitFail);
      setSuccess({
        caseId: json.data?.id || 'pending',
        submissionId: json.meta?.submissionId || 'pending',
        intakeSource: json.meta?.source || 'native-intake',
        seededDocuments: Array.isArray(json.meta?.seededDocuments) ? json.meta.seededDocuments : [],
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : t.submitFailShort);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleBorrowerProfile(value: string) {
    setForm((current) => {
      const exists = current.incomeProfile.borrowerProfiles.includes(value as never);
      return { ...current, incomeProfile: { ...current.incomeProfile, borrowerProfiles: exists ? current.incomeProfile.borrowerProfiles.filter((item) => item !== value) : [...current.incomeProfile.borrowerProfiles, value as never] } };
    });
  }

  if (success) {
    return (
      <div className="intake-flow-wide grid" dir={dir} style={{ gap: 20 }}>
        <section className="card intake-success-card">
          <span className="success-mark">✓</span>
          <p className="eyebrow">{t.successEyebrow}</p>
          <h2>{t.successTitle}</h2>
          <p className="muted">{t.successBody}</p>
          <div className="review-grid compact">
            <div className="review-row"><span>{t.caseId}</span><strong>{success.caseId}</strong></div>
            <div className="review-row"><span>{t.submissionId}</span><strong>{success.submissionId}</strong></div>
          </div>
          <div className="inline-actions">
            <button className="button" type="button" onClick={() => { setForm(initialState); setSuccess(null); setStepIndex(0); }}>{t.startAnother}</button>
          </div>
          <p className="eyebrow" style={{ marginTop: 28 }}>{t.uploadNow}</p>
          <p className="muted">{t.uploadNowNote}</p>
        </section>
        <UploadForm caseId={success.caseId} allowedDocumentCodes={success.seededDocuments} defaultDocumentCode={success.seededDocuments[0] || 'id-card'} />
      </div>
    );
  }

  return (
    <div className="intake-flow-wide grid" dir={dir}>
      <section className="card intake-shell">
        <div className="intake-header">
          <div>
            <p className="eyebrow">{t.nativeIntake}</p>
            <h2>{currentStep.title[language]}</h2>
            <p className="muted">{currentStep.description[language]}</p>
          </div>
          <div className="progress-chip"><strong>{stepIndex + 1}</strong><span>{t.of} {steps.length}</span></div>
        </div>

        <div className="progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

        <div className="intake-step-list">
          {steps.map((step, index) => (
            <button key={step.key} type="button" className={`step-pill ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`} onClick={() => setStepIndex(index)}>
              <span>{index + 1}</span>
              <strong>{step.label[language]}</strong>
            </button>
          ))}
        </div>

        <div className="intake-body fade-panel">
          {currentStep.key === 'applicant' && <div className="form-grid cols-2">
            <label className="field field-lg"><span>{t.fullName}</span><input value={form.applicant.fullName} onChange={(e) => updateSection('applicant', { fullName: e.target.value })} /></label>
            <label className="field field-lg"><span>{t.idNumber}</span><input value={form.applicant.idNumber} onChange={(e) => updateSection('applicant', { idNumber: e.target.value })} /></label>
            <label className="field"><span>{t.birthDate}</span><input type="date" value={form.applicant.birthDate} onChange={(e) => updateSection('applicant', { birthDate: e.target.value })} /></label>
            <label className="field"><span>{t.maritalStatus}</span><input value={form.applicant.maritalStatus} onChange={(e) => updateSection('applicant', { maritalStatus: e.target.value })} /></label>
          </div>}

          {currentStep.key === 'coApplicant' && <div className="grid">
            <label className="choice-card toggle-row"><input type="checkbox" checked={form.coApplicant.hasCoApplicant} onChange={(e) => updateSection('coApplicant', { hasCoApplicant: e.target.checked })} /><div><strong>{t.includeCoApplicant}</strong><p className="muted">{t.includeCoApplicantNote}</p></div></label>
            {form.coApplicant.hasCoApplicant ? <div className="form-grid cols-2">
              <label className="field field-lg"><span>{t.coApplicantName}</span><input value={form.coApplicant.fullName} onChange={(e) => updateSection('coApplicant', { fullName: e.target.value })} /></label>
              <label className="field field-lg"><span>{t.idNumber}</span><input value={form.coApplicant.idNumber} onChange={(e) => updateSection('coApplicant', { idNumber: e.target.value })} /></label>
              <label className="field"><span>{t.birthDate}</span><input type="date" value={form.coApplicant.birthDate} onChange={(e) => updateSection('coApplicant', { birthDate: e.target.value })} /></label>
              <label className="field"><span>{t.relationship}</span><input value={form.coApplicant.relationship} onChange={(e) => updateSection('coApplicant', { relationship: e.target.value })} /></label>
            </div> : <p className="muted">{t.noSecondBorrower}</p>}
          </div>}

          {currentStep.key === 'contact' && <div className="form-grid cols-2">
            <label className="field field-lg"><span>{t.phone}</span><input value={form.contact.phone} onChange={(e) => updateSection('contact', { phone: e.target.value })} /></label>
            <label className="field field-lg"><span>{t.email}</span><input value={form.contact.email} onChange={(e) => updateSection('contact', { email: e.target.value })} /></label>
            <label className="field"><span>{t.preferredLanguage}</span><select value={form.contact.preferredLanguage} onChange={(e) => updateSection('contact', { preferredLanguage: e.target.value as 'he' | 'en' })}><option value="he">עברית</option><option value="en">English</option></select></label>
            <label className="field"><span>{t.preferredChannel}</span><select value={form.contact.preferredChannel} onChange={(e) => updateSection('contact', { preferredChannel: e.target.value as 'whatsapp' | 'phone' | 'email' })}><option value="whatsapp">WhatsApp</option><option value="phone">{language === 'he' ? 'שיחה טלפונית' : 'Phone call'}</option><option value="email">{t.email}</option></select></label>
            <label className="field"><span>{t.city}</span><input value={form.contact.city} onChange={(e) => updateSection('contact', { city: e.target.value })} /></label>
            <label className="field"><span>{t.bestTime}</span><input value={form.contact.bestTimeToReach} onChange={(e) => updateSection('contact', { bestTimeToReach: e.target.value })} /></label>
          </div>}

          {currentStep.key === 'caseType' && <div className="choice-grid">{caseTypeOptions.map((option) => <label key={option.value} className={`choice-card ${form.caseType === option.value ? 'selected' : ''}`}><input type="radio" name="caseType" checked={form.caseType === option.value} onChange={() => setForm((current) => ({ ...current, caseType: option.value }))} /><div><strong>{option.label[language]}</strong><p className="muted">{option.hint[language]}</p></div></label>)}</div>}

          {currentStep.key === 'income' && <div className="grid">
            <div className="choice-grid compact-choice-grid">{borrowerProfileOptions.map((option) => { const selected = form.incomeProfile.borrowerProfiles.includes(option.value); return <label key={option.value} className={`choice-card ${selected ? 'selected' : ''}`}><input type="checkbox" checked={selected} onChange={() => toggleBorrowerProfile(option.value)} /><div><strong>{option.label[language]}</strong><p className="muted">{option.hint[language]}</p></div></label>; })}</div>
            <div className="form-grid cols-2">
              <label className="field"><span>{t.monthlyIncome}</span><input value={form.incomeProfile.monthlyNetIncome} onChange={(e) => updateSection('incomeProfile', { monthlyNetIncome: e.target.value })} placeholder={currencyPlaceholder(language)} /></label>
              <label className="field"><span>{t.additionalIncome}</span><input value={form.incomeProfile.additionalIncome} onChange={(e) => updateSection('incomeProfile', { additionalIncome: e.target.value })} /></label>
              <label className="field field-span-2"><span>{t.employmentNotes}</span><textarea value={form.incomeProfile.employmentNotes} onChange={(e) => updateSection('incomeProfile', { employmentNotes: e.target.value })} /></label>
            </div>
          </div>}

          {currentStep.key === 'property' && <div className="form-grid cols-2">
            <label className="field"><span>{t.purchasePrice}</span><input value={form.property.purchasePrice} onChange={(e) => updateSection('property', { purchasePrice: e.target.value })} placeholder={currencyPlaceholder(language)} /></label>
            <label className="field"><span>{t.mortgageAmount}</span><input value={form.property.requestedMortgageAmount} onChange={(e) => updateSection('property', { requestedMortgageAmount: e.target.value })} placeholder={currencyPlaceholder(language)} /></label>
            <label className="field"><span>{t.propertyCity}</span><input value={form.property.propertyCity} onChange={(e) => updateSection('property', { propertyCity: e.target.value })} /></label>
            <label className="field"><span>{t.propertyValue}</span><input value={form.property.propertyValueEstimate} onChange={(e) => updateSection('property', { propertyValueEstimate: e.target.value })} placeholder={currencyPlaceholder(language)} /></label>
            <label className="field"><span>{t.equity}</span><input value={form.property.equityAvailable} onChange={(e) => updateSection('property', { equityAvailable: e.target.value })} placeholder={currencyPlaceholder(language)} /></label>
            <label className="field"><span>{t.timeline}</span><input value={form.property.timeline} onChange={(e) => updateSection('property', { timeline: e.target.value })} /></label>
          </div>}

          {currentStep.key === 'liabilities' && <div className="grid">
            <label className="choice-card toggle-row"><input type="checkbox" checked={form.liabilities.hasExistingLoans} onChange={(e) => updateSection('liabilities', { hasExistingLoans: e.target.checked })} /><div><strong>{t.hasLoans}</strong><p className="muted">{t.hasLoansNote}</p></div></label>
            <div className="form-grid cols-2">
              <label className="field"><span>{t.monthlyRepayments}</span><input value={form.liabilities.monthlyLoanRepayments} onChange={(e) => updateSection('liabilities', { monthlyLoanRepayments: e.target.value })} placeholder={currencyPlaceholder(language)} /></label>
              <label className="field field-span-2"><span>{t.liabilityNotes}</span><textarea value={form.liabilities.liabilityNotes} onChange={(e) => updateSection('liabilities', { liabilityNotes: e.target.value })} /></label>
            </div>
          </div>}

          {currentStep.key === 'consent' && <div className="grid">
            <label className={`choice-card toggle-row ${form.consent.privacyAccepted ? 'selected' : ''}`}><input type="checkbox" checked={form.consent.privacyAccepted} onChange={(e) => updateSection('consent', { privacyAccepted: e.target.checked })} /><div><strong>{t.privacy}</strong><p className="muted">{t.privacyNote}</p></div></label>
            <label className={`choice-card toggle-row ${form.consent.advisorAuthorizationAccepted ? 'selected' : ''}`}><input type="checkbox" checked={form.consent.advisorAuthorizationAccepted} onChange={(e) => updateSection('consent', { advisorAuthorizationAccepted: e.target.checked })} /><div><strong>{t.authorization}</strong><p className="muted">{t.authorizationNote}</p></div></label>
            <label className={`choice-card toggle-row ${form.consent.accuracyConfirmed ? 'selected' : ''}`}><input type="checkbox" checked={form.consent.accuracyConfirmed} onChange={(e) => updateSection('consent', { accuracyConfirmed: e.target.checked })} /><div><strong>{t.accuracy}</strong><p className="muted">{t.accuracyNote}</p></div></label>
            <label className="field field-span-2"><span>{t.notes}</span><textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></label>
          </div>}

          {currentStep.key === 'review' && <div className="grid">
            <div className="review-grid">{reviewItems.map((item) => <div key={item.label} className="review-row"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
            <div className="card nested-card"><p className="eyebrow">{t.reviewSummary}</p><p className="muted">{t.reviewHint}</p></div>
          </div>}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="intake-actions">
          <button className="button button-secondary" type="button" onClick={previousStep} disabled={stepIndex === 0 || submitting}>{t.back}</button>
          {stepIndex < steps.length - 1 ? <button className="button" type="button" onClick={nextStep} disabled={submitting}>{t.continue}</button> : <button className="button" type="button" onClick={handleSubmit} disabled={submitting}>{submitting ? t.submitting : t.submit}</button>}
        </div>
      </section>
    </div>
  );
}
