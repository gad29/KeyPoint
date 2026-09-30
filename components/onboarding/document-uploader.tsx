'use client';

import { useRef, useState } from 'react';
import { useI18n } from '@/components/i18n';

export interface UploadItem {
  code: string;
  labelEn: string;
  labelHe: string;
  required: boolean;
  /** Server-side document status, e.g. not-uploaded | uploaded | approved | resubmit-needed. */
  status?: string;
}

type RowState = { phase: 'idle' | 'uploading' | 'done' | 'error'; progress: number; message?: string; files: string[] };

const copy = {
  en: {
    required: 'Required',
    optional: 'Optional',
    choose: 'Choose file',
    another: 'Add another',
    drop: 'or drop it here',
    uploading: 'Uploading',
    failed: 'Upload failed',
    other: 'Other file',
    status: {
      approved: 'Approved',
      uploaded: 'Received',
      'under-review': 'In review',
      'resubmit-needed': 'Please upload again',
      'not-applicable': 'Not needed',
    } as Record<string, string>,
  },
  he: {
    required: 'חובה',
    optional: 'לא חובה',
    choose: 'בחירת קובץ',
    another: 'הוספת קובץ',
    drop: 'או גררו לכאן',
    uploading: 'מעלה',
    failed: 'ההעלאה נכשלה',
    other: 'קובץ נוסף',
    status: {
      approved: 'אושר',
      uploaded: 'התקבל',
      'under-review': 'בבדיקה',
      'resubmit-needed': 'נא להעלות שוב',
      'not-applicable': 'לא נדרש',
    } as Record<string, string>,
  },
};

function uploadWithProgress(form: FormData, onProgress: (pct: number) => void) {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as { ok: boolean; error?: string };
        resolve(json.ok ? { ok: true } : { ok: false, error: json.error });
      } catch {
        resolve({ ok: false });
      }
    };
    xhr.onerror = () => resolve({ ok: false });
    xhr.send(form);
  });
}

export function DocumentUploader({
  caseId,
  token,
  items,
  allowOther = true,
}: {
  caseId: string;
  token?: string;
  items: UploadItem[];
  allowOther?: boolean;
}) {
  const { language } = useI18n();
  const t = copy[language];
  const rows: UploadItem[] = allowOther
    ? [...items, { code: 'other', labelEn: t.other, labelHe: copy.he.other, required: false }]
    : items;
  const [state, setState] = useState<Record<string, RowState>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function upload(code: string, files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    for (const file of list) {
      setState((prev) => ({ ...prev, [code]: { ...(prev[code] ?? { files: [] }), phase: 'uploading', progress: 0 } }));
      const form = new FormData();
      form.set('file', file);
      form.set('caseId', caseId);
      form.set('documentCode', code);
      if (token) form.set('token', token);
      const result = await uploadWithProgress(form, (progress) =>
        setState((prev) => ({ ...prev, [code]: { ...(prev[code] ?? { files: [] }), phase: 'uploading', progress } })),
      );
      setState((prev) => {
        const current = prev[code] ?? { files: [], progress: 0, phase: 'idle' };
        return result.ok
          ? { ...prev, [code]: { phase: 'done', progress: 100, files: [...current.files, file.name] } }
          : { ...prev, [code]: { ...current, phase: 'error', message: result.error || t.failed } };
      });
    }
  }

  return (
    <ul className="doc-upload-list">
      {rows.map((item) => {
        const row = state[item.code];
        const label = language === 'he' ? item.labelHe : item.labelEn;
        const serverStatus = row?.files.length ? 'uploaded' : item.status && item.status !== 'not-uploaded' ? item.status : '';
        return (
          <li
            key={item.code}
            className={`doc-upload-row ${serverStatus ? `is-${serverStatus}` : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(item.code, e.dataTransfer.files);
            }}
          >
            <div className="doc-upload-main">
              <div className="doc-upload-title">
                <strong>{label}</strong>
                {item.code !== 'other' ? (
                  <span className={`doc-upload-tag ${item.required ? 'required' : ''}`}>{item.required ? t.required : t.optional}</span>
                ) : null}
                {serverStatus ? <span className={`doc-upload-status ${serverStatus}`}>{t.status[serverStatus] ?? serverStatus}</span> : null}
              </div>
              {row?.files.length ? <p className="doc-upload-files">{row.files.join(' · ')}</p> : null}
              {row?.phase === 'uploading' ? (
                <div className="doc-upload-progress" role="progressbar" aria-valuenow={row.progress} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${row.progress}%` }} />
                </div>
              ) : null}
              {row?.phase === 'error' ? <p className="form-error doc-upload-error">{row.message}</p> : null}
            </div>
            <div className="doc-upload-action">
              <input
                ref={(el) => {
                  inputs.current[item.code] = el;
                }}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  void upload(item.code, e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="button button-secondary button-compact"
                disabled={row?.phase === 'uploading'}
                onClick={() => inputs.current[item.code]?.click()}
              >
                {row?.phase === 'uploading' ? `${t.uploading} ${row.progress}%` : row?.files.length ? t.another : t.choose}
              </button>
              <span className="doc-upload-drop">{t.drop}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
