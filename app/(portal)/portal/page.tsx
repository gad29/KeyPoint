import { listCases, getCaseChecklist } from '@/lib/repository';

const portalStages = [
  'Intake submitted',
  'Portal activated',
  'Documents in progress',
  'Secretary review',
  'Waiting for appraiser',
  'Ready for bank work',
];

export default async function PortalPage() {
  const cases = await listCases();
  const caseRecord = cases[0];

  if (!caseRecord) {
    return (
      <section className="card">
        <p className="eyebrow">Client portal</p>
        <h2>No case available</h2>
        <p className="muted">Add a sample case or connect Airtable to render the portal view.</p>
      </section>
    );
  }

  const requiredDocuments = (await getCaseChecklist(caseRecord.id)).filter((doc) => doc.required);

  return (
    <div className="grid cols-2">
      <section className="card">
        <p className="eyebrow">Client portal</p>
        <h2>{caseRecord.leadName}</h2>
        <p className="muted">Case {caseRecord.id} · Hebrew/English portal · WhatsApp-first notification model</p>
        <div className="timeline" style={{ marginTop: 18 }}>
          {portalStages.map((step, index) => (
            <div key={step} className="step">
              <strong>{index + 1}. {step}</strong>
              <p className="muted">Status-aware messaging and document prompts can be attached here.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Required documents for this case</p>
        <table className="table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Logic</th>
            </tr>
          </thead>
          <tbody>
            {requiredDocuments.map((doc) => (
              <tr key={doc.code}>
                <td>
                  <strong>{doc.labelEn}</strong>
                  <div className="muted">{doc.labelHe}</div>
                </td>
                <td className="muted">{doc.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
