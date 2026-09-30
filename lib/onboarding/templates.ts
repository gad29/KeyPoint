import crypto from 'node:crypto';
import { defaultPreset } from '@/lib/presets/default';
import type { Preset, WizardField, WizardFieldKind, WizardStep } from '@/lib/presets/types';
import type { OnboardingTemplate, TemplateContract, TemplateDocument } from '@/lib/onboarding/types';

export { renderContract, type ContractContext } from '@/lib/onboarding/render';

export const DEFAULT_TEMPLATE_SLUG = 'default';

/** Every template must collect these so a case can be created and the client reached. */
export const CONTACT_FIELD_KEYS = ['fullName', 'phone', 'email'] as const;

const FIELD_KINDS: WizardFieldKind[] = ['text', 'textarea', 'email', 'tel', 'date', 'select', 'multiselect', 'checkbox', 'number'];
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const FIELD_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/;
const DOC_CODE_RE = /^[a-z0-9][a-z0-9-]{0,48}$/;

function allFieldKeys(steps: WizardStep[]) {
  return new Set(steps.flatMap((step) => step.fields.map((field) => field.key)));
}

export function builtInTemplate(preset: Preset): OnboardingTemplate {
  const keys = allFieldKeys(preset.wizardSteps);
  const hasContactFields = keys.has('fullName') && keys.has('phone');
  return {
    slug: DEFAULT_TEMPLATE_SLUG,
    name: 'New client',
    nameHe: 'לקוח חדש',
    description: 'Built-in template from the active preset.',
    steps: hasContactFields ? preset.wizardSteps : defaultPreset.wizardSteps,
    documents: [],
    contract: null,
    active: true,
    builtIn: true,
  };
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function contactFields(): WizardField[] {
  const step = defaultPreset.wizardSteps[0];
  return step.fields.filter((field) => (CONTACT_FIELD_KEYS as readonly string[]).includes(field.key));
}

type SanitizeResult = { ok: true; template: OnboardingTemplate } | { ok: false; error: string };

/** Validates and normalizes a template coming from the admin editor. */
export function sanitizeTemplate(input: unknown): SanitizeResult {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Template must be an object' };
  const raw = input as Record<string, unknown>;

  const slug = str(raw.slug, 50).toLowerCase();
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'Slug must be 2-49 lowercase letters, digits or dashes' };
  const name = str(raw.name, 80);
  if (!name) return { ok: false, error: 'Name is required' };

  const rawSteps = Array.isArray(raw.steps) ? raw.steps.slice(0, 10) : [];
  const seenKeys = new Set<string>();
  const steps: WizardStep[] = [];

  for (const [stepIndex, rawStep] of rawSteps.entries()) {
    if (typeof rawStep !== 'object' || rawStep === null) continue;
    const s = rawStep as Record<string, unknown>;
    const fields: WizardField[] = [];
    for (const rawField of (Array.isArray(s.fields) ? s.fields : []).slice(0, 25)) {
      if (typeof rawField !== 'object' || rawField === null) continue;
      const f = rawField as Record<string, unknown>;
      const key = str(f.key, 41);
      const kind = f.kind as WizardFieldKind;
      if (!FIELD_KEY_RE.test(key)) return { ok: false, error: `Invalid field key "${key}"` };
      if (seenKeys.has(key)) return { ok: false, error: `Field key "${key}" is used twice` };
      if (!FIELD_KINDS.includes(kind)) return { ok: false, error: `Invalid field type for "${key}"` };
      seenKeys.add(key);

      const field: WizardField = {
        key,
        kind,
        labelEn: str(f.labelEn, 200) || str(f.labelHe, 200) || key,
        labelHe: str(f.labelHe, 200) || str(f.labelEn, 200) || key,
        required: f.required === true,
      };
      const placeholderEn = str(f.placeholderEn, 200);
      const placeholderHe = str(f.placeholderHe, 200);
      if (placeholderEn) field.placeholderEn = placeholderEn;
      if (placeholderHe) field.placeholderHe = placeholderHe;
      if (kind === 'select' || kind === 'multiselect') {
        const options = (Array.isArray(f.options) ? f.options : [])
          .slice(0, 30)
          .map((o) => (typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : {}))
          .map((o) => ({ value: str(o.value, 60), labelEn: str(o.labelEn, 120), labelHe: str(o.labelHe, 120) }))
          .filter((o) => o.value)
          .map((o) => ({ value: o.value, labelEn: o.labelEn || o.value, labelHe: o.labelHe || o.labelEn || o.value }));
        if (!options.length) return { ok: false, error: `"${field.labelEn}" needs at least one option` };
        field.options = options;
      }
      fields.push(field);
    }

    steps.push({
      key: str(s.key, 40).replace(/[^a-zA-Z0-9_-]/g, '') || `step-${stepIndex + 1}`,
      labelEn: str(s.labelEn, 60) || str(s.titleEn, 60) || `Step ${stepIndex + 1}`,
      labelHe: str(s.labelHe, 60) || str(s.titleHe, 60) || `שלב ${stepIndex + 1}`,
      titleEn: str(s.titleEn, 120) || str(s.labelEn, 120) || `Step ${stepIndex + 1}`,
      titleHe: str(s.titleHe, 120) || str(s.labelHe, 120) || `שלב ${stepIndex + 1}`,
      descriptionEn: str(s.descriptionEn, 300) || undefined,
      descriptionHe: str(s.descriptionHe, 300) || undefined,
      fields,
    });
  }

  const missingContact = contactFields().filter((field) => !seenKeys.has(field.key));
  if (missingContact.length) {
    if (!steps.length) {
      steps.push({ key: 'contact', labelEn: 'Contact', labelHe: 'יצירת קשר', titleEn: 'Your details', titleHe: 'הפרטים שלך', fields: [] });
    }
    steps[0] = { ...steps[0], fields: [...missingContact, ...steps[0].fields] };
  }

  const seenCodes = new Set<string>();
  const documents: TemplateDocument[] = [];
  for (const rawDoc of (Array.isArray(raw.documents) ? raw.documents : []).slice(0, 30)) {
    if (typeof rawDoc !== 'object' || rawDoc === null) continue;
    const d = rawDoc as Record<string, unknown>;
    const labelEn = str(d.labelEn, 120);
    const labelHe = str(d.labelHe, 120);
    if (!labelEn && !labelHe) continue;
    const code = (str(d.code, 49).toLowerCase() || slugify(labelEn) || `doc-${documents.length + 1}`).slice(0, 49);
    if (!DOC_CODE_RE.test(code)) return { ok: false, error: `Invalid document code "${code}"` };
    if (seenCodes.has(code)) return { ok: false, error: `Document code "${code}" is used twice` };
    seenCodes.add(code);
    documents.push({ code, labelEn: labelEn || labelHe, labelHe: labelHe || labelEn, required: d.required === true });
  }

  let contract: TemplateContract | null = null;
  if (typeof raw.contract === 'object' && raw.contract !== null) {
    const c = raw.contract as Record<string, unknown>;
    const bodyEn = str(c.bodyEn, 20000);
    const bodyHe = str(c.bodyHe, 20000);
    if (bodyEn || bodyHe) {
      contract = {
        titleEn: str(c.titleEn, 150) || 'Service agreement',
        titleHe: str(c.titleHe, 150) || 'הסכם שירות',
        bodyEn: bodyEn || bodyHe,
        bodyHe: bodyHe || bodyEn,
      };
    }
  }

  return {
    ok: true,
    template: {
      slug,
      name,
      nameHe: str(raw.nameHe, 80) || name,
      description: str(raw.description, 300) || undefined,
      steps,
      documents,
      contract,
      active: raw.active !== false,
    },
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 49);
}

