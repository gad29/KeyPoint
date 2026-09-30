export interface MissingDocsMessageInput {
  clientName: string;
  businessName: string;
  missing: string[];
  link: string;
  language: 'he' | 'en';
}

export function buildMissingDocsMessage({ clientName, businessName, missing, link, language }: MissingDocsMessageInput) {
  const first = clientName.trim().split(/\s+/)[0] || clientName;
  const list = missing.map((item) => `• ${item}`).join('\n');
  if (language === 'en') {
    return [
      `Hi ${first},`,
      `To keep things moving we still need:`,
      list,
      ``,
      `You can upload them here: ${link}`,
      ``,
      `Thanks, ${businessName}`,
    ].join('\n');
  }
  return [
    `שלום ${first},`,
    `כדי שנוכל להמשיך בטיפול, חסרים לנו עדיין:`,
    list,
    ``,
    `אפשר להעלות אותם כאן: ${link}`,
    ``,
    `תודה, ${businessName}`,
  ].join('\n');
}

/** wa.me needs international digits only; Israeli local numbers (05x…) become 9725x…. */
export function whatsappNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `972${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}
