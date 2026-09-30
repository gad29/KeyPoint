import { notFound } from 'next/navigation';
import { PortalPageClient } from '@/components/portal-page';
import { getCase, getCaseChecklist, getInvite, listBankOffers, listCaseDocuments } from '@/lib/repository';
import { getStore } from '@/lib/data';
import { getActivePreset } from '@/lib/presets';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function ProgressPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) return notFound();

  const caseRecord = await getCase(invite.caseId);
  if (!caseRecord) return notFound();

  const preset = getActivePreset();
  const [checklist, offers, docRecords, signatures] = await Promise.all([
    getCaseChecklist(invite.caseId),
    preset.features.bankOffers ? listBankOffers(invite.caseId) : Promise.resolve([]),
    listCaseDocuments(invite.caseId),
    getStore().listContractSignatures(invite.caseId),
  ]);

  const docStatuses: Record<string, string> = {};
  for (const d of docRecords) docStatuses[d.documentCode] = d.status;

  const latestSignature = signatures.ok && signatures.data?.length ? signatures.data[0] : null;

  return (
    <PortalPageClient
      token={token}
      presetId={preset.id}
      showBankOffers={preset.features.bankOffers}
      caseRecord={caseRecord}
      requiredDocuments={checklist}
      offers={offers}
      docStatuses={docStatuses}
      signature={latestSignature ? { title: latestSignature.contractTitle, signerName: latestSignature.signerName, signedAt: latestSignature.signedAt } : null}
      secretaryWhatsapp={env.secretaryWhatsapp}
    />
  );
}
