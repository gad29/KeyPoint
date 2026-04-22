'use client';

import { useI18n } from '@/components/i18n';
import { CaseTimeline } from '@/components/case-timeline';
import type { BankOffer, CaseRecord, DocumentRequirement } from '@/data/domain';

const copy = {
  en: {
    eyebrow: 'Client progress',
    titlePrefix: 'Case',
    readOnly: 'Read-only view · Updates automatically as your file progresses',
    noCase: 'Progress link unavailable',
    noCaseText: 'Ask the office for a fresh progress link.',
    currentStage: 'Current stage',
    documentsTitle: 'Documents',
    docsApproved: 'Approved',
    docsPending: 'Pending review',
    docsMissing: 'Missing / needs resubmission',
    offers: 'Bank offers',
    noOffers: 'Bank offers will appear here once the advisor logs them.',
    whatsapp: 'Have a question? Contact us',
    firstPayment: 'First payment',
    maxPayment: 'Max payment',
    totalRepayment: 'Total repayment',
    totalInterest: 'Total interest',
    expires: 'Expires',
    optional: 'Optional',
  },
  he: {
    eyebrow: 'התקדמות התיק',
    titlePrefix: 'תיק',
    readOnly: 'תצוגת לקוח · מתעדכן אוטומטית כשהתיק מתקדם',
    noCase: 'קישור ההתקדמות לא זמין',
    noCaseText: 'יש לבקש מהמשרד קישור התקדמות חדש.',
    currentStage: 'שלב נוכחי',
    documentsTitle: 'מסמכים',
    docsApproved: 'מסמכים שאושרו',
    docsPending: 'ממתינים לבדיקה',
    docsMissing: 'חסרים / נדרשת הגשה מחדש',
    offers: 'הצעות בנק',
    noOffers: 'הצעות בנק יופיעו כאן אחרי שהיועץ יזין אותן.',
    whatsapp: 'יש שאלה? צרו איתנו קשר',
    firstPayment: 'תשלום ראשון',
    maxPayment: 'תשלום מרבי',
    totalRepayment: 'סה"כ להחזר',
    totalInterest: 'סה"כ ריבית',
    expires: 'בתוקף עד',
    optional: 'אופציונלי',
  },
};

const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  received: 'התקבל',
  approved: 'אושר',
  rejected: 'נדחה',
  expired: 'פג תוקף',
};

function formatCurrency(val: number | string | undefined) {
  if (!val) return '—';
  const n = typeof val === 'string' ? Number(val.replace(/[^\d.]/g, '')) : val;
  if (!Number.isFinite(n)) return String(val);
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
}

type DocWithRequired = DocumentRequirement & { required?: boolean };

function groupDocsByStatus(
  docs: DocWithRequired[],
  statuses: Record<string, string>,
  language: 'en' | 'he',
) {
  const approved: DocWithRequired[] = [];
  const pending: DocWithRequired[] = [];
  const missing: DocWithRequired[] = [];

  for (const doc of docs) {
    if (!doc.required) continue;
    const st = statuses[doc.code] ?? 'not-uploaded';
    if (st === 'approved' || st === 'not-applicable') approved.push(doc);
    else if (st === 'uploaded' || st === 'under-review') pending.push(doc);
    else missing.push(doc);
  }

  return { approved, pending, missing };
}

function DocList({ docs, language }: { docs: DocWithRequired[]; language: 'en' | 'he' }) {
  if (docs.length === 0) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {docs.map((doc) => (
        <li key={doc.code} style={{ fontSize: 14, color: 'var(--fg)' }}>
          {language === 'he' ? doc.labelHe : doc.labelEn}
        </li>
      ))}
    </ul>
  );
}

export function PortalPageClient({
  caseRecord,
  requiredDocuments,
  offers = [],
  docStatuses = {},
  secretaryWhatsapp,
}: {
  caseRecord?: CaseRecord;
  requiredDocuments: DocWithRequired[];
  offers?: BankOffer[];
  docStatuses?: Record<string, string>;
  secretaryWhatsapp?: string | null;
}) {
  const { language } = useI18n();
  const t = copy[language];
  const dir = language === 'he' ? 'rtl' : 'ltr';

  if (!caseRecord) {
    return (
      <section className="card" dir={dir}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h2>{t.noCase}</h2>
        <p className="muted">{t.noCaseText}</p>
      </section>
    );
  }

  const { approved, pending, missing } = groupDocsByStatus(requiredDocuments, docStatuses, language);

  return (
    <div className="grid" dir={dir} style={{ maxWidth: 860, gap: 20 }}>
      {/* Header card */}
      <section className="card" style={{ paddingBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>{t.eyebrow}</p>
            <h2 style={{ margin: 0 }}>{caseRecord.leadName}</h2>
            <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              {t.titlePrefix} {caseRecord.id}
            </p>
          </div>
          {secretaryWhatsapp && (
            <a
              href={`https://wa.me/${secretaryWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-secondary button-compact"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t.whatsapp}
            </a>
          )}
        </div>
        {/* Read-only banner */}
        <div style={{
          marginTop: 14,
          padding: '7px 12px',
          borderRadius: 6,
          background: 'var(--surface-raised, rgba(0,0,0,0.04))',
          fontSize: 12,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {t.readOnly}
        </div>
      </section>

      {/* Stage timeline */}
      <section className="card" style={{ padding: '16px 20px' }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>{t.currentStage}</p>
        <CaseTimeline currentStage={caseRecord.stage} />
      </section>

      {/* Documents */}
      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 14 }}>{t.documentsTitle}</p>

        {approved.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--good)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--good)' }}>
                {t.docsApproved} ({approved.length})
              </span>
            </div>
            <DocList docs={approved} language={language} />
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warn)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warn)' }}>
                {t.docsPending} ({pending.length})
              </span>
            </div>
            <DocList docs={pending} language={language} />
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>
                {t.docsMissing} ({missing.length})
              </span>
            </div>
            <DocList docs={missing} language={language} />
          </div>
        )}

        {approved.length === 0 && pending.length === 0 && missing.length === 0 && (
          <p className="muted" style={{ fontSize: 13 }}>—</p>
        )}
      </section>

      {/* Bank offers */}
      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 14 }}>{t.offers}</p>
        {offers.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>{t.noOffers}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {offers.map((offer) => (
              <div
                key={`${offer.bank}-${offer.expiresAt || offer.status}`}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  background: 'var(--surface-raised, var(--surface))',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{offer.bank}</div>
                {offer.status && (
                  <span className="badge" style={{ marginBottom: 10, display: 'inline-block' }}>
                    {OFFER_STATUS_LABELS[offer.status] ?? offer.status}
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                  {offer.firstPayment && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">{t.firstPayment}</span>
                      <strong>{formatCurrency(offer.firstPayment)}</strong>
                    </div>
                  )}
                  {offer.maxPayment && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">{t.maxPayment}</span>
                      <strong>{formatCurrency(offer.maxPayment)}</strong>
                    </div>
                  )}
                  {offer.totalRepayment && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">{t.totalRepayment}</span>
                      <strong>{formatCurrency(offer.totalRepayment)}</strong>
                    </div>
                  )}
                  {offer.expiresAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span className="muted">{t.expires}</span>
                      <span>{offer.expiresAt}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
