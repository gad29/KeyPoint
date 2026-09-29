import type { CaseStage } from '@/data/domain';

/** Hebrew stage labels. Key order is the display/sort order (generic lifecycle first). */
export const STAGE_LABELS_HE: Record<CaseStage, string> = {
  'new-lead': 'ליד חדש',
  invited: 'הוזמן',
  onboarding: 'ממלא טופס',
  'intake-submitted': 'טופס הוגש',
  'documents-in-progress': 'מסמכים בתהליך',
  'in-service': 'בעבודה',
  'invoice-sent': 'חשבונית נשלחה',
  paid: 'שולם',
  overdue: 'איחור בתשלום',
  completed: 'הושלם',
  archived: 'בארכיון',
  approved: 'אושר',
  'portal-activated': 'פורטל הופעל',
  'secretary-review': 'בדיקת מזכירה',
  'waiting-appraiser': 'ממתין לשמאי',
  'appraisal-received': 'שמאות התקבלה',
  'ready-for-bank': 'מוכן לבנק',
  'bank-negotiation': 'משא ומתן עם בנק',
  'recommendation-prepared': 'המלצה מוכנה',
};

export const GENERIC_STAGE_KEYS: ReadonlySet<string> = new Set<CaseStage>([
  'new-lead', 'invited', 'onboarding', 'intake-submitted', 'documents-in-progress',
  'in-service', 'invoice-sent', 'paid', 'overdue', 'completed', 'archived',
]);

export function stageLabelHe(stage: string): string {
  return STAGE_LABELS_HE[stage as CaseStage] ?? stage;
}
