'use client';

import { useMemo, useState } from 'react';
import { borrowerProfileOptions, caseTypeOptions, type IntakePayload } from '@/lib/intake';

type StepKey =
  | 'applicant'
  | 'coApplicant'
  | 'contact'
  | 'caseType'
  | 'income'
  | 'property'
  | 'liabilities'
  | 'consent'
  | 'review';

const steps: Array<{ key: StepKey; label: string; title: string; description: string }> = [
  {
    key: 'applicant',
    label: 'Applicant',
    title: 'Tell us who is applying',
    description: 'Start with the main applicant so we can open the right mortgage case.',
  },
  {
    key: 'coApplicant',
    label: 'Co-applicant',
    title: 'Add spouse or co-applicant details',
    description: 'Only include a second borrower if they are part of the mortgage file.',
  },
  {
    key: 'contact',
    label: 'Contact',
    title: 'How should the office reach you?',
    description: 'We keep the intake WhatsApp-first, but let clients choose what works best.',
  },
  {
    key: 'caseType',
    label: 'Case type',
    title: 'What kind of mortgage case is this?',
    description: 'Selecting the case type helps us prepare the right document list and workflow.',
  },
  {
    key: 'income',
    label: 'Income',
    title: 'Describe the income profile',
    description: 'Pick every profile that applies so the office can ask for the right proofs upfront.',
  },
  {
    key: 'property',
    label: 'Property',
    title: 'Add the property and financing picture',
    description: 'A lightweight estimate is enough for the first pass.',
  },
  {
    key: 'liabilities',
    label: 'Liabilities',
    title: 'List existing loan obligations',
    description: 'This helps the advisor assess affordability before bank outreach begins.',
  },
  {
    key: 'consent',
    label: 'Consent',
    title: 'Confirm consent and authorization',
    description: 'We need explicit approval before staff starts work on the file.',
  },
  {
    key: 'review',
    label: 'Review',
    title: 'Review everything before submitting',
    description: 'One final pass before the office receives the intake.',
  },
];

const initialState: IntakePayload = {
  applicant: {
    fullName: '',
    idNumber: '',
    birthDate: '',
    maritalStatus: '',
  },
  coApplicant: {
    hasCoApplicant: false,
    fullName: '',
    idNumber: '',
    birthDate: '',
    relationship: '',
  },
  contact: {
    phone: '',
    email: '',
    preferredLanguage: 'he',
    preferredChannel: 'whatsapp',
    city: '',
    bestTimeToReach: '',
  },
  caseType: 'purchase-single-dwelling',
  incomeProfile: {
    borrowerProfiles: ['salaried'],
    monthlyNetIncome: '',
    additionalIncome: '',
    employmentNotes: '',
  },
  property: {
    purchasePrice: '',
    requestedMortgageAmount: '',
    propertyCity: '',
    propertyValueEstimate: '',
    equityAvailable: '',
    timeline: '',
  },
  liabilities: {
    hasExistingLoans: false,
    monthlyLoanRepayments: '',
    liabilityNotes: '',
  },
  consent: {
    privacyAccepted: false,
    advisorAuthorizationAccepted: false,
    accuracyConfirmed: false,
  },
  notes: '',
};

function currencyPlaceholder() {
  return '₪ e.g. 1,850,000';
}

