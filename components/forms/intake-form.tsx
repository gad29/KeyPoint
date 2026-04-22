'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/components/i18n';
import { UploadForm } from '@/components/forms/upload-form';
import { documentLibrary } from '@/data/domain';
import { borrowerProfileOptions, caseTypeOptions, getRequiredDocumentCodes, type IntakePayload } from '@/lib/intake';

type StepKey = 'personal' | 'caseAndIncome' | 'propertyAndLiabilities' | 'consent' | 'documents';
type Lang = 'en' | 'he';

type StepDefinition = {
  key: StepKey;
  label: Record<Lang, string>;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
};

const steps: StepDefinition[] = [
  {
    key: 'personal',
    label: { en: 'Personal', he: 'פרטים' },
    title: { en: 'Personal details & contact', he: 'פרטים אישיים ויצירת קשר' },
    description: { en: 'Applicant, co-applicant, and how to reach you.', he: 'לווה ראשי, לווה נוסף ואופן יצירת קשר.' },
  },
  {
    key: 'caseAndIncome',
    label: { en: 'Case & income', he: 'תיק והכנסה' },
    title: { en: 'Case type & income', he: 'סוג התיק והכנסות' },
    description: { en: 'What kind of case and how income is earned.', he: 'סוג תיק ופרופיל הכנסה.' },
  },
  {
    key: 'propertyAndLiabilities',
    label: { en: 'Property', he: 'נכס' },
    title: { en: 'Property & liabilities', he: 'הנכס והתחייבויות' },
    description: { en: 'Rough numbers are fine.', he: 'מספיקה הערכה.' },
  },
  {
    key: 'consent',
    label: { en: 'Consent', he: 'אישורים' },
    title: { en: 'Consent', he: 'אישורים' },
    description: { en: 'Required to open your file.', he: 'נדרש לפתיחת התיק.' },
  },
  {
    key: 'documents',
    label: { en: 'Documents', he: 'מסמכים' },
    title: { en: 'Documents (optional)', he: 'מסמכים (לא חובה)' },
    description: {
      en: 'Attach now or let the secretary upload later.',
      he: 'אפשר לצרף עכשיו או שהמזכירה תעלה בהמשך.',
    },
  },
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
    successBody: 'Our advisor will contact you within 24 hours. You can upload documents below.',
    caseId: 'Case ID',
    submissionId: 'Submission ID',
    startAnother: 'Start another case',
    of: 'of',
    // section headers within consolidated steps
    mainApplicant: 'Main applicant',
    coApplicantHeader: 'Co-applicant',
    contactHeader: 'Contact',
    caseTypeHeader: 'Case type',
    incomeHeader: 'Income',
    propertyHeader: 'Property',
    liabilitiesHeader: 'Liabilities',
    // fields
    fullName: 'Full name *',
    idNumber: 'ID number',
    birthDate: 'Date of birth',
    maritalStatus: 'Marital status',
    includeCoApplicant: 'Include a co-applicant',
    includeCoApplicantNote: 'Turn on if a spouse or second borrower is part of the application.',
    noSecondBorrower: 'No second borrower will be included.',
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
    hasLoans: 'There are existing loans or fixed monthly obligations',
    hasLoansNote: 'Mark if there are current loan repayments or similar.',
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
    // documents
    documentsNone: 'No extra documents are required for this selection.',
    documentsHint: 'Uploading now is optional. You or the secretary can upload later.',
    uploadPartialWarn: 'Some files could not be uploaded; you can retry below.',
    uploadZonePick: 'Choose file or drag here',
    // resume
    resumeFoundTitle: 'We found an existing case for this ID',
    resumeFoundBody: 'You can continue with your existing case instead of starting over.',
    resumeGo: 'Continue existing case',
    resumeDismiss: 'Start a new one',
    resumeCaseLabel: 'Existing case',
  },
  he: {
    nativeIntake: 'פתיחת תיק חדש',
    missing: 'חסר',
    notProvided: 'טרם הוזן',
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
    successBody: 'הנציגה שלנו תיצור איתך קשר בתוך 24 שעות. ניתן להעלות מסמכים ראשונים כבר עכשיו.',
    caseId: 'מספר תיק',
    submissionId: 'מספר שליחה',
    startAnother: 'פתיחת תיק נוסף',
    of: 'מתוך',
    mainApplicant: 'לווה ראשי',
    coApplicantHeader: 'לווה נוסף',
    contactHeader: 'יצירת קשר',
    caseTypeHeader: 'סוג תיק',
    incomeHeader: 'הכנסות',
    propertyHeader: 'נכס',
    liabilitiesHeader: 'התחייבויות',
    fullName: 'שם מלא *',
    idNumber: 'תעודת זהות',
    birthDate: 'תאריך לידה',
    maritalStatus: 'מצב משפחתי',
    includeCoApplicant: 'יש לווה נוסף בתיק',
    includeCoApplicantNote: 'יש להפעיל אם בן/בת הזוג או לווה נוסף הם חלק מהבקשה.',
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
    hasLoansNote: 'יש לסמן אם קיימות הלוואות פעילות או החזרים חודשיים.',
    monthlyRepayments: 'סך החזרים חודשיים',
    liabilityNotes: 'הערות לגבי התחייבויות',
    privacy: 'אני מאשר/ת להעביר את המידע שנמסר לצורך פתיחת תיק וטיפול במשכנתא.',
    privacyNote: 'נדרש כדי שהמשרד יוכל לפתוח את התיק ולהתחיל לטפל בו.',
    authorization: 'אני מאשר/ת למשרד לעבור על התיק ולהמשיך בטיפול ובמעקב.',
    authorizationNote: 'כולל בדיקה ראשונית, בקשות למסמכים והפעלת תהליך העבודה.',
    accuracy: 'אני מאשר/ת שהפרטים שמסרתי נכונים ככל הידוע לי.',
    accuracyNote: 'אפשר לעדכן פרטים בהמשך מול המשרד במידת הצורך.',
    notes: 'יש משהו נוסף שחשוב שנדע?',
    back: 'חזרה',
    continue: 'המשך',
    submitting: 'שולח…',
    submit: 'שליחת תיק',
    documentsNone: 'אין מסמכים נדרשים לבחירה זו.',
    documentsHint: 'ההעלאה כעת אופציונלית — ניתן להעלות גם בהמשך דרך המשרד.',
    uploadPartialWarn: 'חלק מהקבצים לא הועלו; ניתן לנסות שוב למטה.',
    uploadZonePick: 'בחרו קובץ או גררו לכאן',
    resumeFoundTitle: 'מצאנו תיק קיים עם תעודת הזהות הזו',
    resumeFoundBody: 'ניתן להמשיך עם התיק הקיים במקום לפתוח אחד חדש.',
    resumeGo: 'המשך לתיק הקיים',
    resumeDismiss: 'התחל תיק חדש',
    resumeCaseLabel: 'תיק קיים',
  },
};

