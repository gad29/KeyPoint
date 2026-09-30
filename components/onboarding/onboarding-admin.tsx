'use client';

import { useEffect, useState } from 'react';
import type { AgencyBranding, OnboardingTemplate, TemplateDocument } from '@/lib/onboarding/types';
import type { WizardField, WizardFieldKind, WizardStep } from '@/lib/presets/types';
import { SAMPLE_CONTRACT } from '@/lib/onboarding/sample-contract';

type EditorField = WizardField & { optionsText?: string };
type EditorStep = Omit<WizardStep, 'fields'> & { fields: EditorField[] };
type Draft = Omit<OnboardingTemplate, 'steps'> & { steps: EditorStep[] };

const LOCKED_KEYS = new Set(['fullName', 'phone', 'email']);

const KIND_LABELS: Record<WizardFieldKind, string> = {
  text: 'טקסט קצר',
  textarea: 'טקסט ארוך',
  email: 'אימייל',
  tel: 'טלפון',
  number: 'מספר',
  date: 'תאריך',
  select: 'בחירה מרשימה',
  multiselect: 'בחירה מרובה',
  checkbox: 'תיבת סימון (אישור)',
};

const rid = () => Math.random().toString(36).slice(2, 8);

function toDraft(template: OnboardingTemplate): Draft {
  return {
    ...template,
    steps: template.steps.map((step) => ({
      ...step,
      fields: step.fields.map((field) => ({
        ...field,
        optionsText: field.options?.map((o) => (o.labelEn && o.labelEn !== o.labelHe ? `${o.labelHe} / ${o.labelEn}` : o.labelHe)).join('\n'),
      })),
    })),
  };
}

function fromDraft(draft: Draft): OnboardingTemplate {
  return {
    ...draft,
    steps: draft.steps.map((step) => ({
      ...step,
      titleHe: step.titleHe || step.labelHe,
      titleEn: step.titleEn || step.labelEn,
      fields: step.fields.map(({ optionsText, ...field }) => {
        if (field.kind !== 'select' && field.kind !== 'multiselect') return { ...field, options: undefined };
        const options = (optionsText ?? '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [he, en] = line.split(' / ').map((p) => p.trim());
            return { value: he, labelHe: he, labelEn: en || he };
          });
        return { ...field, options };
      }),
    })),
  };
}

function blankTemplate(): Draft {
  return {
    slug: `client-${rid().slice(0, 4)}`,
    name: 'New client',
    nameHe: 'לקוח חדש',
    description: '',
    active: true,
    contract: null,
    documents: [],
    steps: [
      {
        key: 'contact',
        labelHe: 'פרטים',
        labelEn: 'Details',
        titleHe: 'הפרטים שלך',
        titleEn: 'Your details',
        fields: [
          { key: 'fullName', kind: 'text', labelHe: 'שם מלא', labelEn: 'Full name', required: true },
          { key: 'phone', kind: 'tel', labelHe: 'טלפון', labelEn: 'Phone', required: true },
          { key: 'email', kind: 'email', labelHe: 'אימייל', labelEn: 'Email', required: false },
        ],
      },
    ],
  };
}

interface Props {
  initialTemplates: OnboardingTemplate[];
  initialBranding: AgencyBranding;
  canSave: boolean;
}

