'use client';

import { useState } from 'react';
import { documentLibrary } from '@/data/domain';

export function UploadForm({ caseId, defaultDocumentCode = 'id-card', allowedDocumentCodes }: { caseId: string; defaultDocumentCode?: string; allowedDocumentCodes?: string[] }) {
  const [documentCode, setDocumentCode] = useState(defaultDocumentCode);
  const [status, setStatus] = useState<string>('');

  const options = documentLibrary.filter((doc) => !allowedDocumentCodes?.length || allowedDocumentCodes.includes(doc.code));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Uploading…');
    const form = new FormData(event.currentTarget);
    form.set('caseId', caseId);
    form.set('documentCode', documentCode);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    const json = await res.json();
    setStatus(json.ok ? 'File saved.' : json.error || 'Upload failed');
    if (json.ok) {
      event.currentTarget.reset();
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <p className="eyebrow">Upload a document</p>
      <label className="field">
        <span>Document type</span>
        <select value={documentCode} onChange={(e) => setDocumentCode(e.target.value)} name="documentCode">
          {options.map((doc) => (
            <option key={doc.code} value={doc.code}>
              {doc.labelEn}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>File</span>
        <input name="file" type="file" required />
      </label>
      <button className="button" type="submit">Upload</button>
      {status ? <p className="muted">{status}</p> : null}
    </form>
  );
}
