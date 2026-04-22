'use client';

import Link from 'next/link';
import type { BankOffer, CaseRecord } from '@/data/domain';
import type { OfficeCaseBucket } from '@/lib/office-buckets';

type OfficePageClientProps = {
  cases: CaseRecord[];
  offersByCase: Record<string, BankOffer[]>;
  liveMode: boolean;
  bucket: OfficeCaseBucket;
};

const STAGE_LABELS: Record<string, string> = {
  'new-lead': 'ליד חדש',
  'intake-submitted': 'טופס הוגש',
  'approved': 'אושר',
  'portal-activated': 'פורטל הופעל',
  'documents-in-progress': 'מסמכים בתהליך',
  'secretary-review': 'בדיקת מזכירה',
  'waiting-appraiser': 'ממתין לשמאי',
  'appraisal-received': 'שמאות התקבלה',
  'ready-for-bank': 'מוכן לבנק',
  'bank-negotiation': 'משא ומתן עם בנק',
  'recommendation-prepared': 'המלצה מוכנה',
  'completed': 'הושלם',
};

const BUCKET_META: Record<OfficeCaseBucket, { title: string; description: string; empty: string }> = {
  active: {
    title: 'תיקים פעילים',
    description: 'תיקים פתוחים ללא מסמכים חסרים.',
    empty: 'אין כרגע תיקים פעילים.',
  },
  stuck: {
    title: 'תיקים תקועים',
    description: 'תיקים עם מסמכים חסרים (מספר חסרים > 0).',
    empty: 'אין תיקים תקועים. כל התיקים הפתוחים מסודרים.',
  },
  completed: {
    title: 'תיקים שהושלמו',
    description: 'תיקים בשלב הושלם.',
    empty: 'עדיין אין תיקים שהושלמו.',
  },
};

export function OfficePageClient({ cases, liveMode, bucket }: OfficePageClientProps) {
  const meta = BUCKET_META[bucket];

  return (
    <div className="grid" dir="rtl" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="hero product-hero" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">משרד</p>
          <h2 style={{ margin: '8px 0 8px' }}>{meta.title}</h2>
          <p className="muted">{meta.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge ${liveMode ? 'good' : 'warn'}`}>
            {liveMode ? 'חיה' : 'תצוגה'}
          </span>
          <Link href="/office" className="button button-secondary button-compact">
            ← לוח בקרה
          </Link>
        </div>
      </div>

      {/* Bucket navigation tabs */}
      <div className="tab-bar" style={{ marginBottom: 0 }}>
        <Link href="/office/active" className={`tab ${bucket === 'active' ? 'active' : ''}`}>
          תיקים פעילים
        </Link>
        <Link href="/office/stuck" className={`tab ${bucket === 'stuck' ? 'active' : ''}`}>
          תקועים
        </Link>
        <Link href="/office/completed" className={`tab ${bucket === 'completed' ? 'active' : ''}`}>
          הושלמו
        </Link>
      </div>

      {/* Case list */}
      {cases.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p className="muted">{meta.empty}</p>
          <Link href="/office" className="button button-secondary button-compact" style={{ marginTop: 16, display: 'inline-flex' }}>
            ← לוח בקרה
          </Link>
        </div>
      ) : (
        <div className="office-case-list">
          {cases.map((item) => (
            <Link key={item.id} href={`/office/case/${item.id}`} className="case-list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div className="cli-name">{item.leadName}</div>
                  <div className="cli-stage">{STAGE_LABELS[item.stage] ?? item.stage}</div>
                  <div className="cli-meta">
                    <span className="case-id-badge" style={{ marginInlineEnd: 0 }}>{item.id}</span>
                    {item.assignedTo && <span>אחראי: {item.assignedTo}</span>}
                    {item.missingItems > 0 && (
                      <span className="cli-missing">{item.missingItems} חסרים</span>
                    )}
                    {item.nextAction && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                        {item.nextAction}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--muted)', flexShrink: 0 }}>←</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
