import { makeNativeIntakeSubmissionId } from '@/lib/intake';
import { getStore } from '@/lib/data';
import { createIntakeCase, issueClientLink } from '@/lib/repository';
import { getBranding, resolveTemplate } from '@/lib/onboarding';
import { findMissingRequired, hashContract, pickTemplateAnswers, renderContract } from '@/lib/onboarding/templates';

const SIGNATURE_IMAGE_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const MAX_SIGNATURE_CHARS = 400_000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

type SubmitResult = { status: number; body: Record<string, unknown> };

export interface SubmitContext {
  ip?: string;
  userAgent?: string;
}

function fail(status: number, error: string): SubmitResult {
  return { status, body: { ok: false, error } };
}

/** Public onboarding submission for any template: validate, create the case, record the signature. */
export async function submitOnboarding(raw: Record<string, unknown>, ctx: SubmitContext): Promise<SubmitResult> {
  const template = await resolveTemplate(typeof raw.template === 'string' ? raw.template : undefined);
  if (!template || !template.active) return fail(404, 'This onboarding link is not available.');

  const rawAnswers = typeof raw.answers === 'object' && raw.answers !== null ? (raw.answers as Record<string, unknown>) : null;
  if (!rawAnswers) return fail(400, 'answers object is required');
  const language = raw.language === 'en' ? 'en' : 'he';
  const answers = pickTemplateAnswers(template, rawAnswers);

  const missing = findMissingRequired(template, answers);
  if (missing) return fail(400, language === 'he' ? `${missing.labelHe} — שדה חובה.` : `${missing.labelEn} is required.`);

  const fullName = typeof answers.fullName === 'string' ? answers.fullName : '';
  const phone = typeof answers.phone === 'string' ? answers.phone : '';
  const email = typeof answers.email === 'string' ? answers.email : '';
  const he = language === 'he';
  if (!fullName) return fail(400, he ? 'שם מלא — שדה חובה.' : 'Full name is required.');
  if (!phone && !email) return fail(400, he ? 'נא להזין טלפון או אימייל.' : 'A phone number or email is required.');
  if (email && !EMAIL_RE.test(email)) return fail(400, he ? 'נא להזין כתובת אימייל תקינה.' : 'Enter a valid email address.');

  let contract: { title: string; body: string; hash: string; signerName: string; image: string } | null = null;
  if (template.contract) {
    const signature = typeof raw.signature === 'object' && raw.signature !== null ? (raw.signature as Record<string, unknown>) : {};
    const signerName = typeof signature.signerName === 'string' ? signature.signerName.trim().slice(0, 120) : '';
    const image = typeof signature.imageDataUrl === 'string' ? signature.imageDataUrl : '';
    if (!signerName || signature.accepted !== true) return fail(400, he ? 'נא לקרוא, לאשר ולחתום על ההסכם.' : 'Please read, accept and sign the agreement.');
    if (!SIGNATURE_IMAGE_RE.test(image) || image.length > MAX_SIGNATURE_CHARS) return fail(400, he ? 'נא לחתום בתיבה.' : 'Please draw your signature.');

    const branding = await getBranding();
    const rendered = renderContract(template.contract, language, {
      clientName: fullName,
      businessName: language === 'he' ? branding.nameHe : branding.name,
      email,
      phone,
      answers,
    });
    contract = { ...rendered, hash: hashContract(rendered.title, rendered.body), signerName, image };
  }

  const submissionId = makeNativeIntakeSubmissionId();
  const notes = [
    `Intake source: onboarding template "${template.slug}"`,
    '',
    ...Object.entries(answers).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`),
  ].join('\n');

  const created = await createIntakeCase({
    leadName: fullName,
    phone,
    email: email || undefined,
    caseType: 'service-engagement',
    borrowerProfiles: [],
    notes,
    submissionId,
    stage: 'intake-submitted',
    source: 'generic-intake',
    templateSlug: template.slug,
    answers,
    contacts: [{ fullName, phone: phone || undefined, email: email || undefined, preferredLanguage: language, role: 'primary' }],
    documents: template.documents.map((d) => ({ code: d.code, required: d.required })),
  });
  if (!created.ok || !created.data) return fail(400, created.error || 'Failed to create case');

  const caseRecord = created.data;
  let contractSigned = false;

  if (contract) {
    const saved = await getStore().saveContractSignature(caseRecord.id, {
      templateSlug: template.slug,
      contractTitle: contract.title,
      contractBody: contract.body,
      contentHash: contract.hash,
      signerName: contract.signerName,
      signatureImage: contract.image,
      ip: ctx.ip,
      userAgent: ctx.userAgent?.slice(0, 300),
    });
    contractSigned = saved.ok;
    if (saved.ok) {
      await getStore().logActivity(caseRecord.id, 'contract-signed', `${contract.title} signed by ${contract.signerName}`, contract.signerName);
    } else {
      console.error(`[AgencyOS Onboarding] Signature not saved for ${caseRecord.id}: ${saved.error}`);
    }
  }

  const link = issueClientLink(caseRecord);
  return {
    status: 201,
    body: {
      ok: true,
      data: { id: caseRecord.id, leadName: caseRecord.leadName },
      meta: {
        source: 'generic-intake',
        template: template.slug,
        submissionId,
        portalToken: link.token,
        portalUrl: link.url,
        documents: template.documents,
        contractSigned,
      },
    },
  };
}
