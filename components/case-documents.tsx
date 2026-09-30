'use client';

import { useEffect, useState } from 'react';
import type { DocumentRequirement } from '@/data/domain';
import type { CaseDocumentRecord } from '@/lib/data';
import { MissingDocsReminder } from '@/components/onboarding/missing-docs-reminder';

type UploadedFile = { id: string; documentCode: string; fileName: string; uploadedAt: string };

const STATUS_LABELS: Record<string, string> = {
  'not-uploaded': 'לא הועלה',
  'uploaded': 'הועלה',
  'under-review': 'בבדיקה',
  'approved': 'אושר',
  'resubmit-needed': 'נדרשת הגשה מחדש',
  'not-applicable': 'לא רלוונטי',
};

const GROUP_LABELS: Record<string, string> = {
  Identity: 'זיהוי',
  Income: 'הכנסה',
  Banking: 'בנק',
  Property: 'נכס',
  Process: 'תהליך',
  Documents: 'מסמכים',
};

type ChecklistItem = DocumentRequirement & { required: boolean };

type Props = {
  caseId: string;
  checklist: ChecklistItem[];
};

function statusCounts(checklist: ChecklistItem[], liveStatuses: Record<string, string>) {
  let approved = 0, pending = 0, missing = 0;
  for (const doc of checklist.filter((d) => d.required)) {
    const status = liveStatuses[doc.code] ?? 'not-uploaded';
    if (status === 'approved') approved++;
    else if (status === 'uploaded' || status === 'under-review') pending++;
    else if (status === 'not-uploaded' || status === 'resubmit-needed') missing++;
  }
  return { approved, pending, missing };
}

export function CaseDocuments({ caseId, checklist }: Props) {
  const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cases/${caseId}/documents`)
      .then((r) => r.json())
      .then((d: { ok: boolean; data?: CaseDocumentRecord[]; uploads?: UploadedFile[] }) => {
        if (d.uploads) setFiles(d.uploads);
        if (d.ok && d.data) {
          const map: Record<string, string> = {};
          for (const doc of d.data) {
            map[doc.documentCode] = doc.status;
          }
          setLiveStatuses(map);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [caseId]);

  async function updateStatus(docCode: string, status: string, reviewNote?: string) {
    setSaving(docCode);
    try {
      const res = await fetch(`/api/cases/${caseId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentCode: docCode, status, reviewNote }),
      });
      if (res.ok) {
        setLiveStatuses((prev) => ({ ...prev, [docCode]: status }));
      }
    } finally {
      setSaving(null);
    }
  }

  const groups = Array.from(new Set(checklist.map((d) => d.group)));
  const knownCodes = new Set(checklist.map((d) => d.code));
  const extraFiles = files.filter((f) => !knownCodes.has(f.documentCode));
  const filesFor = (code: string) => files.filter((f) => f.documentCode === code);
  const counts = statusCounts(checklist, liveStatuses);

  if (loading) return <div className="card muted" style={{ padding: 24 }}>טוען מסמכים…</div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
    <MissingDocsReminder caseId={caseId} hasMissing={counts.missing > 0} />
    <div className="card">
      {checklist.length === 0 ? <p className="muted" style={{ marginTop: 0 }}>לתיק הזה אין רשימת מסמכים. קבצים שהלקוח מעלה יופיעו כאן.</p> : null}
      {/* Summary bar */}
      <div className="docs-summary-bar">
        <div className="docs-summary-item">
          <div className="docs-summary-dot" style={{ background: 'var(--good)' }} />
          <span>{counts.approved} אושרו</span>
        </div>
        <div className="docs-summary-item">
          <div className="docs-summary-dot" style={{ background: 'var(--warn)' }} />
          <span>{counts.pending} ממתינים לבדיקה</span>
        </div>
        <div className="docs-summary-item">
          <div className="docs-summary-dot" style={{ background: 'var(--danger)' }} />
          <span>{counts.missing} חסרים</span>
        </div>
      </div>

      {groups.map((group) => {
        const groupDocs = checklist.filter((d) => d.group === group);
        return (
          <div key={group}>
            <div className="doc-group-title">{GROUP_LABELS[group] ?? group}</div>
            {groupDocs.map((doc) => {
              const status = liveStatuses[doc.code] ?? 'not-uploaded';
              const isSaving = saving === doc.code;
              const canAction = status === 'uploaded' || status === 'under-review';

              return (
                <div key={doc.code} className="doc-row">
                  <div className="doc-name">
                    {doc.labelHe}
                    {!doc.required && (
                      <span className="muted" style={{ fontSize: 11, marginRight: 6 }}>(אופציונלי)</span>
                    )}
                    <FileLinks files={filesFor(doc.code)} />
                  </div>
                  <span className={`doc-status-badge ${status}`}>
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <div className="doc-actions">
                    {canAction && (
                      <>
                        <button
                          type="button"
                          className="doc-action-btn approve"
                          disabled={isSaving}
                          onClick={() => updateStatus(doc.code, 'approved')}
                          title="אשר מסמך"
                        >
                          ✓ אשר
                        </button>
                        <button
                          type="button"
                          className="doc-action-btn resubmit"
                          disabled={isSaving}
                          onClick={() => updateStatus(doc.code, 'resubmit-needed', 'נדרשת הגשה מחדש')}
                          title="בקש הגשה מחדש"
                        >
                          ↩ מחדש
                        </button>
                      </>
                    )}
                    {status === 'not-uploaded' && (
                      <button
                        type="button"
                        className="doc-action-btn"
                        disabled={isSaving}
                        onClick={() => updateStatus(doc.code, 'not-applicable')}
                        title="סמן כלא רלוונטי"
                      >
                        — לא רלוונטי
                      </button>
                    )}
                    {status === 'not-applicable' && (
                      <button
                        type="button"
                        className="doc-action-btn"
                        disabled={isSaving}
                        onClick={() => updateStatus(doc.code, 'not-uploaded')}
                      >
                        שחזר
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {extraFiles.length ? (
        <div>
          <div className="doc-group-title">קבצים נוספים</div>
          <div className="doc-row">
            <div className="doc-name">
              <FileLinks files={extraFiles} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}

function FileLinks({ files }: { files: UploadedFile[] }) {
  if (!files.length) return null;
  return (
    <ul className="doc-file-links">
      {files.map((file) => (
        <li key={file.id}>
          <a href={`/api/files/${file.id}`} className="mini-link">
            ⤓ {file.fileName}
          </a>
          <span className="muted"> · {new Date(file.uploadedAt).toLocaleDateString('he-IL')}</span>
        </li>
      ))}
    </ul>
  );
}
