import { NextRequest, NextResponse } from 'next/server';
import { listCases, createCase } from '@/lib/repository';
import { hasAirtableConfig } from '@/lib/env';
import { createNativeIntakeCase } from '@/lib/airtable';
import { summarizeIntakeForNotes, makeNativeIntakeSubmissionId, type IntakePayload } from '@/lib/intake';
import { postJson, triggerN8n } from '@/lib/n8n';
import { env } from '@/lib/env';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseBorrowerProfiles(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function validateNativeIntake(intake: unknown): intake is IntakePayload {
  if (!isObject(intake)) return false;
  const applicant = intake.applicant;
  const contact = intake.contact;
  const incomeProfile = intake.incomeProfile;
  const consent = intake.consent;

  return (
    isObject(applicant) &&
    typeof applicant.fullName === 'string' &&
    applicant.fullName.trim().length > 0 &&
    isObject(contact) &&
    typeof contact.phone === 'string' &&
    contact.phone.trim().length > 0 &&
    isObject(incomeProfile) &&
    Array.isArray(incomeProfile.borrowerProfiles) &&
    incomeProfile.borrowerProfiles.length > 0 &&
    typeof intake.caseType === 'string' &&
    isObject(consent) &&
    consent.privacyAccepted === true &&
    consent.advisorAuthorizationAccepted === true &&
    consent.accuracyConfirmed === true
  );
}

async function notifyNewIntake(caseId: string, leadName: string, phone: string) {
  const payload = { caseId, leadName, phone, stage: 'intake-submitted' };

  if (env.officeAlertWebhookUrl) {
    return postJson(env.officeAlertWebhookUrl, { kind: 'secretary-alert', ...payload });
  }

  if (env.n8nWebhookBaseUrl) {
    return triggerN8n('keypoint/secretary-alert', payload);
  }

  return { ok: false, error: 'No office alert path configured' } as const;
}

export async function GET() {
  const cases = await listCases();

  return NextResponse.json({
    ok: true,
    source: hasAirtableConfig() ? 'airtable-or-fallback' : 'local-sample',
    data: cases,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body?.source === 'native-intake') {
    const intake = body?.intake;
    if (!validateNativeIntake(intake)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid intake payload. Applicant, phone, case type, income profile, and consent are required.' },
        { status: 400 },
      );
    }

    const submissionId = makeNativeIntakeSubmissionId();
    const result = await createNativeIntakeCase({
      leadName: intake.applicant.fullName.trim(),
      spouseName: intake.coApplicant.hasCoApplicant ? intake.coApplicant.fullName?.trim() || undefined : undefined,
      phone: intake.contact.phone.trim(),
      email: intake.contact.email?.trim() || undefined,
      caseType: intake.caseType,
      borrowerProfiles: intake.incomeProfile.borrowerProfiles,
      notes: summarizeIntakeForNotes(intake),
      submissionId,
      stage: 'intake-submitted',
      source: 'native-intake',
      intake,
    });

    if (!result.ok || !result.data) {
      return NextResponse.json(result, { status: 400 });
    }

    await notifyNewIntake(result.data.id, result.data.leadName, result.data.phone);

    return NextResponse.json(
      {
        ok: true,
        data: result.data,
        meta: {
          source: 'native-intake',
          submissionId,
          seededDocuments: result.meta?.requiredDocumentCodes || [],
          clientsCreated: result.meta?.clientsCreated || 0,
          automationTriggered: Boolean(env.officeAlertWebhookUrl || env.n8nWebhookBaseUrl),
        },
      },
      { status: 201 },
    );
  }

  const leadName = body?.leadName as string | undefined;
  const phone = body?.phone as string | undefined;
  const caseType = body?.caseType as string | undefined;
  const borrowerProfiles = parseBorrowerProfiles(body?.borrowerProfiles);

  if (!leadName || !phone || !caseType || !borrowerProfiles.length) {
    return NextResponse.json(
      { ok: false, error: 'leadName, phone, caseType, and borrowerProfiles[] are required' },
      { status: 400 },
    );
  }

  const result = await createCase({
    leadName,
    spouseName: body?.spouseName ? String(body.spouseName) : undefined,
    phone,
    email: body?.email ? String(body.email) : undefined,
    caseType,
    borrowerProfiles,
    assignedTo: body?.assignedTo ? String(body.assignedTo) : undefined,
    notes: body?.notes ? String(body.notes) : undefined,
    submissionId: body?.submissionId ? String(body.submissionId) : undefined,
    stage: body?.stage ? String(body.stage) : undefined,
    source: body?.source ? String(body.source) : undefined,
    nextAction: body?.nextAction ? String(body.nextAction) : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
