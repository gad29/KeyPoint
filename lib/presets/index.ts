import { defaultPreset } from '@/lib/presets/default';
import { mortgageAdvisorPreset } from '@/lib/presets/mortgage-advisor';
import type { Preset, PresetId } from '@/lib/presets/types';

export type { Preset, PresetId, PresetFeatures, WizardField, WizardStep, WizardFieldKind } from '@/lib/presets/types';

const registry: Record<PresetId, Preset> = {
  default: defaultPreset,
  'mortgage-advisor': mortgageAdvisorPreset,
};

export const availablePresets: Preset[] = Object.values(registry);

function readPresetIdFromEnv(): PresetId {
  const raw = (process.env.AGENCY_OS_PRESET || 'default').trim().toLowerCase();
  if (raw === 'mortgage-advisor' || raw === 'mortgage') return 'mortgage-advisor';
  return 'default';
}

export function getPreset(id?: PresetId): Preset {
  const key: PresetId = id ?? readPresetIdFromEnv();
  return registry[key] ?? registry.default;
}

export function getActivePreset(): Preset {
  return getPreset(readPresetIdFromEnv());
}

export function hasFeature(feature: keyof Preset['features']): boolean {
  return getActivePreset().features[feature];
}
