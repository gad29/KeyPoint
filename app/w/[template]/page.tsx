import { notFound } from 'next/navigation';
import { IntakeHero } from '@/components/intake-hero';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { getBranding, resolveTemplate } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

export default async function TemplateOnboardingPage({ params }: { params: Promise<{ template: string }> }) {
  const { template: slug } = await params;
  const [template, branding] = await Promise.all([resolveTemplate(slug), getBranding()]);
  if (!template || !template.active) notFound();

  return (
    <div className="intake-flow-wide grid" style={{ gap: 20 }}>
      <IntakeHero />
      <OnboardingWizard template={template} businessName={branding.name} businessNameHe={branding.nameHe} />
    </div>
  );
}
