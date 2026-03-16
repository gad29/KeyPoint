import { sampleCases, sampleOffers } from '@/data/domain';
import { InviteGenerator } from '@/components/forms/invite-generator';

export default function OfficePage() {
  return (
    <div className="grid">
      <section className="hero">
        <div>
          <p className="eyebrow">Office dashboard</p>
          <h2>Secretary and advisor operations</h2>
          <p className="muted">Case queue, document review, appraiser routing, and approval-in-principle comparison.</p>
        </div>
        <span className="badge warn">Mock data only - ready for Airtable wiring</span>
      </section>

      <div className="grid cols-2">
        <section className="card">
          <p className="eyebrow">Case queue</p>
          <table className="table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Stage</th>
                <th>Missing</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {sampleCases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.leadName}</strong>
                    <div className="muted">{item.id} · {item.assignedTo}</div>
                  </td>
                  <td>{item.stage}</td>
                  <td>{item.missingItems}</td>
                  <td className="muted">{item.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid">
          <InviteGenerator caseId={sampleCases[0].id} />
          <section className="card">
          <p className="eyebrow">Bank comparison</p>
          <table className="table">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Status</th>
                <th>First payment</th>
                <th>Max payment</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {sampleOffers.map((offer) => (
                <tr key={offer.bank}>
                  <td><strong>{offer.bank}</strong></td>
                  <td>{offer.status}</td>
                  <td>{offer.firstPayment ?? '-'}</td>
                  <td>{offer.maxPayment ?? '-'}</td>
                  <td>{offer.expiresAt ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </section>
        </div>
      </div>
    </div>
  );
}
