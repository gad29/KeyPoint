'use client';

import Link from 'next/link';
import type { CaseRecord } from '@/data/domain';
import { filterCasesByBucket } from '@/lib/office-buckets';

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

const URGENT_STAGES = new Set(['waiting-appraiser', 'bank-negotiation', 'ready-for-bank', 'recommendation-prepared']);

function todayDateHe() {
  return new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function OfficeDashboard({ cases }: { cases: CaseRecord[] }) {
  const activeCases = filterCasesByBucket(cases, 'active');
  const stuckCases = filterCasesByBucket(cases, 'stuck');
  const completedCases = filterCasesByBucket(cases, 'completed');
  const newCases = cases.filter((c) => c.stage === 'new-lead' || c.stage === 'intake-submitted');

  const urgentCases = cases.filter(
    (c) => c.stage !== 'completed' && (URGENT_STAGES.has(c.stage) || (c.nextAction && c.missingItems === 0)),
  ).slice(0, 8);

  return (
    <div className="grid" dir="rtl" style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div className="hero product-hero" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">KeyPoint</p>
          <h2 style={{ margin: '8px 0 6px' }}>לוח בקרה</h2>
          <p className="muted" style={{ fontSize: 14 }}>{todayDateHe()}</p>
        </div>
        <div className="inline-actions">
          <Link href="/intake" className="button button-secondary button-compact">+ תיק חדש</Link>
        </div>
      </div>

      {/* Pipeline overview cards */}
      <div className="pipeline-cards">
        <Link href="/office/active" className="pipeline-card pc-new" style={{ textDecoration: 'none' }}>
          <p className="eyebrow">טפסים חדשים</p>
          <div className="pc-count">{newCases.length}</div>
          <div className="pc-label">ממתינים לאישור</div>
        </Link>

        <Link href="/office/active" className="pipeline-card pc-active" style={{ textDecoration: 'none' }}>
          <p className="eyebrow">פעילים</p>
          <div className="pc-count">{activeCases.length}</div>
          <div className="pc-label">תיקים בתהליך</div>
        </Link>

        <Link href="/office/stuck" className="pipeline-card pc-stuck" style={{ textDecoration: 'none' }}>
          <p className="eyebrow">תקועים</p>
          <div className="pc-count">{stuckCases.length}</div>
          <div className="pc-label">מסמכים חסרים</div>
        </Link>

        <Link href="/office/completed" className="pipeline-card pc-done" style={{ textDecoration: 'none' }}>
          <p className="eyebrow">הושלמו</p>
          <div className="pc-count">{completedCases.length}</div>
          <div className="pc-label">תיקים שנסגרו</div>
        </Link>
      </div>

      {/* Urgent / next actions */}
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">דורש טיפול</p>
            <h3 style={{ margin: '4px 0 0', fontWeight: 700 }}>פעולות דחופות</h3>
          </div>
          <Link href="/office/active" className="mini-link" style={{ fontSize: 13 }}>כל התיקים ←</Link>
        </div>

        {urgentCases.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>אין פעולות דחופות כרגע.</p>
        ) : (
          <div className="urgent-list">
            {urgentCases.map((c) => (
              <Link key={c.id} href={`/office/case/${c.id}`} className="urgent-item">
                <div className={`urgent-dot ${c.missingItems > 0 ? 'danger' : ''}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.leadName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {STAGE_LABELS[c.stage] ?? c.stage}
                    {c.missingItems > 0 && <span className="cli-missing"> · {c.missingItems} מסמכים חסרים</span>}
                  </div>
                </div>
                {c.nextAction && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.nextAction}
                  </div>
                )}
                <div className="case-id-badge">{c.id}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick case counts by stage */}
      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 12 }}>סיכום לפי שלב</p>
        <div style={{ display: 'grid', gap: 0 }}>
          {Object.entries(
            cases.reduce<Record<string, number>>((acc, c) => {
              acc[c.stage] = (acc[c.stage] ?? 0) + 1;
              return acc;
            }, {}),
          )
            .sort(([a], [b]) => {
              const order = Object.keys(STAGE_LABELS);
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([stage, count]) => (
              <div
                key={stage}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: '1px solid var(--line)',
                  fontSize: 14,
                }}
              >
                <span>{STAGE_LABELS[stage] ?? stage}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: stage === 'completed' ? 'var(--good)' : 'var(--text)',
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
