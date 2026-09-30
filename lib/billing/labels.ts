import type { ChaseTone, InvoiceStatus } from '@/data/domain';

export const INVOICE_STATUS_LABELS: Record<'he' | 'en', Record<InvoiceStatus, string>> = {
  he: { draft: 'טיוטה', sent: 'נשלחה', partial: 'שולמה חלקית', paid: 'שולמה', overdue: 'באיחור', void: 'בוטלה' },
  en: { draft: 'Draft', sent: 'Sent', partial: 'Partly paid', paid: 'Paid', overdue: 'Overdue', void: 'Cancelled' },
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, '' | 'good' | 'warn' | 'danger'> = {
  draft: '',
  sent: '',
  partial: 'warn',
  paid: 'good',
  overdue: 'danger',
  void: '',
};

export const CHASE_TONE_LABELS: Record<ChaseTone, string> = {
  friendly: 'ידידותית',
  reminder: 'תזכורת',
  firm: 'תקיפה',
  final: 'אחרונה',
};
