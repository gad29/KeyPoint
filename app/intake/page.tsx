import { IntakeForm } from '@/components/forms/intake-form';
import { IntakeHero } from '@/components/intake-hero';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { getActivePreset } from '@/lib/presets';
import { getBranding, resolveTemplate } from '@/lib/onboarding';

// Reads preset/business/backend settings from the runtime environment.
export const dynamic = 'force-dynamic';

export default async function IntakePage() {
  const preset = getActivePreset();
  if (preset.id === 'mortgage-advisor') {
    return (
      <div className="intake-flow-wide grid" style={{ gap: 20 }}>
        <IntakeHero />
        <IntakeForm />
      </div>
    );
  }

  const [template, branding] = await Promise.all([resolveTemplate(undefined), getBranding()]);
  return (
    <div className="intake-flow-wide grid" style={{ gap: 20 }}>
      <IntakeHero />
      {template ? <OnboardingWizard template={template} businessName={branding.name} businessNameHe={branding.nameHe} /> : null}
    </div>
  );
}
