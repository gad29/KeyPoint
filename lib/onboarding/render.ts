import type { TemplateContract } from '@/lib/onboarding/types';

// Browser-safe: used by the wizard preview and by the server when recording the signed text.
export interface ContractContext {
  clientName: string;
  businessName: string;
  email?: string;
  phone?: string;
  answers?: Record<string, unknown>;
  date?: Date;
}

/** Fills {{placeholders}}. Unknown placeholders are left visible so the business notices them. */
export function renderContract(contract: TemplateContract, language: 'en' | 'he', ctx: ContractContext) {
  const date = (ctx.date ?? new Date()).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-GB');
  const values: Record<string, string> = {
    client_name: ctx.clientName,
    business_name: ctx.businessName,
    email: ctx.email || '',
    phone: ctx.phone || '',
    date,
  };
  for (const [key, value] of Object.entries(ctx.answers ?? {})) {
    if (typeof value === 'string' || typeof value === 'number') values[key] ??= String(value);
  }
  const fill = (text: string) => text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
  return {
    title: fill(language === 'he' ? contract.titleHe : contract.titleEn),
    body: fill(language === 'he' ? contract.bodyHe : contract.bodyEn),
  };
}
