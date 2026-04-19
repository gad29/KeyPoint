import { env, hasAirtableConfig } from '@/lib/env';
import { createAirtableRecord, findAirtableRecordByField } from '@/lib/airtable';
import type { ActionResult } from '@/lib/types';
import { normalizeStaffRole } from '@/lib/staff-roles';

type StaffRecordFields = {
  email?: string;
  passwordHash?: string;
  fullName?: string;
  active?: boolean;
};

const EMAIL_FIELDS = ['Email', 'email', 'E-mail'];
const HASH_FIELDS = ['Password hash', 'Password Hash', 'password hash', 'Password'];
const NAME_FIELDS = ['Full name', 'Full Name', 'Name'];
const ACTIVE_FIELDS = ['Active', 'active', 'Enabled'];
const ROLE_FIELDS = ['Role', 'role', 'Staff role', 'Staff Role'];

function pickFirstString(fields: Record<string, unknown>, names: string[]): string {
  for (const n of names) {
    const v = fields[n];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function pickActive(fields: Record<string, unknown>): boolean {
  for (const n of ACTIVE_FIELDS) {
    const v = fields[n];
    if (typeof v === 'boolean') return v;
  }
  return true;
}

function pickRole(fields: Record<string, unknown>): string {
  const raw = pickFirstString(fields, ROLE_FIELDS);
  return normalizeStaffRole(raw || undefined);
}

function staffTableName() {
  return env.airtableStaffTable || 'Staff';
}

export type StaffUserRow = {
  recordId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  active: boolean;
  role: string;
};

export async function findStaffByEmail(email: string): Promise<ActionResult<StaffUserRow>> {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable is not configured' };
  }

  const normalized = email.trim().toLowerCase();
  const table = staffTableName();

  for (const fieldLabel of EMAIL_FIELDS) {
    const found = await findAirtableRecordByField<StaffRecordFields>(table, fieldLabel, normalized);
    if (found.ok && found.data) {
      const f = found.data.fields;
      const hash = pickFirstString(f as Record<string, unknown>, HASH_FIELDS);
      if (!hash) {
        return { ok: false, error: 'Invalid email or password' };
      }
      return {
        ok: true,
        data: {
          recordId: found.data.id,
          email: pickFirstString(f as Record<string, unknown>, EMAIL_FIELDS) || normalized,
          passwordHash: hash,
          fullName: pickFirstString(f as Record<string, unknown>, NAME_FIELDS),
          active: pickActive(f as Record<string, unknown>),
          role: pickRole(f as Record<string, unknown>),
        },
      };
    }
  }

  return { ok: false, error: 'Invalid email or password' };
}

export async function createStaffInAirtable(input: {
  email: string;
  passwordHash: string;
  fullName?: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!hasAirtableConfig()) {
    return { ok: false, error: 'Airtable is not configured' };
  }

  const table = staffTableName();
  const fields: Record<string, unknown> = {
    [EMAIL_FIELDS[0]]: input.email.trim().toLowerCase(),
    [HASH_FIELDS[0]]: input.passwordHash,
    [ACTIVE_FIELDS[0]]: true,
    [ROLE_FIELDS[0]]: 'advisor',
  };
  if (input.fullName?.trim()) {
    fields[NAME_FIELDS[0]] = input.fullName.trim();
  }

  const res = await createAirtableRecord(table, fields);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || 'Failed to create staff user' };
  }
  const payload = res.data as { id?: string };
  if (!payload.id) return { ok: false, error: 'Airtable did not return record id' };
  return { ok: true, data: { id: payload.id } };
}

export async function emailExistsInStaff(email: string): Promise<boolean> {
  const r = await findStaffByEmail(email);
  return r.ok;
}
