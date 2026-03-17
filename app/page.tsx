import { StatCard } from '@/components/layout';
import { documentLibrary, sampleOffers } from '@/data/domain';
import { listCases } from '@/lib/repository';
import { hasAirtableConfig } from '@/lib/env';

export default async function HomePage() {
  const cases = await listCases();
  const activeCases = cases.length.toString();
  const reviewQueue = cases.filter((item) => item.stage === 'secretary-review' || item.stage === 'documents-in-progress').length.toString();
  const receivedOffers = sampleOffers.filter((item) => item.status === 'received').length.toString();

  return (
    <div className="grid">
      <section className="hero">
        <div>
          <p className="eyebrow">Build status</p>
          <h2>{hasAirtableConfig() ? 'Live Airtable-backed case listing is enabled.' : 'KeyPoint is ready for live credentials.'}</h2>
          <p className="muted">
            The app now supports a single settings-driven config flow, Airtable-backed case loading, signed portal invites,
            and n8n-triggered upload events with local fallback for development.
          </p>
        </div>
        <span className={`badge ${hasAirtableConfig() ? 'good' : 'warn'}`}>
          {hasAirtableConfig() ? 'Live data mode available' : 'Awaiting live provider credentials'}
        </span>
      </section>

      <div className="grid cols-3">
        <StatCard label="Cases loaded" value={activeCases} hint="Airtable-backed when configured, local sample fallback otherwise." />
        <StatCard label="Review queue" value={reviewQueue} hint="Document and review-oriented stages needing staff action." />
        <StatCard label="Received bank offers" value={receivedOffers} hint="Seeded comparison block ready for real bank integration." />
      </div>

      <div className="grid cols-2">
        <section className="card">
          <p className="eyebrow">Ready now</p>
          <ul className="list">
            <li>Single settings file generator for app + n8n env output</li>
            <li>Airtable-backed case loading through the repository layer</li>
            <li>Signed portal invite links that do not depend on local invite files</li>
            <li>Document upload event forwarding into n8n for downstream automation</li>
          </ul>
        </section>
        <section className="card">
          <p className="eyebrow">Master document library</p>
          <p className="muted">Current draft includes {documentLibrary.length} seeded document types with case/profile relevance hooks.</p>
          <ul className="list">
            {documentLibrary.slice(0, 6).map((item) => (
              <li key={item.code} className="split">
                <span>{item.labelEn}</span>
                <span className="muted">{item.labelHe}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
