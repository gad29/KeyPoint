import { IntakeForm } from '@/components/forms/intake-form';
import { IntakeHero } from '@/components/intake-hero';

export default function IntakePage() {
  return (
    <div className="intake-flow-wide grid" style={{ gap: 20 }}>
      <IntakeHero />
      <IntakeForm />
    </div>
  );
}