export function IntakeForm() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<IntakePayload>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<null | { caseId: string; submissionId: string; intakeSource: string }>(null);

  const currentStep = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const reviewItems = useMemo(
    () => [
      { label: 'Applicant', value: form.applicant.fullName || 'Missing' },
      { label: 'Phone', value: form.contact.phone || 'Missing' },
      { label: 'Case type', value: caseTypeOptions.find((item) => item.value === form.caseType)?.label || form.caseType },
      { label: 'Income profiles', value: form.incomeProfile.borrowerProfiles.length ? form.incomeProfile.borrowerProfiles.join(', ') : 'Missing' },
      { label: 'Property city', value: form.property.propertyCity || 'Not provided yet' },
      { label: 'Consent', value: form.consent.privacyAccepted && form.consent.advisorAuthorizationAccepted && form.consent.accuracyConfirmed ? 'Complete' : 'Still missing approvals' },
    ],
    [form],
  );

  function updateSection<K extends keyof IntakePayload>(section: K, values: Partial<IntakePayload[K]>) {
    setForm((current) => ({
      ...current,
      [section]: {
        ...(current[section] as object),
        ...(values as object),
      },
    }));
  }

  function validateStep(index = stepIndex) {
    const step = steps[index];
    switch (step.key) {
      case 'applicant':
        if (!form.applicant.fullName.trim()) return 'Applicant full name is required.';
        return null;
      case 'coApplicant':
        if (form.coApplicant.hasCoApplicant && !form.coApplicant.fullName?.trim()) return 'Co-applicant name is required when a second borrower is included.';
        return null;
      case 'contact':
        if (!form.contact.phone.trim()) return 'Phone number is required.';
        if (form.contact.email && !/^\S+@\S+\.\S+$/.test(form.contact.email)) return 'Enter a valid email address.';
        return null;
      case 'caseType':
        if (!form.caseType) return 'Choose a case type.';
        return null;
      case 'income':
        if (!form.incomeProfile.borrowerProfiles.length) return 'Select at least one income profile.';
        return null;
      case 'property':
        return null;
      case 'liabilities':
        return null;
      case 'consent':
        if (!form.consent.privacyAccepted || !form.consent.advisorAuthorizationAccepted || !form.consent.accuracyConfirmed) {
          return 'All three consent confirmations are required before submission.';
        }
        return null;
      case 'review':
        return null;
      default:
        return null;
    }
  }

  function nextStep() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setError('');
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit() {
    const validationError = validateStep(stepIndex);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'native-intake',
          intake: form,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Intake submission failed');
      }

      setSuccess({
        caseId: json.data?.id || 'pending',
        submissionId: json.meta?.submissionId || 'pending',
        intakeSource: json.meta?.source || 'native-intake',
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to submit intake');
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
      <section className="card intake-success-card">
        <span className="success-mark">✓</span>
        <p className="eyebrow">Intake submitted</p>
        <h2>Thanks — the KeyPoint office has your case.</h2>
        <p className="muted">
          We opened your intake under <strong>{success.caseId}</strong>. The team can now review the file, activate the portal,
          and continue the mortgage workflow.
        </p>
        <div className="review-grid compact">
          <div className="review-row"><span>Case ID</span><strong>{success.caseId}</strong></div>
          <div className="review-row"><span>Submission ID</span><strong>{success.submissionId}</strong></div>
          <div className="review-row"><span>Source</span><strong>{success.intakeSource}</strong></div>
        </div>
        <div className="inline-actions">
          <button className="button" type="button" onClick={() => {
            setForm(initialState);
            setSuccess(null);
            setStepIndex(0);
          }}>
            Start another intake
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="intake-layout">
      <section className="card intake-shell">
        <div className="intake-header">
          <div>
            <p className="eyebrow">Native intake</p>
            <h2>{currentStep.title}</h2>
            <p className="muted">{currentStep.description}</p>
          </div>
          <div className="progress-chip">
            <strong>{stepIndex + 1}</strong>
            <span>of {steps.length}</span>
          </div>
        </div>

        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="intake-step-list">
          {steps.map((step, index) => (
            <button
              key={step.key}
              type="button"
              className={`step-pill ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
              onClick={() => setStepIndex(index)}
            >
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </button>
          ))}
        </div>

        <div className="intake-body fade-panel">
          {currentStep.key === 'applicant' ? (
            <div className="form-grid cols-2">
              <label className="field field-lg">
                <span>Full name *</span>
                <input value={form.applicant.fullName} onChange={(e) => updateSection('applicant', { fullName: e.target.value })} placeholder="Noa Levi" />
              </label>
              <label className="field field-lg">
                <span>ID number</span>
                <input value={form.applicant.idNumber} onChange={(e) => updateSection('applicant', { idNumber: e.target.value })} placeholder="000000000" />
              </label>
              <label className="field">
                <span>Date of birth</span>
                <input type="date" value={form.applicant.birthDate} onChange={(e) => updateSection('applicant', { birthDate: e.target.value })} />
              </label>
              <label className="field">
                <span>Marital status</span>
                <input value={form.applicant.maritalStatus} onChange={(e) => updateSection('applicant', { maritalStatus: e.target.value })} placeholder="Married / Single / Divorced" />
              </label>
            </div>
          ) : null}

          {currentStep.key === 'coApplicant' ? (
            <div className="grid">
              <label className="choice-card toggle-row">
                <input
                  type="checkbox"
                  checked={form.coApplicant.hasCoApplicant}
                  onChange={(e) => updateSection('coApplicant', { hasCoApplicant: e.target.checked })}
                />
                <div>
                  <strong>Include a co-applicant</strong>
                  <p className="muted">Turn this on if a spouse or second borrower will be part of the mortgage application.</p>
                </div>
              </label>
              {form.coApplicant.hasCoApplicant ? (
                <div className="form-grid cols-2">
                  <label className="field field-lg">
                    <span>Co-applicant full name *</span>
                    <input value={form.coApplicant.fullName} onChange={(e) => updateSection('coApplicant', { fullName: e.target.value })} placeholder="Amit Levi" />
                  </label>
                  <label className="field field-lg">
                    <span>ID number</span>
                    <input value={form.coApplicant.idNumber} onChange={(e) => updateSection('coApplicant', { idNumber: e.target.value })} placeholder="000000000" />
                  </label>
                  <label className="field">
                    <span>Date of birth</span>
                    <input type="date" value={form.coApplicant.birthDate} onChange={(e) => updateSection('coApplicant', { birthDate: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Relationship</span>
                    <input value={form.coApplicant.relationship} onChange={(e) => updateSection('coApplicant', { relationship: e.target.value })} placeholder="Spouse" />
                  </label>
                </div>
              ) : (
                <p className="muted">No second borrower will be attached to this intake.</p>
              )}
            </div>
          ) : null}

          {currentStep.key === 'contact' ? (
            <div className="form-grid cols-2">
              <label className="field field-lg">
                <span>Phone *</span>
                <input value={form.contact.phone} onChange={(e) => updateSection('contact', { phone: e.target.value })} placeholder="+972-50-123-4567" />
              </label>
              <label className="field field-lg">
                <span>Email</span>
                <input value={form.contact.email} onChange={(e) => updateSection('contact', { email: e.target.value })} placeholder="name@example.com" />
              </label>
              <label className="field">
                <span>Preferred language</span>
                <select value={form.contact.preferredLanguage} onChange={(e) => updateSection('contact', { preferredLanguage: e.target.value as 'he' | 'en' })}>
                  <option value="he">Hebrew</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label className="field">
                <span>Preferred channel</span>
                <select value={form.contact.preferredChannel} onChange={(e) => updateSection('contact', { preferredChannel: e.target.value as 'whatsapp' | 'phone' | 'email' })}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone call</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label className="field">
                <span>City</span>
                <input value={form.contact.city} onChange={(e) => updateSection('contact', { city: e.target.value })} placeholder="Jerusalem" />
              </label>
              <label className="field">
                <span>Best time to reach you</span>
                <input value={form.contact.bestTimeToReach} onChange={(e) => updateSection('contact', { bestTimeToReach: e.target.value })} placeholder="Weekdays after 17:00" />
              </label>
            </div>
          ) : null}

          {currentStep.key === 'caseType' ? (
            <div className="choice-grid">
              {caseTypeOptions.map((option) => (
                <label key={option.value} className={`choice-card ${form.caseType === option.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="caseType"
                    checked={form.caseType === option.value}
                    onChange={() => setForm((current) => ({ ...current, caseType: option.value }))}
                  />
                  <div>
                    <strong>{option.label}</strong>
                    <p className="muted">{option.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          ) : null}

          {currentStep.key === 'income' ? (
            <div className="grid">
              <div className="choice-grid compact-choice-grid">
                {borrowerProfileOptions.map((option) => {
                  const selected = form.incomeProfile.borrowerProfiles.includes(option.value);
                  return (
                    <label key={option.value} className={`choice-card ${selected ? 'selected' : ''}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleBorrowerProfile(option.value)} />
                      <div>
                        <strong>{option.label}</strong>
                        <p className="muted">{option.hint}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="form-grid cols-2">
                <label className="field">
                  <span>Estimated monthly net income</span>
                  <input value={form.incomeProfile.monthlyNetIncome} onChange={(e) => updateSection('incomeProfile', { monthlyNetIncome: e.target.value })} placeholder="₪ e.g. 28,000" />
                </label>
                <label className="field">
                  <span>Additional income</span>
                  <input value={form.incomeProfile.additionalIncome} onChange={(e) => updateSection('incomeProfile', { additionalIncome: e.target.value })} placeholder="Rent / benefits / foreign income" />
                </label>
                <label className="field field-span-2">
                  <span>Employment notes</span>
                  <textarea value={form.incomeProfile.employmentNotes} onChange={(e) => updateSection('incomeProfile', { employmentNotes: e.target.value })} placeholder="Anything the advisor should know about salary structure, probation, business income, etc." />
                </label>
              </div>
            </div>
          ) : null}

          {currentStep.key === 'property' ? (
            <div className="form-grid cols-2">
              <label className="field">
                <span>Purchase price</span>
                <input value={form.property.purchasePrice} onChange={(e) => updateSection('property', { purchasePrice: e.target.value })} placeholder={currencyPlaceholder()} />
              </label>
              <label className="field">
                <span>Requested mortgage amount</span>
                <input value={form.property.requestedMortgageAmount} onChange={(e) => updateSection('property', { requestedMortgageAmount: e.target.value })} placeholder={currencyPlaceholder()} />
              </label>
              <label className="field">
                <span>Property city</span>
                <input value={form.property.propertyCity} onChange={(e) => updateSection('property', { propertyCity: e.target.value })} placeholder="Tel Aviv" />
              </label>
              <label className="field">
                <span>Property value estimate</span>
                <input value={form.property.propertyValueEstimate} onChange={(e) => updateSection('property', { propertyValueEstimate: e.target.value })} placeholder={currencyPlaceholder()} />
              </label>
              <label className="field">
                <span>Equity available</span>
                <input value={form.property.equityAvailable} onChange={(e) => updateSection('property', { equityAvailable: e.target.value })} placeholder="₪ e.g. 550,000" />
              </label>
              <label className="field">
                <span>Desired timeline</span>
                <input value={form.property.timeline} onChange={(e) => updateSection('property', { timeline: e.target.value })} placeholder="Need approval in the next 45 days" />
              </label>
            </div>
          ) : null}

          {currentStep.key === 'liabilities' ? (
            <div className="grid">
              <label className="choice-card toggle-row">
                <input
                  type="checkbox"
                  checked={form.liabilities.hasExistingLoans}
                  onChange={(e) => updateSection('liabilities', { hasExistingLoans: e.target.checked })}
                />
                <div>
                  <strong>There are existing loans or monthly debt obligations</strong>
                  <p className="muted">Mark this if there are current loan repayments, credit obligations, or similar fixed monthly liabilities.</p>
                </div>
              </label>
              <div className="form-grid cols-2">
                <label className="field">
                  <span>Monthly loan repayments</span>
                  <input value={form.liabilities.monthlyLoanRepayments} onChange={(e) => updateSection('liabilities', { monthlyLoanRepayments: e.target.value })} placeholder="₪ e.g. 3,400" />
                </label>
                <label className="field field-span-2">
                  <span>Liability notes</span>
                  <textarea value={form.liabilities.liabilityNotes} onChange={(e) => updateSection('liabilities', { liabilityNotes: e.target.value })} placeholder="Short summary of car loans, personal loans, credit lines, etc." />
                </label>
              </div>
            </div>
          ) : null}

          {currentStep.key === 'consent' ? (
            <div className="grid">
              <label className={`choice-card toggle-row ${form.consent.privacyAccepted ? 'selected' : ''}`}>
                <input type="checkbox" checked={form.consent.privacyAccepted} onChange={(e) => updateSection('consent', { privacyAccepted: e.target.checked })} />
                <div>
                  <strong>I agree to share the submitted information for mortgage intake and case handling.</strong>
                  <p className="muted">Required so the office can open and process the case.</p>
                </div>
              </label>
              <label className={`choice-card toggle-row ${form.consent.advisorAuthorizationAccepted ? 'selected' : ''}`}>
                <input type="checkbox" checked={form.consent.advisorAuthorizationAccepted} onChange={(e) => updateSection('consent', { advisorAuthorizationAccepted: e.target.checked })} />
                <div>
                  <strong>I authorize the advisor office to review the case and continue follow-up.</strong>
                  <p className="muted">This covers initial review, document requests, and workflow activation.</p>
                </div>
              </label>
              <label className={`choice-card toggle-row ${form.consent.accuracyConfirmed ? 'selected' : ''}`}>
                <input type="checkbox" checked={form.consent.accuracyConfirmed} onChange={(e) => updateSection('consent', { accuracyConfirmed: e.target.checked })} />
                <div>
                  <strong>I confirm the information is accurate to the best of my knowledge.</strong>
                  <p className="muted">You can always update details later with the office.</p>
                </div>
              </label>
              <label className="field field-span-2">
                <span>Anything else the advisor should know?</span>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Optional context: urgency, special structure, previous declines, guarantors, etc." />
              </label>
            </div>
          ) : null}

          {currentStep.key === 'review' ? (
            <div className="grid">
              <div className="review-grid">
                {reviewItems.map((item) => (
                  <div key={item.label} className="review-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="card nested-card">
                <p className="eyebrow">Ready to submit</p>
                <p className="muted">
                  Submission creates a live KeyPoint case directly through the app's own intake flow, with no external form dependency.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="intake-actions">
          <button className="button button-secondary" type="button" onClick={previousStep} disabled={stepIndex === 0 || submitting}>
            Back
          </button>
          {stepIndex < steps.length - 1 ? (
            <button className="button" type="button" onClick={nextStep} disabled={submitting}>
              Continue
            </button>
          ) : (
            <button className="button" type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit intake'}
            </button>
          )}
        </div>
      </section>

      <aside className="grid intake-aside">
        <section className="card">
          <p className="eyebrow">What happens next</p>
          <ul className="list">
            <li>We create a live case in KeyPoint.</li>
            <li>The office reviews your intake and opens the workflow.</li>
            <li>You receive follow-up for portal activation and documents.</li>
          </ul>
        </section>
        <section className="card">
          <p className="eyebrow">UX improvements included</p>
          <ul className="list">
            <li>Step progress with fluent navigation</li>
            <li>Focused review step before submit</li>
            <li>Clean success state with case reference</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
