import { NextRequest, NextResponse } from 'next/server';
import { listCases, createCase, createIntakeCase } from '@/lib/repository';
import { env, getDataBackend } from '@/lib/env';
import { getRequiredDocumentCodes, summarizeIntakeForNotes, makeNativeIntakeSubmissionId, type IntakePayload } from '@/lib/intake';
import { postJson, triggerN8n } from '@/lib/n8n';
import { currentRequestHasStaffSession } from '@/lib/staff-session';
import type { CaseContactInput } from '@/lib/data';

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
    source: getDataBackend(),
    data: cases,
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.source === 'generic-intake') {
    const answers = isObject(body.answers) ? (body.answers as Record<string, unknown>) : null;
    if (!answers) {
      return NextResponse.json({ ok: false, error: 'answers object is required' }, { status: 400 });
    }

    const fullName = typeof answers.fullName === 'string' ? answers.fullName.trim() : '';
    const phone = typeof answers.phone === 'string' ? answers.phone.trim() : '';
    const privacyAccepted = answers.privacyAccepted === true;
    const accuracyConfirmed = answers.accuracyConfirmed === true;

    if (!fullName || !phone || !privacyAccepted || !accuracyConfirmed) {
      return NextResponse.json(
        { ok: false, error: 'fullName, phone, and both consent checkboxes are required.' },
        { status: 400 },
      );
    }

    const submissionId = makeNativeIntakeSubmissionId();
    const notesLines = ['Intake source: generic-intake', ''];
    for (const [key, value] of Object.entries(answers)) {
      notesLines.push(`- ${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`);
    }

    const result = await createIntakeCase({
      leadName: fullName,
      phone,
      email: typeof answers.email === 'string' && answers.email.trim() ? answers.email.trim() : undefined,
      caseType: 'service-engagement',
      borrowerProfiles: [],
      notes: notesLines.join('\n'),
      submissionId,
      stage: 'intake-submitted',
      source: 'generic-intake',
      answers,
      contacts: [
        {
          fullName,
          phone,
          email: typeof answers.email === 'string' ? answers.email.trim() : undefined,
          role: 'primary',
        },
      ],
      requiredDocumentCodes: [],
    });

    if (!result.ok || !result.data) {
      const errorMessage = result.error || 'Failed to create case';
      return NextResponse.json(
        { ok: false, error: errorMessage, meta: { source: 'generic-intake', submissionId } },
        { status: 400 },
      );
    }

    const alertResult = await notifyNewIntake(result.data.id, result.data.leadName, result.data.phone);
    if (!alertResult.ok) {
      console.warn(
        `[AgencyOS API] Generic intake created but office alert failed ${JSON.stringify({ caseId: result.data.id, error: alertResult.error })}`,
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: result.data,
        meta: {
          source: 'generic-intake',
          submissionId,
          automationTriggered: Boolean(env.officeAlertWebhookUrl || env.n8nWebhookBaseUrl),
        },
      },
      { status: 201 },
    );
  }

  if (body.source === 'native-intake') {
    const intake = body.intake;
    if (!validateNativeIntake(intake)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid intake payload. Applicant, phone, case type, income profile, and consent are required.' },
        { status: 400 },
      );
    }

    const submissionId = makeNativeIntakeSubmissionId();
    const contacts: CaseContactInput[] = [
      {
        fullName: intake.applicant.fullName.trim(),
        idNumber: intake.applicant.idNumber?.replace(/\D/g, '') || undefined,
        preferredLanguage: intake.contact.preferredLanguage,
        phone: intake.contact.phone.trim(),
        email: intake.contact.email?.trim() || undefined,
        role: 'primary',
      },
    ];
    if (intake.coApplicant.hasCoApplicant && intake.coApplicant.fullName?.trim()) {
      contacts.push({
        fullName: intake.coApplicant.fullName.trim(),
        idNumber: intake.coApplicant.idNumber?.replace(/\D/g, '') || undefined,
        preferredLanguage: intake.contact.preferredLanguage,
        phone: intake.contact.phone.trim(),
        email: intake.contact.email?.trim() || undefined,
        role: 'secondary',
      });
    }

    const result = await createIntakeCase({
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
      answers: intake,
      contacts,
      requiredDocumentCodes: getRequiredDocumentCodes(intake.caseType, intake.incomeProfile.borrowerProfiles),
    });

    if (!result.ok || !result.data) {
      return NextResponse.json(result, { status: 400 });
    }

    const alertResult = await notifyNewIntake(result.data.id, result.data.leadName, result.data.phone);
    if (!alertResult.ok) {
      console.warn(
        `[AgencyOS API] Intake created but office alert failed ${JSON.stringify({ caseId: result.data.id, error: alertResult.error })}`,
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: result.data,
        meta: {
          source: 'native-intake',
          submissionId,
          seededDocuments: result.meta?.requiredDocumentCodes || [],
          clientsCreated: result.meta?.clientsCreated || 0,
          warnings: result.meta?.warnings || [],
          automationTriggered: Boolean(env.officeAlertWebhookUrl || env.n8nWebhookBaseUrl),
        },
      },
      { status: 201 },
    );
  }

  if (!(await currentRequestHasStaffSession())) {
    return NextResponse.json({ ok: false, error: 'Staff sign-in required' }, { status: 401 });
  }

  const leadName = body.leadName as string | undefined;
  const phone = body.phone as string | undefined;
  const caseType = body.caseType as string | undefined;
  const borrowerProfiles = parseBorrowerProfiles(body.borrowerProfiles);

  if (!leadName || !phone || !caseType || !borrowerProfiles.length) {
    return NextResponse.json(
      { ok: false, error: 'leadName, phone, caseType, and borrowerProfiles[] are required' },
      { status: 400 },
    );
  }

  const result = await createCase({
    leadName,
    spouseName: body.spouseName ? String(body.spouseName) : undefined,
    phone,
    email: body.email ? String(body.email) : undefined,
    caseType,
    borrowerProfiles,
    assignedTo: body.assignedTo ? String(body.assignedTo) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    submissionId: body.submissionId ? String(body.submissionId) : undefined,
    stage: body.stage ? String(body.stage) : undefined,
    source: body.source ? String(body.source) : undefined,
    nextAction: body.nextAction ? String(body.nextAction) : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
