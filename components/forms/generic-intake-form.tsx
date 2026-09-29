'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n';
import type { Preset, WizardField, WizardStep } from '@/lib/presets';

type Lang = 'en' | 'he';

type FieldValue = string | boolean | string[];
type FormState = Record<string, FieldValue>;

interface Props {
  preset: Preset;
}

function defaultValue(field: WizardField): FieldValue {
  if (field.kind === 'checkbox') return false;
  if (field.kind === 'multiselect') return [];
  return '';
}

function initialState(preset: Preset): FormState {
  const state: FormState = {};
  for (const step of preset.wizardSteps) {
    for (const field of step.fields) {
      state[field.key] = defaultValue(field);
    }
  }
  return state;
}

function fieldLabel(field: WizardField, lang: Lang) {
  return lang === 'he' ? field.labelHe : field.labelEn;
}

function stepLabel(step: WizardStep, lang: Lang) {
  return lang === 'he' ? step.labelHe : step.labelEn;
}

function stepTitle(step: WizardStep, lang: Lang) {
  return lang === 'he' ? step.titleHe : step.titleEn;
}

function stepDescription(step: WizardStep, lang: Lang) {
  const raw = lang === 'he' ? step.descriptionHe : step.descriptionEn;
  return raw || '';
}

function fieldPlaceholder(field: WizardField, lang: Lang) {
  return lang === 'he' ? field.placeholderHe : field.placeholderEn;
}

function fieldHint(field: WizardField, lang: Lang) {
  return lang === 'he' ? field.hintHe : field.hintEn;
}

function optionLabel(option: NonNullable<WizardField['options']>[number], lang: Lang) {
  return lang === 'he' ? option.labelHe : option.labelEn;
}

const copy = {
  en: {
    step: 'Step',
    of: 'of',
    next: 'Next',
    back: 'Back',
    submit: 'Submit',
    submitting: 'Submitting…',
    successTitle: 'Your details were received',
    successBody: 'We will contact you shortly.',
    startAnother: 'Start another',
    missing: (label: string) => `${label} is required.`,
    submitFail: 'Something went wrong. Please try again.',
  },
  he: {
    step: 'שלב',
    of: 'מתוך',
    next: 'הבא',
    back: 'חזרה',
    submit: 'שליחה',
    submitting: 'שולח…',
    successTitle: 'הפרטים התקבלו',
    successBody: 'נחזור אליך בהקדם.',
    startAnother: 'טופס חדש',
    missing: (label: string) => `${label} — שדה חובה.`,
    submitFail: 'משהו השתבש. אפשר לנסות שוב.',
  },
} as const;