export function hashContract(title: string, body: string) {
  return crypto.createHash('sha256').update(`${title}\n\n${body}`, 'utf8').digest('hex');
}

/** Returns the first missing required field, or null. Checkbox fields must be exactly true. */
export function findMissingRequired(template: OnboardingTemplate, answers: Record<string, unknown>): WizardField | null {
  for (const step of template.steps) {
    for (const field of step.fields) {
      if (!field.required) continue;
      const value = answers[field.key];
      if (field.kind === 'checkbox' ? value !== true : field.kind === 'multiselect' ? !Array.isArray(value) || !value.length : typeof value !== 'string' || !value.trim()) {
        return field;
      }
    }
  }
  return null;
}

/** Keeps only answers for fields that exist in the template, with type-appropriate values. */
export function pickTemplateAnswers(template: OnboardingTemplate, answers: Record<string, unknown>) {
  const picked: Record<string, string | boolean | string[]> = {};
  for (const step of template.steps) {
    for (const field of step.fields) {
      const value = answers[field.key];
      if (field.kind === 'checkbox') picked[field.key] = value === true;
      else if (field.kind === 'multiselect') picked[field.key] = Array.isArray(value) ? value.map(String).slice(0, 30) : [];
      else if (typeof value === 'string') picked[field.key] = value.trim().slice(0, 5000);
    }
  }
  return picked;
}
