'use client';

import { useCallback, useState } from 'react';
import { documentLibrary } from '@/data/domain';
import { useI18n } from '@/components/i18n';

const copy = {
  en: {
    title: 'Upload a document',
    type: 'Document type',
    pick: 'Choose file or drag here',
    submit: 'Upload',
    uploading: 'Uploading…',
    saved: 'Uploaded.',
    failed: 'Upload failed',
  },
  he: {
    title: 'העלאת מסמך',
    type: 'סוג מסמך',
    pick: 'בחרו קובץ או גררו לכאן',
    submit: 'העלאה',
    uploading: 'מעלה…',
    saved: 'הקובץ הועלה.',
    failed: 'ההעלאה נכשלה',
  },
};

export function UploadForm({
  caseId,
  defaultDocumentCode = 'id-card',
  allowedDocumentCodes,
}: {
  caseId: string;
  defaultDocumentCode?: string;
  allowedDocumentCodes?: string[];
}) {
  const { language } = useI18n();
  const t = copy[language];
  const [documentCode, setDocumentCode] = useState(defaultDocumentCode);
  const [status, setStatus] = useState('');
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState('');

  const options = documentLibrary.filter((doc) => !allowedDocumentCodes?.length || allowedDocumentCodes.includes(doc.code));

  const submitForm = useCallback(
    async (form: FormData) => {
      setStatus(t.uploading);
      form.set('caseId', caseId);
      form.set('documentCode', documentCode);
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const json = await res.json();
      setStatus(json.ok ? t.saved : json.error || t.failed);
      if (json.ok) {
        setFileName('');
      }
    },
    [caseId, documentCode, t.failed, t.saved, t.uploading],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setStatus(t.failed);
      return;
    }
    await submitForm(form);
    event.currentTarget.reset();
    setFileName('');
  }

  return (
    <form className="card upload-card" onSubmit={handleSubmit}>
      <p className="eyebrow">{t.title}</p>
      <label className="field">
        <span>{t.type}</span>
        <select value={documentCode} onChange={(e) => setDocumentCode(e.target.value)} name="documentCode">
          {options.map((doc) => (
            <option key={doc.code} value={doc.code}>
              {language === 'he' ? doc.labelHe : doc.labelEn}
            </option>
          ))}
        </select>
      </label>

      <div
        className={`upload-zone ${drag ? 'dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          const input = document.getElementById(`file-${caseId}`) as HTMLInputElement | null;
          if (input) {
            const dt = new DataTransfer();
            dt.items.add(f);
            input.files = dt.files;
            setFileName(f.name);
          }
        }}
      >
        <div className="upload-zone-icon" aria-hidden>
          📎
        </div>
        <p className="muted" style={{ margin: '0 0 8px' }}>
          {t.pick}
        </p>
        <input id={`file-${caseId}`} className="upload-file-input" name="file" type="file" required onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
        <label htmlFor={`file-${caseId}`} className="upload-zone-label">
          {fileName || '…'}
        </label>
      </div>

      <button className="button" type="submit" style={{ marginTop: 16, width: '100%' }}>
        {t.submit}
      </button>
      {status ? (
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          {status}
        </p>
      ) : null}
    </form>
  );
}
