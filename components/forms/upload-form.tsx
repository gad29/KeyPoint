'use client';

import { useState } from 'react';

export function UploadForm({ caseId, defaultDocumentCode = 'id-card' }: { caseId: string; defaultDocumentCode?: string }) {
  const [documentCode, setDocumentCode] = useState(defaultDocumentCode);
  const [status, setStatus] = useState<string>('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('caseId', caseId);
    form.set('documentCode', documentCode);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    const json = await res.json();
    setStatus(json.ok ? 'Upload saved.' : json.error || 'Upload failed');
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <p className="eyebrow">Upload document</p>
      <label className="field">
        <span>Document code</span>
        <input value={documentCode} onChange={(e) => setDocumentCode(e.target.value)} name="documentCode" />
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
