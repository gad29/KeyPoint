'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n';
import { SignaturePad } from '@/components/onboarding/signature-pad';
import { DocumentUploader } from '@/components/onboarding/document-uploader';
import { renderContract } from '@/lib/onboarding/render';
import type { OnboardingTemplate } from '@/lib/onboarding/types';
import type { WizardField } from '@/lib/presets/types';

type Lang = 'en' | 'he';
type Value = string | boolean | string[];
type Answers = Record<string, Value>;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const copy = {
  en: {
    eyebrow: 'Getting started',
    of: 'of',
    back: 'Back',
    next: 'Continue',
    submit: 'Submit',
    signSubmit: 'Sign & submit',
    submitting: 'Sending…',
    required: (label: string) => `${label} is required.`,
    contactNeeded: 'Please add a phone number or an email.',
    emailInvalid: 'Please enter a valid email address.',
    failed: 'Something went wrong. Please try again.',
    contractLabel: 'Agreement',
    contractTitle: 'Read and sign',
    contractHint: 'Scroll through the agreement, then sign below.',
    agree: 'I have read the agreement and accept its terms',
    signerName: 'Full name of signer',
    signature: 'Signature',
    clear: 'Clear',
    signHint: 'Sign with your finger or mouse',
    acceptNeeded: 'Please accept the agreement.',
    signNeeded: 'Please sign in the box.',
    docsLabel: 'Documents',
    doneTitle: (name: string) => `Thank you, ${name}`,
    doneBody: 'Your details were received. We will be in touch soon.',
    docsTitle: 'Upload your documents',
    docsBody: 'Upload what you have now. You can add the rest later from your personal link.',
    linkTitle: 'Your personal link',
    linkBody: 'Save it to follow your file and upload documents any time.',
    copy: 'Copy link',
    copied: 'Copied',
    open: 'Open',
    signedNote: 'Agreement signed',
    signFailedNote: 'The signature was not saved. We will contact you to sign again.',
  },
  he: {
    eyebrow: 'מתחילים',
    of: 'מתוך',
    back: 'חזרה',
    next: 'המשך',
    submit: 'שליחה',
    signSubmit: 'חתימה ושליחה',
    submitting: 'שולח…',
    required: (label: string) => `${label} — שדה חובה.`,
    contactNeeded: 'נא להזין טלפון או אימייל.',
    emailInvalid: 'נא להזין כתובת אימייל תקינה.',
    failed: 'משהו השתבש. אפשר לנסות שוב.',
    contractLabel: 'הסכם',
    contractTitle: 'קריאה וחתימה',
    contractHint: 'קראו את ההסכם עד הסוף וחתמו למטה.',
    agree: 'קראתי את ההסכם ואני מסכים/ה לתנאיו',
    signerName: 'שם מלא של החותם/ת',
    signature: 'חתימה',
    clear: 'ניקוי',
    signHint: 'חתמו עם האצבע או העכבר',
    acceptNeeded: 'נא לאשר את ההסכם.',
    signNeeded: 'נא לחתום בתיבה.',
    docsLabel: 'מסמכים',
    doneTitle: (name: string) => `תודה, ${name}`,
    doneBody: 'הפרטים התקבלו. נחזור אליך בהקדם.',
    docsTitle: 'העלאת מסמכים',
    docsBody: 'העלו עכשיו את מה שיש. את השאר אפשר להוסיף בהמשך דרך הקישור האישי.',
    linkTitle: 'הקישור האישי שלך',
    linkBody: 'שמרו אותו כדי לעקוב אחרי התיק ולהעלות מסמכים בכל זמן.',
    copy: 'העתקת קישור',
    copied: 'הועתק',
    open: 'פתיחה',
    signedNote: 'ההסכם נחתם',
    signFailedNote: 'החתימה לא נשמרה. ניצור קשר לחתימה מחדש.',
  },
};

function initialAnswers(template: OnboardingTemplate): Answers {
  const answers: Answers = {};
  for (const step of template.steps) {
    for (const field of step.fields) {
      answers[field.key] = field.kind === 'checkbox' ? false : field.kind === 'multiselect' ? [] : '';
    }
  }
  return answers;
}

function isMissing(field: WizardField, value: Value | undefined) {
  if (field.kind === 'checkbox') return value !== true;
  if (field.kind === 'multiselect') return !Array.isArray(value) || value.length === 0;
  return typeof value !== 'string' || !value.trim();
}

interface Props {
  template: OnboardingTemplate;
  businessName: string;
  businessNameHe: string;
}

type Success = { caseId: string; token: string; portalUrl: string; contractSigned: boolean };

