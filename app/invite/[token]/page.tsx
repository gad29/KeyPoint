import { notFound } from 'next/navigation';
import { UploadForm } from '@/components/forms/upload-form';
import { getInvite, getCaseChecklist, listUploads } from '@/lib/repository';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) notFound();

  const checklist = await getCaseChecklist(invite.caseId);
  const uploads = await listUploads(invite.caseId);

  return (
    <div className="grid cols-2">
      <section className="card">
        <p className="eyebrow">Portal access granted</p>
        <h2>{invite.leadName}</h2>
        <p className="muted">Case {invite.caseId} · Invite valid until {new Date(invite.expiresAt).toLocaleString('en-GB')}</p>
        <table className="table" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Document</th>
              <th>Required</th>
            </tr>
          </thead>
          <tbody>
            {checklist.slice(0, 10).map((doc) => (
              <tr key={doc.code}>
                <td>
                  <strong>{doc.labelEn}</strong>
                  <div className="muted">{doc.labelHe}</div>
                </td>
                <td>{doc.required ? 'Yes' : 'Optional'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid">
        <UploadForm caseId={invite.caseId} />
        <section className="card">
          <p className="eyebrow">Recent uploads</p>
          <ul className="list">
            {uploads.length ? uploads.map((item) => (
              <li key={item.id}>
                <strong>{item.fileName}</strong>
                <div className="muted">{item.documentCode} · {new Date(item.uploadedAt).toLocaleString('en-GB')}</div>
              </li>
            )) : <li className="muted">No uploads yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