export function GenericIntakeForm({ preset }: Props) {
  const { language, dir } = useI18n();
  const lang: Lang = language;
  const t = copy[lang];

  const [state, setState] = useState<FormState>(() => initialState(preset));
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [caseId, setCaseId] = useState<string>('');

  const steps = preset.wizardSteps;
  const currentStep = steps[stepIndex];

  const missingRequired = useMemo(() => {
    if (!currentStep) return [];
    return currentStep.fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = state[field.key];
        if (field.kind === 'checkbox') return value !== true;
        if (field.kind === 'multiselect') return !Array.isArray(value) || value.length === 0;
        return typeof value !== 'string' || value.trim().length === 0;
      });
  }, [currentStep, state]);

  function setField(key: string, value: FieldValue) {
    setError('');
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function goToStep(next: number) {
    setError('');
    setStepIndex(next);
  }

  function toggleInMultiselect(key: string, value: string) {
    setError('');
    setState((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const exists = current.includes(value);
      return { ...prev, [key]: exists ? current.filter((v) => v !== value) : [...current, value] };
    });
  }

  async function submit() {
    if (missingRequired.length) {
      setError(t.missing(fieldLabel(missingRequired[0], lang)));
      return;
    }
    setStatus('submitting');
    setError('');

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'generic-intake', preset: preset.id, answers: state }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { id: string }; error?: string };
      if (!res.ok || !json.ok) {
        setStatus('error');
        setError(json.error || t.submitFail);
        return;
      }
      setCaseId(json.data?.id || '');
      setStatus('success');
    } catch {
      setStatus('error');
      setError(t.submitFail);
    }
  }

  if (status === 'success') {
    return (
      <div className="card" dir={dir} style={{ padding: 24 }}>
        <h2 className="section-title">{t.successTitle}</h2>
        <p className="muted" style={{ marginTop: 8 }}>{t.successBody}</p>
        {caseId ? <p className="muted" style={{ marginTop: 4 }}>#{caseId}</p> : null}
        <button
          type="button"
          className="button button-secondary"
          style={{ marginTop: 16 }}
          onClick={() => {
            setState(initialState(preset));
            setStepIndex(0);
            setStatus('idle');
            setCaseId('');
          }}
        >
          {t.startAnother}
        </button>
      </div>
    );
  }

  if (!currentStep) return null;

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <form
      className="card"
      dir={dir}
      style={{ padding: 24, display: 'grid', gap: 16 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (isLastStep) {
          void submit();
        } else if (!missingRequired.length) {
          goToStep(stepIndex + 1);
        } else {
          setError(t.missing(fieldLabel(missingRequired[0], lang)));
        }
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <p className="muted" style={{ margin: 0 }}>
          {t.step} {stepIndex + 1} {t.of} {steps.length}
        </p>
        <h2 className="section-title" style={{ margin: 0 }}>{stepTitle(currentStep, lang)}</h2>
        {stepDescription(currentStep, lang) ? (
          <p className="muted" style={{ margin: 0 }}>{stepDescription(currentStep, lang)}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {steps.map((step, i) => (
            <span
              key={step.key}
              aria-label={stepLabel(step, lang)}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= stepIndex ? 'var(--accent, #b08a2f)' : 'rgba(0,0,0,0.1)',
              }}
            />
          ))}
        </div>
      </header>

      <div style={{ display: 'grid', gap: 12 }}>
        {currentStep.fields.map((field) => {
          const value = state[field.key];
          const label = fieldLabel(field, lang) + (field.required ? ' *' : '');
          const hint = fieldHint(field, lang);
          const placeholder = fieldPlaceholder(field, lang);

          if (field.kind === 'textarea') {
            return (
              <label key={field.key} style={{ display: 'grid', gap: 4 }}>
                <span>{label}</span>
                <textarea
                  className="input"
                  rows={4}
                  value={typeof value === 'string' ? value : ''}
                  placeholder={placeholder}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
                {hint ? <span className="muted small">{hint}</span> : null}
              </label>
            );
          }

          if (field.kind === 'checkbox') {
            return (
              <label key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => setField(field.key, e.target.checked)}
                />
                <span>{label}</span>
              </label>
            );
          }

          if (field.kind === 'select' && field.options) {
            return (
              <label key={field.key} style={{ display: 'grid', gap: 4 }}>
                <span>{label}</span>
                <select
                  className="input"
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                >
                  <option value="" disabled></option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{optionLabel(opt, lang)}</option>
                  ))}
                </select>
                {hint ? <span className="muted small">{hint}</span> : null}
              </label>
            );
          }

          if (field.kind === 'multiselect' && field.options) {
            const selected = Array.isArray(value) ? value : [];
            return (
              <fieldset key={field.key} style={{ display: 'grid', gap: 6, border: 0, padding: 0, margin: 0 }}>
                <legend>{label}</legend>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {field.options.map((opt) => {
                    const active = selected.includes(opt.value);
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        className={active ? 'chip chip-active' : 'chip'}
                        onClick={() => toggleInMultiselect(field.key, opt.value)}
                      >
                        {optionLabel(opt, lang)}
                      </button>
                    );
                  })}
                </div>
                {hint ? <span className="muted small">{hint}</span> : null}
              </fieldset>
            );
          }

          const inputType =
            field.kind === 'email' ? 'email' :
            field.kind === 'tel' ? 'tel' :
            field.kind === 'date' ? 'date' :
            field.kind === 'number' ? 'number' :
            'text';

          return (
            <label key={field.key} style={{ display: 'grid', gap: 4 }}>
              <span>{label}</span>
              <input
                className="input"
                type={inputType}
                value={typeof value === 'string' ? value : ''}
                placeholder={placeholder}
                onChange={(e) => setField(field.key, e.target.value)}
              />
              {hint ? <span className="muted small">{hint}</span> : null}
            </label>
          );
        })}
      </div>

      {error ? <p className="alert alert-error">{error}</p> : null}

      <footer style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => goToStep(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0 || status === 'submitting'}
        >
          {t.back}
        </button>
        <button
          type="submit"
          className="button"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? t.submitting : isLastStep ? t.submit : t.next}
        </button>
      </footer>
    </form>
  );
}