export function OnboardingWizard({ template, businessName, businessNameHe }: Props) {
  const { language, dir } = useI18n();
  const lang: Lang = language;
  const t = copy[lang];
  const draftKey = `agency-os-onboarding:${template.slug}`;

  const [answers, setAnswers] = useState<Answers>(() => initialAnswers(template));
  const [stepIndex, setStepIndex] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<Success | null>(null);
  const [copied, setCopied] = useState(false);

  const hasContract = Boolean(template.contract);
  const formSteps = template.steps;
  const totalSteps = formSteps.length + (hasContract ? 1 : 0);
  const onContractStep = hasContract && stepIndex === formSteps.length;
  const isLastStep = stepIndex === totalSteps - 1;
  const pillLabels = [
    ...formSteps.map((s) => (lang === 'he' ? s.labelHe : s.labelEn)),
    ...(hasContract ? [t.contractLabel] : []),
    ...(template.documents.length ? [t.docsLabel] : []),
  ];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { answers?: Answers; stepIndex?: number };
      if (saved.answers) setAnswers((current) => ({ ...current, ...saved.answers }));
      if (typeof saved.stepIndex === 'number') setStepIndex(Math.min(saved.stepIndex, formSteps.length - 1));
    } catch {}
  }, [draftKey, formSteps.length]);

  useEffect(() => {
    if (success) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ answers, stepIndex: Math.min(stepIndex, formSteps.length - 1) }));
    } catch {}
  }, [answers, stepIndex, draftKey, formSteps.length, success]);

  const contract = useMemo(() => {
    if (!template.contract) return null;
    return renderContract(template.contract, lang, {
      clientName: typeof answers.fullName === 'string' ? answers.fullName : '',
      businessName: lang === 'he' ? businessNameHe : businessName,
      email: typeof answers.email === 'string' ? answers.email : '',
      phone: typeof answers.phone === 'string' ? answers.phone : '',
      answers,
    });
  }, [template.contract, lang, answers, businessName, businessNameHe]);

  function setValue(key: string, value: Value) {
    setError('');
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(index: number): string | null {
    if (hasContract && index === formSteps.length) {
      if (!accepted) return t.acceptNeeded;
      if (!signerName.trim()) return t.required(t.signerName);
      if (!signatureImage) return t.signNeeded;
      return null;
    }
    const step = formSteps[index];
    for (const field of step.fields) {
      if (field.required && isMissing(field, answers[field.key])) return t.required(lang === 'he' ? field.labelHe : field.labelEn);
      if (field.kind === 'email' && typeof answers[field.key] === 'string' && answers[field.key] && !EMAIL_RE.test(String(answers[field.key]))) {
        return t.emailInvalid;
      }
    }
    const keys = step.fields.map((f) => f.key);
    if (keys.includes('phone') && keys.includes('email') && !String(answers.phone || '').trim() && !String(answers.email || '').trim()) {
      return t.contactNeeded;
    }
    return null;
  }

  function goTo(index: number) {
    setError('');
    if (index === formSteps.length && hasContract && !signerName && typeof answers.fullName === 'string') {
      setSignerName(answers.fullName);
    }
    setStepIndex(index);
  }

  function next() {
    const problem = validateStep(stepIndex);
    if (problem) return setError(problem);
    goTo(stepIndex + 1);
  }

  async function submit() {
    for (let i = 0; i < totalSteps; i += 1) {
      const problem = validateStep(i);
      if (problem) {
        setStepIndex(i);
        return setError(problem);
      }
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'generic-intake',
          template: template.slug,
          language: lang,
          answers,
          signature: hasContract ? { signerName: signerName.trim(), imageDataUrl: signatureImage, accepted } : undefined,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { id: string };
        meta?: { portalToken?: string; portalUrl?: string; contractSigned?: boolean };
      };
      if (!res.ok || !json.ok || !json.data) throw new Error(json.error || t.failed);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setSuccess({
        caseId: json.data.id,
        token: json.meta?.portalToken || '',
        portalUrl: json.meta?.portalUrl || '',
        contractSigned: Boolean(json.meta?.contractSigned),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const name = typeof answers.fullName === 'string' ? answers.fullName.split(' ')[0] : '';
    const localPortalPath = success.token ? `/progress/${success.token}` : '';
    return (
      <div className="intake-flow-wide grid" dir={dir} style={{ gap: 20 }}>
        <section className="card intake-success-card">
          <span className="success-mark">✓</span>
          <p className="eyebrow">#{success.caseId}</p>
          <h2>{t.doneTitle(name)}</h2>
          <p className="muted">{t.doneBody}</p>
          {hasContract ? (
            <p className={success.contractSigned ? 'muted' : 'form-error'}>
              {success.contractSigned ? `✓ ${t.signedNote}` : t.signFailedNote}
            </p>
          ) : null}
        </section>

        {template.documents.length ? (
          <section className="card">
            <p className="eyebrow">{t.docsLabel}</p>
            <h3 className="onboarding-section-title">{t.docsTitle}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{t.docsBody}</p>
            <DocumentUploader caseId={success.caseId} token={success.token} items={template.documents} />
          </section>
        ) : null}

        {localPortalPath ? (
          <section className="card portal-link-card">
            <div>
              <p className="eyebrow">{t.linkTitle}</p>
              <p className="muted" style={{ margin: '4px 0 0' }}>{t.linkBody}</p>
            </div>
            <div className="inline-actions">
              <button
                type="button"
                className="button button-secondary button-compact"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(new URL(localPortalPath, window.location.origin).toString());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {}
                }}
              >
                {copied ? t.copied : t.copy}
              </button>
              <a className="button button-compact" href={localPortalPath}>
                {t.open}
              </a>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  const step = onContractStep ? null : formSteps[stepIndex];
  const title = onContractStep ? t.contractTitle : lang === 'he' ? step?.titleHe : step?.titleEn;
  const description = onContractStep ? t.contractHint : (lang === 'he' ? step?.descriptionHe : step?.descriptionEn) || '';
  const progress = ((stepIndex + 1) / pillLabels.length) * 100;

  return (
    <div className="intake-flow-wide grid" dir={dir}>
      <section className="card intake-shell">
        <div className="intake-header">
          <div>
            <p className="eyebrow">{lang === 'he' ? template.nameHe : template.name || t.eyebrow}</p>
            <h2>{title}</h2>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          <div className="progress-chip">
            <strong>{stepIndex + 1}</strong>
            <span>
              {t.of} {pillLabels.length}
            </span>
          </div>
        </div>

        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="intake-step-list">
          {pillLabels.map((label, index) => (
            <button
              key={`${label}-${index}`}
              type="button"
              className={`step-pill ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
              onClick={() => index < stepIndex && goTo(index)}
              disabled={index > stepIndex}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>

        <div className="intake-body fade-panel" key={stepIndex}>
          {step ? (
            <div className="form-grid cols-2">
              {step.fields.map((field) => (
                <FieldInput key={field.key} field={field} lang={lang} value={answers[field.key]} onChange={(v) => setValue(field.key, v)} />
              ))}
            </div>
          ) : null}

          {onContractStep && contract ? (
            <div className="grid" style={{ gap: 16 }}>
              <article className="contract-box" tabIndex={0} aria-label={contract.title}>
                <h3>{contract.title}</h3>
                {contract.body.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </article>
              <label className={`choice-card toggle-row ${accepted ? 'selected' : ''}`}>
                <input type="checkbox" checked={accepted} onChange={(e) => { setError(''); setAccepted(e.target.checked); }} />
                <div>
                  <strong>{t.agree}</strong>
                </div>
              </label>
              <label className="field field-lg">
                <span>{t.signerName}</span>
                <input value={signerName} onChange={(e) => { setError(''); setSignerName(e.target.value); }} autoComplete="name" />
              </label>
              <SignaturePad label={t.signature} clearLabel={t.clear} hint={t.signHint} onChange={(img) => { setError(''); setSignatureImage(img); }} />
            </div>
          ) : null}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="intake-actions">
          <button className="button button-secondary" type="button" onClick={() => goTo(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0 || submitting}>
            {t.back}
          </button>
          {isLastStep ? (
            <button className="button" type="button" onClick={submit} disabled={submitting}>
              {submitting ? t.submitting : hasContract ? t.signSubmit : t.submit}
            </button>
          ) : (
            <button className="button" type="button" onClick={next}>
              {t.next}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function FieldInput({ field, lang, value, onChange }: { field: WizardField; lang: Lang; value: Value | undefined; onChange: (v: Value) => void }) {
  const label = `${lang === 'he' ? field.labelHe : field.labelEn}${field.required ? ' *' : ''}`;
  const placeholder = (lang === 'he' ? field.placeholderHe : field.placeholderEn) || undefined;
  const optionLabel = (o: NonNullable<WizardField['options']>[number]) => (lang === 'he' ? o.labelHe : o.labelEn);

  if (field.kind === 'checkbox') {
    return (
      <label className={`choice-card toggle-row field-span-2 ${value === true ? 'selected' : ''}`}>
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <div>
          <strong>{label}</strong>
        </div>
      </label>
    );
  }

  if (field.kind === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="field-span-2 onboarding-fieldset">
        <legend className="onboarding-legend">{label}</legend>
        <div className="choice-grid compact-choice-grid">
          {(field.options ?? []).map((o) => {
            const on = selected.includes(o.value);
            return (
              <label key={o.value} className={`choice-card ${on ? 'selected' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])} />
                <div>
                  <strong>{optionLabel(o)}</strong>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <label className="field field-span-2">
        <span>{label}</span>
        <textarea value={typeof value === 'string' ? value : ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  if (field.kind === 'select') {
    return (
      <label className="field">
        <span>{label}</span>
        <select value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const inputType = field.kind === 'email' ? 'email' : field.kind === 'tel' ? 'tel' : field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text';
  const autoComplete = field.key === 'fullName' ? 'name' : field.key === 'email' ? 'email' : field.key === 'phone' ? 'tel' : undefined;
  return (
    <label className={`field ${field.key === 'fullName' || field.key === 'phone' || field.key === 'email' ? 'field-lg' : ''}`}>
      <span>{label}</span>
      <input
        type={inputType}
        value={typeof value === 'string' ? value : ''}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={field.kind === 'tel' ? 'tel' : field.kind === 'email' ? 'email' : field.kind === 'number' ? 'decimal' : undefined}
        dir={field.kind === 'email' || field.kind === 'tel' ? 'ltr' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
