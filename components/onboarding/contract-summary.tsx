'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Summary = { id: string; title: string; signerName: string; signedAt: string; contentHash: string };

export function ContractSummary({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<Summary[] | null>(null);

  useEffect(() => {
    fetch(`/api/cases/${caseId}/contract`)
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: Summary[] }) => setItems(json.ok && json.data ? json.data : []))
      .catch(() => setItems([]));
  }, [caseId]);

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>הסכם וחתימה</p>
      {items === null ? (
        <p className="muted">טוען…</p>
      ) : items.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>לא נחתם הסכם בתיק הזה.</p>
      ) : (
        <div className="review-grid">
          {items.map((item) => (
            <div key={item.id} className="review-row">
              <span>
                ✓ {item.title} · {item.signerName} · {new Date(item.signedAt).toLocaleString('he-IL')}
              </span>
              <Link href={`/office/case/${caseId}/contract` as never} className="mini-link">
                צפייה והדפסה
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
