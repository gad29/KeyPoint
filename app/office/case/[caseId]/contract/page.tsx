import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/data';
import { getBranding } from '@/lib/onboarding';
import { PrintButton } from '@/components/onboarding/print-button';

export const dynamic = 'force-dynamic';

export default async function SignedContractPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const [result, branding] = await Promise.all([getStore().listContractSignatures(caseId), getBranding()]);
  const signature = result.ok ? result.data?.[0] : undefined;
  if (!signature) notFound();

  const signedAt = new Date(signature.signedAt);
  return (
    <div className="signed-contract" dir="rtl">
      <div className="signed-contract-toolbar no-print">
        <Link href={`/office/case/${caseId}`} className="case-back-link">← {caseId}</Link>
        <PrintButton />
      </div>

      <article className="card signed-contract-doc">
        <p className="eyebrow">{branding.nameHe || branding.name}</p>
        <h1>{signature.contractTitle}</h1>
        {signature.contractBody.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}

        <section className="signed-contract-sign">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL signature, not a remote asset */}
          <img src={signature.signatureImage} alt={`Signature of ${signature.signerName}`} />
          <div>
            <strong>{signature.signerName}</strong>
            <p className="muted">{signedAt.toLocaleString('he-IL')} · {signedAt.toISOString()}</p>
          </div>
        </section>

        <dl className="signed-contract-audit">
          <dt>תיק</dt>
          <dd>{caseId}</dd>
          <dt>טביעת אצבע של הנוסח (SHA-256)</dt>
          <dd dir="ltr">{signature.contentHash}</dd>
          <dt>כתובת IP</dt>
          <dd dir="ltr">{signature.ip || '—'}</dd>
          <dt>דפדפן</dt>
          <dd dir="ltr">{signature.userAgent || '—'}</dd>
        </dl>
      </article>
    </div>
  );
}
