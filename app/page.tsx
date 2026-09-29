import { HomePageClient } from '@/components/home-page';
import { getActivePreset } from '@/lib/presets';
import { env } from '@/lib/env';

export default function HomePage() {
  const preset = getActivePreset();
  return (
    <HomePageClient
      presetName={preset.name}
      presetNameHe={preset.nameHe}
      presetTagline={preset.tagline}
      presetTaglineHe={preset.taglineHe}
      businessName={env.businessName}
      businessNameHe={env.businessNameHe}
    />
  );
}
