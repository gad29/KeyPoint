import { IntakeForm } from '@/components/forms/intake-form';
import { hasAirtableConfig } from '@/lib/env';

export default function IntakePage() {
  return (
    <div className="grid">
      <section className="hero hero-soft">
        <div>
          <p className="eyebrow">Public intake</p>
          <h2>Start a mortgage case directly in KeyPoint</h2>
          <p className="muted">
            A modern native intake flow for Israel mortgage advisory work — step-by-step, production-minded, and ready to create live cases.
          </p>
        </div>
        <span className={`badge ${hasAirtableConfig() ? 'good' : 'warn'}`}>
          {hasAirtableConfig() ? 'Live intake mode' : 'UI ready · Airtable required for live creation'}
        </span>
      </section>

      <IntakeForm />
    </div>
  );
}