const DRAFT_KEY = 'keypoint-intake-draft';

function currencyPlaceholder(language: Lang) {
  return language === 'he' ? '₪ לדוגמה 1,850,000' : '₪ e.g. 1,850,000';
}

/** Inline file drop zone — same visual language as `.upload-zone` on the UploadForm. */
function DocDropZone({
  code,
  label,
  description,
  file,
  language,
  pickLabel,
  onChange,
}: {
  code: string;
  label: string;
  description?: string;
  file: File | null;
  language: Lang;
  pickLabel: string;
  onChange: (file: File | null) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputId = `intake-doc-${code}`;
  return (
    <div className="field field-span-2">
      <span>{label}</span>
      {description ? <p className="muted" style={{ margin: '0 0 6px', fontSize: 13 }}>{description}</p> : null}
      <div
        className={`upload-zone ${drag ? 'dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onChange(f);
        }}
        style={{ padding: '18px 20px' }}
      >
        <div className="upload-zone-icon" aria-hidden style={{ fontSize: '1.8rem', marginBottom: 6 }}>
          📎
        </div>
        <p className="muted" style={{ margin: '0 0 6px', fontSize: 13 }}>
          {pickLabel}
        </p>
        <input
          id={inputId}
          className="upload-file-input"
          type="file"
          accept=".pdf,image/*,application/pdf"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <label htmlFor={inputId} className="upload-zone-label" style={{ fontSize: 14 }}>
          {file?.name || (language === 'he' ? '…' : '…')}
        </label>
      </div>
    </div>
  );
}

export function IntakeForm() {
  const { language, dir } = useI18n();
  const t = copy[language];
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<IntakePayload>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filesByCode, setFilesByCode] = useState<Record<string, File | null>>({});
  const [success, setSuccess] = useState<
    null | { caseId: string; submissionId: string; intakeSource: string; seededDocuments: string[]; uploadFailures: string[] }
  >(null);

  // Resume-by-ID banner state
  const [resumeCandidate, setResumeCandidate] = useState<null | { caseId: string; leadName: string; stage: string }>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const resumeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeLastIdRef = useRef<string>('');

  const requiredCodes = useMemo(
    () => getRequiredDocumentCodes(form.caseType, form.incomeProfile.borrowerProfiles),
    [form.caseType, form.incomeProfile.borrowerProfiles],
  );
  const requiredCodesKey = requiredCodes.join('|');

  useEffect(() => {
    setFilesByCode({});
  }, [requiredCodesKey]);

  // Restore draft from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { form?: IntakePayload; stepIndex?: number };
        if (saved.form) setForm(saved.form);
        if (typeof saved.stepIndex === 'number') setStepIndex(Math.min(saved.stepIndex, steps.length - 1));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave draft whenever form or step changes
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, stepIndex }));
    } catch {}
  }, [form, stepIndex]);

  // Debounced lookup by ID number — offers to jump to an existing case
  useEffect(() => {
    const rawId = form.applicant.idNumber || '';
    const normalized = rawId.replace(/\D/g, '');

    if (resumeDebounceRef.current) {
      clearTimeout(resumeDebounceRef.current);
      resumeDebounceRef.current = null;
    }

    if (resumeDismissed) return;
    if (normalized.length < 7) {
      if (resumeCandidate) setResumeCandidate(null);
      resumeLastIdRef.current = '';
      return;
    }
    if (normalized === resumeLastIdRef.current) return;

    resumeDebounceRef.current = setTimeout(() => {
      resumeLastIdRef.current = normalized;
      (async () => {
        try {
          const res = await fetch('/api/intake/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNumber: normalized }),
          });
          if (!res.ok) return;
          const json = (await res.json()) as { found?: boolean; caseId?: string; leadName?: string; stage?: string };
          if (json.found && json.caseId) {
            setResumeCandidate({
              caseId: json.caseId,
              leadName: json.leadName || '',
              stage: json.stage || '',
            });
          } else {
            setResumeCandidate(null);
          }
        } catch {
          // Network errors should not block intake; silently ignore
        }
      })();
    }, 650);

    return () => {
      if (resumeDebounceRef.current) clearTimeout(resumeDebounceRef.current);
    };
  }, [form.applicant.idNumber, resumeCandidate, resumeDismissed]);

  const currentStep = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  function updateSection<K extends keyof IntakePayload>(section: K, values: Partial<IntakePayload[K]>) {
    setForm((current) => ({ ...current, [section]: { ...(current[section] as object), ...(values as object) } }));
  }

  function validateStep(index = stepIndex) {
    const step = steps[index];
    switch (step.key) {
      case 'personal':
        if (!form.applicant.fullName.trim()) return t.applicantRequired;
        if (form.coApplicant.hasCoApplicant && !form.coApplicant.fullName?.trim()) return t.coApplicantRequired;
        if (!form.contact.phone.trim()) return t.phoneRequired;
        if (form.contact.email && !/^\S+@\S+\.\S+$/.test(form.contact.email)) return t.emailInvalid;
        return null;
      case 'caseAndIncome':
        if (!form.caseType) return t.caseTypeRequired;
        if (!form.incomeProfile.borrowerProfiles.length) return t.incomeRequired;
        return null;
      case 'propertyAndLiabilities':
        return null;
      case 'consent':
        if (!form.consent.privacyAccepted || !form.consent.advisorAuthorizationAccepted || !form.consent.accuracyConfirmed) return t.consentRequired;
        return null;
      case 'documents':
        // Documents are optional — secretary can upload later.
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

  /** Allow pressing Enter inside the last form field of each step to advance. */
  function handleStepKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter') return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return; // textareas keep newlines
    if (stepIndex >= steps.length - 1) return;
    event.preventDefault();
    nextStep();
  }

  function jumpToExistingCase() {
    if (!resumeCandidate) return;
    setSuccess({
      caseId: resumeCandidate.caseId,
      submissionId: 'existing',
      intakeSource: 'resume-by-id',
      seededDocuments: [],
      uploadFailures: [],
    });
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
      const caseId = json.data?.id || 'pending';
      const uploadFailures: string[] = [];
      for (const code of requiredCodes) {
        const file = filesByCode[code];
        if (!file) continue;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('caseId', caseId);
        fd.append('documentCode', code);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) uploadFailures.push(code);
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setSuccess({
        caseId,
        submissionId: json.meta?.submissionId || 'pending',
        intakeSource: json.meta?.source || 'native-intake',
        seededDocuments: Array.isArray(json.meta?.seededDocuments) ? json.meta.seededDocuments : [],
        uploadFailures,
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
      return {
        ...current,
        incomeProfile: {
          ...current.incomeProfile,
          borrowerProfiles: exists
            ? current.incomeProfile.borrowerProfiles.filter((item) => item !== value)
            : [...current.incomeProfile.borrowerProfiles, value as never],
        },
      };
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
          {success.uploadFailures.length ? (
            <p className="muted text-feedback-warn">
              {t.uploadPartialWarn} {success.uploadFailures.join(', ')}
            </p>
          ) : null}
          <div className="review-grid compact">
            <div className="review-row"><span>{t.caseId}</span><strong>{success.caseId}</strong></div>
            {success.submissionId !== 'existing' ? (
              <div className="review-row"><span>{t.submissionId}</span><strong>{success.submissionId}</strong></div>
            ) : null}
          </div>
          <div className="inline-actions">
            <button
              className="button"
              type="button"
              onClick={() => {
                try { localStorage.removeItem(DRAFT_KEY); } catch {}
                setForm(initialState);
                setFilesByCode({});
                setSuccess(null);
                setStepIndex(0);
                setResumeCandidate(null);
                setResumeDismissed(false);
              }}
            >
              {t.startAnother}
            </button>
          </div>
        </section>
        <UploadForm
          caseId={success.caseId}
          allowedDocumentCodes={success.seededDocuments}
          defaultDocumentCode={success.seededDocuments[0] || 'id-card'}
        />
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
            <button
              key={step.key}
              type="button"
              className={`step-pill ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
              onClick={() => setStepIndex(index)}
            >
              <span>{index + 1}</span>
              <strong>{step.label[language]}</strong>
            </button>
          ))}
        </div>

        {resumeCandidate && !resumeDismissed ? (
          <div className="card nested-card" style={{ marginTop: 12, borderColor: 'rgba(13,148,136,0.3)' }}>
            <p className="eyebrow">{t.resumeFoundTitle}</p>
            <p className="muted" style={{ marginTop: 4 }}>{t.resumeFoundBody}</p>
            <div className="review-grid compact" style={{ marginTop: 8 }}>
              <div className="review-row">
                <span>{t.resumeCaseLabel}</span>
                <strong>{resumeCandidate.caseId}{resumeCandidate.leadName ? ` — ${resumeCandidate.leadName}` : ''}</strong>
              </div>
            </div>
            <div className="inline-actions" style={{ marginTop: 12 }}>
              <button className="button" type="button" onClick={jumpToExistingCase}>
                {t.resumeGo}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setResumeDismissed(true);
                  setResumeCandidate(null);
                }}
              >
                {t.resumeDismiss}
              </button>
            </div>
          </div>
        ) : null}

        <div className="intake-body fade-panel" onKeyDown={handleStepKeyDown}>
          {currentStep.key === 'personal' && (
            <div className="grid" style={{ gap: 20 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{t.mainApplicant}</p>
                <div className="form-grid cols-2">
                  <label className="field field-lg"><span>{t.fullName}</span><input value={form.applicant.fullName} onChange={(e) => updateSection('applicant', { fullName: e.target.value })} /></label>
                  <label className="field field-lg"><span>{t.idNumber}</span><input value={form.applicant.idNumber} onChange={(e) => updateSection('applicant', { idNumber: e.target.value })} inputMode="numeric" /></label>
                  <label className="field"><span>{t.birthDate}</span><input type="date" value={form.applicant.birthDate} onChange={(e) => updateSection('applicant', { birthDate: e.target.value })} /></label>
                  <label className="field"><span>{t.maritalStatus}</span><input value={form.applicant.maritalStatus} onChange={(e) => updateSection('applicant', { maritalStatus: e.target.value })} /></label>
                </div>
              </div>

              <div>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{t.coApplicantHeader}</p>
                <label className="choice-card toggle-row">
                  <input
                    type="checkbox"
                    checked={form.coApplicant.hasCoApplicant}
                    onChange={(e) => updateSection('coApplicant', { hasCoApplicant: e.target.checked })}
                  />
                  <div>
                    <strong>{t.includeCoApplicant}</strong>
                    <p className="muted">{t.includeCoApplicantNote}</p>
                  </div>
                </label>
                {form.coApplicant.hasCoApplicant ? (
                  <div className="form-grid cols-2" style={{ marginTop: 12 }}>
                    <label className="field field-lg"><span>{t.coApplicantName}</span><input value={form.coApplicant.fullName} onChange={(e) => updateSection('coApplicant', { fullName: e.target.value })} /></label>
                    <label className="field field-lg"><span>{t.idNumber}</span><input value={form.coApplicant.idNumber} onChange={(e) => updateSection('coApplicant', { idNumber: e.target.value })} inputMode="numeric" /></label>
                    <label className="field"><span>{t.birthDate}</span><input type="date" value={form.coApplicant.birthDate} onChange={(e) => updateSection('coApplicant', { birthDate: e.target.value })} /></label>
                    <label className="field"><span>{t.relationship}</span><input value={form.coApplicant.relationship} onChange={(e) => updateSection('coApplicant', { relationship: e.target.value })} /></label>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{t.contactHeader}</p>
                <div className="form-grid cols-2">
                  <label className="field field-lg"><span>{t.phone}</span><input value={form.contact.phone} onChange={(e) => updateSection('contact', { phone: e.target.value })} inputMode="tel" /></label>
                  <label className="field field-lg"><span>{t.email}</span><input value={form.contact.email} onChange={(e) => updateSection('contact', { email: e.target.value })} inputMode="email" /></label>
                  <label className="field">
                    <span>{t.preferredLanguage}</span>
                    <select value={form.contact.preferredLanguage} onChange={(e) => updateSection('contact', { preferredLanguage: e.target.value as 'he' | 'en' })}>
                      <option value="he">עברית</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t.preferredChannel}</span>
                    <select value={form.contact.preferredChannel} onChange={(e) => updateSection('contact', { preferredChannel: e.target.value as 'whatsapp' | 'phone' | 'email' })}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">{language === 'he' ? 'שיחה טלפונית' : 'Phone call'}</option>
                      <option value="email">{t.email}</option>
                    </select>
                  </label>
                  <label className="field"><span>{t.city}</span><input value={form.contact.city} onChange={(e) => updateSection('contact', { city: e.target.value })} /></label>
                  <label className="field"><span>{t.bestTime}</span><input value={form.contact.bestTimeToReach} onChange={(e) => updateSection('contact', { bestTimeToReach: e.target.value })} /></label>
                </div>
              </div>
            </div>
          )}

          {currentStep.key === 'caseAndIncome' && (
            <div className="grid" style={{ gap: 20 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{t.caseTypeHeader}</p>
                <div className="choice-grid">
                  {caseTypeOptions.map((option) => (
                    <label key={option.value} className={`choice-card ${form.caseType === option.value ? 'selected' : ''}`}>
                      <input type="radio" name="caseType" checked={form.caseType === option.value} onChange={() => setForm((current) => ({ ...current, caseType: option.value }))} />
                      <div>
                        <strong>{option.label[language]}</strong>
                        <p className="muted">{option.hint[language]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{t.incomeHeader}</p>
                <div className="choice-grid compact-choice-grid">
                  {borrowerProfileOptions.map((option) => {
                    const selected = form.incomeProfile.borrowerProfiles.includes(option.value);
                    return (
                      <label key={option.value} className={`choice-card ${selected ? 'selected' : ''}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleBorrowerProfile(option.value)} />
                        <div>
                          <strong>{option.label[language]}</strong>
                          <p className="muted">{option.hint[language]}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="form-grid cols-2" style={{ marginTop: 12 }}>
                  <label className="field"><span>{t.monthlyIncome}</span><input value={form.incomeProfile.monthlyNetIncome} onChange={(e) => updateSection('incomeProfile', { monthlyNetIncome: e.target.value })} placeholder={currencyPlaceholder(language)} inputMode="numeric" /></label>
                  <label className="field"><span>{t.additionalIncome}</span><input value={form.incomeProfile.additionalIncome} onChange={(e) => updateSection('incomeProfile', { additionalIncome: e.target.value })} /></label>
                  <label className="field field-span-2"><span>{t.employmentNotes}</span><textarea value={form.incomeProfile.employmentNotes} onChange={(e) => updateSection('incomeProfile', { employmentNotes: e.target.value })} /></label>
                </div>
              </div>
            </div>
          )}

          {currentStep.key === 'propertyAndLiabilities' && (
            <div className="grid" style={{ gap: 20 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{t.propertyHeader}</p>
                <div className="form-grid cols-2">
                  <label className="field"><span>{t.purchasePrice}</span><input value={form.property.purchasePrice} onChange={(e) => updateSection('property', { purchasePrice: e.target.value })} placeholder={currencyPlaceholder(language)} inputMode="numeric" /></label>
                  <label className="field"><span>{t.mortgageAmount}</span><input value={form.property.requestedMortgageAmount} onChange={(e) => updateSection('property', { requestedMortgageAmount: e.target.value })} placeholder={currencyPlaceholder(language)} inputMode="numeric" /></label>
                  <label className="field"><span>{t.propertyCity}</span><input value={form.property.propertyCity} onChange={(e) => updateSection('property', { propertyCity: e.target.value })} /></label>
                  <label className="field"><span>{t.propertyValue}</span><input value={form.property.propertyValueEstimate} onChange={(e) => updateSection('property', { propertyValueEstimate: e.target.value })} placeholder={currencyPlaceholder(language)} inputMode="numeric" /></label>
                  <label className="field"><span>{t.equity}</span><input value={form.property.equityAvailable} onChange={(e) => updateSection('property', { equityAvailable: e.target.value })} placeholder={currencyPlaceholder(language)} inputMode="numeric" /></label>
                  <label className="field"><span>{t.timeline}</span><input value={form.property.timeline} onChange={(e) => updateSection('property', { timeline: e.target.value })} /></label>
                </div>
              </div>

              <div>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{t.liabilitiesHeader}</p>
                <label className="choice-card toggle-row">
                  <input type="checkbox" checked={form.liabilities.hasExistingLoans} onChange={(e) => updateSection('liabilities', { hasExistingLoans: e.target.checked })} />
                  <div>
                    <strong>{t.hasLoans}</strong>
                    <p className="muted">{t.hasLoansNote}</p>
                  </div>
                </label>
                {form.liabilities.hasExistingLoans ? (
                  <div className="form-grid cols-2" style={{ marginTop: 12 }}>
                    <label className="field"><span>{t.monthlyRepayments}</span><input value={form.liabilities.monthlyLoanRepayments} onChange={(e) => updateSection('liabilities', { monthlyLoanRepayments: e.target.value })} placeholder={currencyPlaceholder(language)} inputMode="numeric" /></label>
                    <label className="field field-span-2"><span>{t.liabilityNotes}</span><textarea value={form.liabilities.liabilityNotes} onChange={(e) => updateSection('liabilities', { liabilityNotes: e.target.value })} /></label>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {currentStep.key === 'consent' && (
            <div className="grid">
              <label className={`choice-card toggle-row ${form.consent.privacyAccepted ? 'selected' : ''}`}>
                <input type="checkbox" checked={form.consent.privacyAccepted} onChange={(e) => updateSection('consent', { privacyAccepted: e.target.checked })} />
                <div><strong>{t.privacy}</strong><p className="muted">{t.privacyNote}</p></div>
              </label>
              <label className={`choice-card toggle-row ${form.consent.advisorAuthorizationAccepted ? 'selected' : ''}`}>
                <input type="checkbox" checked={form.consent.advisorAuthorizationAccepted} onChange={(e) => updateSection('consent', { advisorAuthorizationAccepted: e.target.checked })} />
                <div><strong>{t.authorization}</strong><p className="muted">{t.authorizationNote}</p></div>
              </label>
              <label className={`choice-card toggle-row ${form.consent.accuracyConfirmed ? 'selected' : ''}`}>
                <input type="checkbox" checked={form.consent.accuracyConfirmed} onChange={(e) => updateSection('consent', { accuracyConfirmed: e.target.checked })} />
                <div><strong>{t.accuracy}</strong><p className="muted">{t.accuracyNote}</p></div>
              </label>
              <label className="field field-span-2"><span>{t.notes}</span><textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></label>
            </div>
          )}

          {currentStep.key === 'documents' && (
            <div className="grid">
              <p className="muted" style={{ margin: 0 }}>{t.documentsHint}</p>
              {!requiredCodes.length ? (
                <p className="muted">{t.documentsNone}</p>
              ) : (
                <div className="form-grid cols-2">
                  {requiredCodes.map((code) => {
                    const meta = documentLibrary.find((d) => d.code === code);
                    const label = language === 'he' ? meta?.labelHe || code : meta?.labelEn || code;
                    const desc = meta?.description;
                    return (
                      <DocDropZone
                        key={code}
                        code={code}
                        label={label}
                        description={desc}
                        file={filesByCode[code] || null}
                        language={language}
                        pickLabel={t.uploadZonePick}
                        onChange={(file) => setFilesByCode((prev) => ({ ...prev, [code]: file }))}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="intake-actions">
          <button className="button button-secondary" type="button" onClick={previousStep} disabled={stepIndex === 0 || submitting}>{t.back}</button>
          {stepIndex < steps.length - 1 ? (
            <button className="button" type="button" onClick={nextStep} disabled={submitting}>{t.continue}</button>
          ) : (
            <button className="button" type="button" onClick={handleSubmit} disabled={submitting}>{submitting ? t.submitting : t.submit}</button>
          )}
        </div>
      </section>
    </div>
  );
}
