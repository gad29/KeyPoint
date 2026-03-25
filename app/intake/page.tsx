import { IntakeForm } from '@/components/forms/intake-form';
import { IntakeHero } from '@/components/intake-hero';

export default function IntakePage() {
  return (
    <div className="grid">
      <IntakeHero />
      <IntakeForm />
    </div>
  );
}
