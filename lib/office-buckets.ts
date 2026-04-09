import type { CaseRecord } from '@/data/domain';

export type OfficeCaseBucket = 'active' | 'stuck' | 'completed';

/** Completed = terminal stage. Stuck = missing client/docs (missingItems > 0). Active = other open cases. */
export function officeCaseBucket(record: CaseRecord): OfficeCaseBucket {
  if (record.stage === 'completed') return 'completed';
  if (record.missingItems > 0) return 'stuck';
  return 'active';
}

export function filterCasesByBucket(cases: CaseRecord[], bucket: OfficeCaseBucket): CaseRecord[] {
  return cases.filter((c) => officeCaseBucket(c) === bucket);
}