export function OnboardingAdmin({ initialTemplates, initialBranding, canSave }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Origin is only known in the browser; reading it during render would bake the server value into the HTML.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const linkFor = (slug: string) => `${origin}/w/${slug}`;

  function update(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }
  function updateStep(index: number, patch: Partial<EditorStep>) {
    setDraft((d) => (d ? { ...d, steps: d.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : d));
  }
  function updateField(stepIndex: number, fieldIndex: number, patch: Partial<EditorField>) {
    setDraft((d) => {
      if (!d) return d;
      const steps = d.steps.map((s, i) =>
        i === stepIndex ? { ...s, fields: s.fields.map((f, j) => (j === fieldIndex ? { ...f, ...patch } : f)) } : s,
      );
      return { ...d, steps };
    });
  }
  function moveItem<T>(list: T[], from: number, to: number) {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fromDraft(draft)),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: OnboardingTemplate };
      if (!json.ok || !json.data) throw new Error(json.error || 'השמירה נכשלה');
      const saved = json.data;
      setTemplates((list) => {
        const without = list.filter((t) => t.slug !== saved.slug);
        return [...without, saved].sort((a, b) => (a.slug === 'default' ? -1 : b.slug === 'default' ? 1 : 0));
      });
      setDraft(toDraft(saved));
      setIsNew(false);
      setNotice('התבנית נשמרה ✓');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  async function remove(slug: string) {
    if (!confirm('למחוק את התבנית? לקוחות קיימים לא יושפעו.')) return;
    const res = await fetch(`/api/admin/templates/${slug}`, { method: 'DELETE' });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) return setError(json.error || 'המחיקה נכשלה');
    setTemplates((list) => list.filter((t) => t.slug !== slug));
    if (draft?.slug === slug) setDraft(null);
    setNotice('התבנית נמחקה');
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(linkFor(slug));
      setNotice('הקישור הועתק');
    } catch {
      setNotice(linkFor(slug));
    }
  }

  return (
    <div className="grid onboarding-admin" dir="rtl" style={{ gap: 20 }}>
      <div className="hero product-hero" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">קליטת לקוחות</p>
          <h2 style={{ margin: '8px 0 6px' }}>טפסי קליטה והסכמים</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            כל תבנית היא קישור שאפשר לשלוח ללקוח: פרטים, מסמכים וחתימה על הסכם — בלי טניס אימיילים.
          </p>
        </div>
        {canSave ? (
          <button
            type="button"
            className="button button-compact"
            onClick={() => {
              setDraft(blankTemplate());
              setIsNew(true);
              setError('');
              setNotice('');
            }}
          >
            + תבנית חדשה
          </button>
        ) : null}
      </div>

      {!canSave ? (
        <p className="card muted" style={{ margin: 0 }}>
          שמירת תבניות ומיתוג דורשת מסד נתונים (Postgres / Supabase). כרגע פעילה תבנית ברירת המחדל של ה-preset.
        </p>
      ) : null}
      {notice ? <p className="muted small-note">{notice}</p> : null}

      <section className="template-list">
        {templates.map((template) => (
          <article key={template.slug} className={`card template-card ${draft?.slug === template.slug ? 'is-editing' : ''}`}>
            <div className="template-card-head">
              <div>
                <strong>{template.nameHe || template.name}</strong>
                <p className="muted" dir="ltr">/w/{template.slug}</p>
              </div>
              <span className={`badge ${template.active ? 'good' : ''}`}>{template.active ? 'פעיל' : 'כבוי'}</span>
            </div>
            <p className="muted template-card-meta">
              {template.steps.length} שלבים · {template.documents.length} מסמכים · {template.contract ? 'כולל הסכם לחתימה' : 'ללא הסכם'}
              {template.builtIn ? ' · מובנית' : ''}
            </p>
            <div className="inline-actions">
              <button type="button" className="button button-secondary button-compact" onClick={() => copyLink(template.slug)}>
                העתקת קישור
              </button>
              <a
                className="button button-secondary button-compact"
                href={`https://wa.me/?text=${encodeURIComponent(linkFor(template.slug))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ווטסאפ
              </a>
              <a className="button button-secondary button-compact" href={`/w/${template.slug}`} target="_blank" rel="noopener noreferrer">
                תצוגה
              </a>
              {canSave ? (
                <button
                  type="button"
                  className="button button-compact"
                  onClick={() => {
                    setDraft(toDraft(template));
                    setIsNew(template.builtIn === true);
                    setError('');
                    setNotice('');
                  }}
                >
                  עריכה
                </button>
              ) : null}
              {canSave && !template.builtIn ? (
                <button type="button" className="text-button danger" onClick={() => remove(template.slug)}>
                  מחיקה
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {draft ? (
        <section className="card template-editor">
          <div className="template-editor-head">
            <h3>{isNew ? 'תבנית חדשה' : `עריכה: ${draft.nameHe || draft.name}`}</h3>
            <button type="button" className="text-button" onClick={() => setDraft(null)}>
              סגירה
            </button>
          </div>

          <div className="form-grid cols-2">
            <label className="field">
              <span>שם התבנית (עברית)</span>
              <input value={draft.nameHe} onChange={(e) => update({ nameHe: e.target.value })} />
            </label>
            <label className="field">
              <span>שם התבנית (English)</span>
              <input value={draft.name} onChange={(e) => update({ name: e.target.value })} dir="ltr" />
            </label>
            <label className="field">
              <span>כתובת הקישור</span>
              <input
                value={draft.slug}
                onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                disabled={!isNew}
                dir="ltr"
              />
            </label>
            <label className={`choice-card toggle-row ${draft.active ? 'selected' : ''}`}>
              <input type="checkbox" checked={draft.active} onChange={(e) => update({ active: e.target.checked })} />
              <div>
                <strong>התבנית פעילה</strong>
                <p className="muted">כשהיא כבויה, הקישור מציג &quot;לא זמין&quot;.</p>
              </div>
            </label>
          </div>

          <h4 className="editor-section-title">שלבים ושדות</h4>
          {draft.steps.map((step, stepIndex) => (
            <div key={`${step.key}-${stepIndex}`} className="editor-step">
              <div className="editor-step-head">
                <span className="editor-step-num">{stepIndex + 1}</span>
                <input aria-label="שם השלב" value={step.labelHe} onChange={(e) => updateStep(stepIndex, { labelHe: e.target.value, ...(step.titleHe === step.labelHe ? { titleHe: e.target.value } : {}) })} placeholder="שם השלב" />
                <input aria-label="Step name" value={step.labelEn} onChange={(e) => updateStep(stepIndex, { labelEn: e.target.value, ...(step.titleEn === step.labelEn ? { titleEn: e.target.value } : {}) })} placeholder="Step name" dir="ltr" />
                <div className="editor-row-tools">
                  <button type="button" className="icon-button" aria-label="העברה למעלה" onClick={() => update({ steps: moveItem(draft.steps, stepIndex, stepIndex - 1) })}>↑</button>
                  <button type="button" className="icon-button" aria-label="העברה למטה" onClick={() => update({ steps: moveItem(draft.steps, stepIndex, stepIndex + 1) })}>↓</button>
                  {!step.fields.some((f) => LOCKED_KEYS.has(f.key)) ? (
                    <button type="button" className="icon-button danger" aria-label="מחיקת שלב" onClick={() => update({ steps: draft.steps.filter((_, i) => i !== stepIndex) })}>✕</button>
                  ) : null}
                </div>
              </div>

              {step.fields.map((field, fieldIndex) => {
                const locked = LOCKED_KEYS.has(field.key);
                return (
                  <div key={field.key} className="editor-field">
                    <input aria-label="תווית" value={field.labelHe} onChange={(e) => updateField(stepIndex, fieldIndex, { labelHe: e.target.value })} placeholder="תווית בעברית" />
                    <input aria-label="Label" value={field.labelEn} onChange={(e) => updateField(stepIndex, fieldIndex, { labelEn: e.target.value })} placeholder="English label" dir="ltr" />
                    <select
                      aria-label="סוג שדה"
                      value={field.kind}
                      disabled={locked}
                      onChange={(e) => updateField(stepIndex, fieldIndex, { kind: e.target.value as WizardFieldKind })}
                    >
                      {Object.entries(KIND_LABELS).map(([kind, label]) => (
                        <option key={kind} value={kind}>{label}</option>
                      ))}
                    </select>
                    <label className="editor-required">
                      <input type="checkbox" checked={Boolean(field.required)} onChange={(e) => updateField(stepIndex, fieldIndex, { required: e.target.checked })} />
                      חובה
                    </label>
                    <div className="editor-row-tools">
                      {locked ? (
                        <span className="muted editor-locked" title="שדה מערכת: נדרש כדי ליצור קשר עם הלקוח">🔒</span>
                      ) : (
                        <>
                          <button type="button" className="icon-button" aria-label="למעלה" onClick={() => updateStep(stepIndex, { fields: moveItem(step.fields, fieldIndex, fieldIndex - 1) })}>↑</button>
                          <button type="button" className="icon-button" aria-label="למטה" onClick={() => updateStep(stepIndex, { fields: moveItem(step.fields, fieldIndex, fieldIndex + 1) })}>↓</button>
                          <button type="button" className="icon-button danger" aria-label="מחיקת שדה" onClick={() => updateStep(stepIndex, { fields: step.fields.filter((_, j) => j !== fieldIndex) })}>✕</button>
                        </>
                      )}
                    </div>
                    {field.kind === 'select' || field.kind === 'multiselect' ? (
                      <textarea
                        className="editor-options"
                        aria-label="אפשרויות"
                        value={field.optionsText ?? ''}
                        onChange={(e) => updateField(stepIndex, fieldIndex, { optionsText: e.target.value })}
                        placeholder={'אפשרות בכל שורה. לתרגום: עיצוב לוגו / Logo design'}
                        rows={3}
                      />
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                className="text-button"
                onClick={() => updateStep(stepIndex, { fields: [...step.fields, { key: `f_${rid()}`, kind: 'text', labelHe: '', labelEn: '', required: false }] })}
              >
                + הוספת שדה
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button button-secondary button-compact"
            onClick={() =>
              update({
                steps: [...draft.steps, { key: `step-${rid()}`, labelHe: 'שלב חדש', labelEn: 'New step', titleHe: 'שלב חדש', titleEn: 'New step', fields: [] }],
              })
            }
          >
            + הוספת שלב
          </button>

          <h4 className="editor-section-title">מסמכים שהלקוח יעלה</h4>
          <p className="muted editor-hint">הלקוח יוכל להעלות אותם מיד בסוף הטופס ובהמשך דרך הקישור האישי. מסמכי חובה נספרים כ&quot;חסרים&quot; עד שיתקבלו.</p>
          {draft.documents.map((doc, index) => (
            <div key={`${doc.code}-${index}`} className="editor-field editor-doc">
              <input aria-label="שם המסמך" value={doc.labelHe} onChange={(e) => update({ documents: draft.documents.map((d, i) => (i === index ? { ...d, labelHe: e.target.value } : d)) })} placeholder="שם המסמך" />
              <input aria-label="Document name" value={doc.labelEn} onChange={(e) => update({ documents: draft.documents.map((d, i) => (i === index ? { ...d, labelEn: e.target.value } : d)) })} placeholder="Document name" dir="ltr" />
              <label className="editor-required">
                <input type="checkbox" checked={doc.required} onChange={(e) => update({ documents: draft.documents.map((d, i) => (i === index ? { ...d, required: e.target.checked } : d)) })} />
                חובה
              </label>
              <div className="editor-row-tools">
                <button type="button" className="icon-button danger" aria-label="מחיקת מסמך" onClick={() => update({ documents: draft.documents.filter((_, i) => i !== index) })}>✕</button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() => update({ documents: [...draft.documents, { code: `doc-${rid()}`, labelHe: '', labelEn: '', required: true } satisfies TemplateDocument] })}
          >
            + הוספת מסמך
          </button>

          <h4 className="editor-section-title">הסכם לחתימה</h4>
          <label className={`choice-card toggle-row ${draft.contract ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={Boolean(draft.contract)}
              onChange={(e) => update({ contract: e.target.checked ? draft.contract ?? { titleHe: 'הסכם שירות', titleEn: 'Service agreement', bodyHe: '', bodyEn: '' } : null })}
            />
            <div>
              <strong>הלקוח יחתום על הסכם בסוף הטופס</strong>
              <p className="muted">חתימה ביד עם תיעוד: שם, תאריך, כתובת IP וטביעת אצבע דיגיטלית של הנוסח.</p>
            </div>
          </label>
          {draft.contract ? (
            <div className="grid" style={{ gap: 12, marginTop: 12 }}>
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button-secondary button-compact"
                  onClick={() => {
                    if (!draft.contract?.bodyHe || confirm('להחליף את הנוסח הקיים בהסכם לדוגמה?')) update({ contract: { ...SAMPLE_CONTRACT } });
                  }}
                >
                  הכנסת הסכם לדוגמה
                </button>
                <span className="muted editor-hint">
                  משתנים: <code>{'{{client_name}}'}</code> <code>{'{{business_name}}'}</code> <code>{'{{date}}'}</code> <code>{'{{email}}'}</code> <code>{'{{phone}}'}</code>
                </span>
              </div>
              <div className="form-grid cols-2">
                <label className="field">
                  <span>כותרת (עברית)</span>
                  <input value={draft.contract.titleHe} onChange={(e) => update({ contract: { ...draft.contract!, titleHe: e.target.value } })} />
                </label>
                <label className="field">
                  <span>Title (English)</span>
                  <input value={draft.contract.titleEn} onChange={(e) => update({ contract: { ...draft.contract!, titleEn: e.target.value } })} dir="ltr" />
                </label>
                <label className="field field-span-2">
                  <span>נוסח ההסכם (עברית)</span>
                  <textarea rows={10} value={draft.contract.bodyHe} onChange={(e) => update({ contract: { ...draft.contract!, bodyHe: e.target.value } })} />
                </label>
                <label className="field field-span-2">
                  <span>Agreement text (English)</span>
                  <textarea rows={10} value={draft.contract.bodyEn} onChange={(e) => update({ contract: { ...draft.contract!, bodyEn: e.target.value } })} dir="ltr" />
                </label>
              </div>
              <p className="muted editor-hint">ההסכם לדוגמה הוא נקודת פתיחה בלבד ואינו ייעוץ משפטי. מומלץ שעורך דין יעבור על הנוסח.</p>
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          <div className="intake-actions">
            <button type="button" className="button button-secondary" onClick={() => setDraft(null)}>
              ביטול
            </button>
            <button type="button" className="button" onClick={save} disabled={saving}>
              {saving ? 'שומר…' : 'שמירת התבנית'}
            </button>
          </div>
        </section>
      ) : null}

      <BrandingCard initial={initialBranding} canSave={canSave} />
    </div>
  );
}

function BrandingCard({ initial, canSave }: { initial: AgencyBranding; canSave: boolean }) {
  const [branding, setBranding] = useState(initial);
  const [status, setStatus] = useState('');

  async function save() {
    setStatus('שומר…');
    const res = await fetch('/api/admin/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branding),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    setStatus(json.ok ? 'המיתוג נשמר ✓ — רעננו את דף הלקוח כדי לראות' : json.error || 'השמירה נכשלה');
  }

  return (
    <section className="card">
      <p className="eyebrow">מיתוג</p>
      <h3 style={{ margin: '4px 0 12px' }}>איך הלקוחות רואים את העסק</h3>
      <div className="form-grid cols-2">
        <label className="field">
          <span>שם העסק (עברית)</span>
          <input value={branding.nameHe} onChange={(e) => setBranding({ ...branding, nameHe: e.target.value })} disabled={!canSave} />
        </label>
        <label className="field">
          <span>Business name (English)</span>
          <input value={branding.name} onChange={(e) => setBranding({ ...branding, name: e.target.value })} disabled={!canSave} dir="ltr" />
        </label>
        <label className="field">
          <span>כתובת לוגו (https)</span>
          <input value={branding.logoUrl} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} disabled={!canSave} dir="ltr" placeholder="https://…/logo.png" />
        </label>
        <label className="field">
          <span>צבע המותג</span>
          <span className="brand-color-row">
            <input
              type="color"
              value={branding.primaryColor || '#b58536'}
              onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
              disabled={!canSave}
              aria-label="צבע המותג"
            />
            <code dir="ltr">{branding.primaryColor || 'ברירת מחדל'}</code>
            {branding.primaryColor ? (
              <button type="button" className="text-button" onClick={() => setBranding({ ...branding, primaryColor: '' })} disabled={!canSave}>
                איפוס
              </button>
            ) : null}
          </span>
        </label>
      </div>
      {canSave ? (
        <div className="inline-actions" style={{ marginTop: 8 }}>
          <button type="button" className="button button-compact" onClick={save}>
            שמירת מיתוג
          </button>
          {status ? <span className="muted">{status}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
