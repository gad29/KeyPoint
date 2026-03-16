import { StatCard } from '@/components/layout';
import { documentLibrary, sampleCases, sampleOffers } from '@/data/domain';

export default function HomePage() {
  const activeCases = sampleCases.length.toString();
  const reviewQueue = sampleCases.filter((item) => item.stage === 'secretary-review' || item.stage === 'documents-in-progress').length.toString();
  const receivedOffers = sampleOffers.filter((item) => item.status === 'received').length.toString();

  return (
    <div className="grid">
      <section className="hero">
        <div>
          <p className="eyebrow">Build status</p>
          <h2>Initial application scaffold is now in place.</h2>
          <p className="muted">
            This first pass gives the project a concrete Next.js structure, sample product screens, domain model,
            Airtable schema draft, and n8n workflow plan.
          </p>
        </div>
        <span className="badge good">Phase 1 scaffold live in workspace</span>
      </section>

      <div className="grid cols-3">
        <StatCard label="Active sample cases" value={activeCases} hint="Representative office-side records for the MVP." />
        <StatCard label="Review queue" value={reviewQueue} hint="Documents and review-oriented stages needing staff action." />
        <StatCard label="Received bank offers" value={receivedOffers} hint="Approval-in-principle comparisons ready for advisor review." />
      </div>

      <div className="grid cols-2">
        <section className="card">
          <p className="eyebrow">What exists now</p>
          <ul className="list">
            <li>Client portal route with progress, document checklist, and milestone view</li>
            <li>Office dashboard route with case queue and bank comparison frame</li>
            <li>Domain types for cases, borrower profiles, documents, and offer tracking</li>
            <li>Draft Airtable base design and workflow automation notes</li>
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
