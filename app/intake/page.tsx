import { IntakeForm } from '@/components/forms/intake-form';
import { GenericIntakeForm } from '@/components/forms/generic-intake-form';
import { IntakeHero } from '@/components/intake-hero';
import { getActivePreset } from '@/lib/presets';

export default function IntakePage() {
  const preset = getActivePreset();

  return (
    <div className="intake-flow-wide grid" style={{ gap: 20 }}>
      <IntakeHero />
      {preset.id === 'mortgage-advisor' ? <IntakeForm /> : <GenericIntakeForm preset={preset} />}
    </div>
  );
}
