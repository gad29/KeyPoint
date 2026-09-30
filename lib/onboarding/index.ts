import { env } from '@/lib/env';
import { getStore } from '@/lib/data';
import { getActivePreset } from '@/lib/presets';
import { builtInTemplate, DEFAULT_TEMPLATE_SLUG } from '@/lib/onboarding/templates';
import type { AgencyBranding, OnboardingTemplate } from '@/lib/onboarding/types';

export type * from '@/lib/onboarding/types';

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

/** Built-in template plus stored ones. A stored template with slug "default" replaces the built-in one. */
export async function listAvailableTemplates(): Promise<OnboardingTemplate[]> {
  const stored = await getStore().listTemplates();
  const templates = stored.ok && stored.data ? stored.data : [];
  if (templates.some((t) => t.slug === DEFAULT_TEMPLATE_SLUG)) return templates;
  return [builtInTemplate(getActivePreset()), ...templates];
}

export async function resolveTemplate(slug: string | undefined): Promise<OnboardingTemplate | null> {
  const key = (slug || DEFAULT_TEMPLATE_SLUG).toLowerCase();
  const stored = await getStore().getTemplate(key);
  if (stored.ok && stored.data) return stored.data;
  return key === DEFAULT_TEMPLATE_SLUG ? builtInTemplate(getActivePreset()) : null;
}

export function isValidBrandColor(value: string) {
  return HEX_COLOR_RE.test(value);
}

/** Stored branding (Postgres/demo) layered over env defaults. Never throws. */
export async function getBranding(): Promise<AgencyBranding> {
  let stored: Partial<AgencyBranding> = {};
  try {
    const result = await getStore().getBranding();
    if (result.ok && result.data) stored = result.data;
  } catch {
    // Branding is cosmetic; a database hiccup must not take the site down.
  }
  const color = stored.primaryColor || env.brandColor;
  return {
    name: stored.name || env.businessName || 'Agency OS',
    nameHe: stored.nameHe || env.businessNameHe || stored.name || env.businessName || 'Agency OS',
    logoUrl: stored.logoUrl || env.businessLogoUrl || '',
    primaryColor: color && isValidBrandColor(color) ? color : '',
  };
}

/** code → { en, he } labels from every template plus the preset's document library. */
export async function getDocumentLabels(): Promise<Record<string, { en: string; he: string }>> {
  const labels: Record<string, { en: string; he: string }> = {};
  for (const doc of getActivePreset().documentLibrary ?? []) labels[doc.code] = { en: doc.labelEn, he: doc.labelHe };
  for (const template of await listAvailableTemplates()) {
    for (const doc of template.documents) labels[doc.code] = { en: doc.labelEn, he: doc.labelHe };
  }
  return labels;
}
