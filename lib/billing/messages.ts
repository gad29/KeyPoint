import type { ChaseTone, InvoiceRecord } from '@/data/domain';
import { balanceDue, formatMoney } from '@/lib/billing/money';

export type Lang = 'he' | 'en';

export interface MessageContext {
  invoice: InvoiceRecord;
  businessName: string;
  payUrl: string;
  language: Lang;
  daysOverdue?: number;
}

export interface DraftMessage {
  subject: string;
  body: string;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function formatDate(value: string | undefined, language: Lang) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-GB');
}

export function invoiceMessage({ invoice, businessName, payUrl, language }: MessageContext): DraftMessage {
  const total = formatMoney(balanceDue(invoice), invoice.currency, language);
  const due = formatDate(invoice.dueAt, language);
  const name = firstName(invoice.clientName);
  if (language === 'en') {
    return {
      subject: `Payment request #${invoice.number} from ${businessName}`,
      body: [
        `Hi ${name},`,
        `Thank you for working with us.`,
        ...(invoice.summary ? ['', invoice.summary, ''] : []),
        `Here is payment request #${invoice.number} for ${total}${due ? `, due by ${due}` : ''}.`,
        `View and pay: ${payUrl}`,
        ``,
        `Thanks, ${businessName}`,
      ].join('\n'),
    };
  }
  return {
    subject: `דרישת תשלום #${invoice.number} מ${businessName}`,
    body: [
      `שלום ${name},`,
      `תודה על העבודה המשותפת!`,
      ...(invoice.summary ? ['', invoice.summary, ''] : []),
      `מצורפת דרישת תשלום #${invoice.number} על סך ${total}${due ? `, לתשלום עד ${due}` : ''}.`,
      `לצפייה ותשלום: ${payUrl}`,
      ``,
      `תודה, ${businessName}`,
    ].join('\n'),
  };
}

/** Built-in reminder wording. Courteous at every step; the final one still offers to find a solution. */
export function reminderTemplate(tone: ChaseTone, ctx: MessageContext): DraftMessage {
  const { invoice, businessName, payUrl, language } = ctx;
  const balance = formatMoney(balanceDue(invoice), invoice.currency, language);
  const due = formatDate(invoice.dueAt, language);
  const days = Math.max(0, ctx.daysOverdue ?? 0);
  const name = firstName(invoice.clientName);
  const n = invoice.number;

  if (language === 'en') {
    const lines: Record<ChaseTone, [string, string[]]> = {
      friendly: [
        `A friendly reminder: payment request #${n}`,
        [`Just a quick reminder that payment request #${n} for ${balance} was due on ${due}.`, `You can pay here in a minute: ${payUrl}`, `If you've already paid, thank you, and please ignore this message.`],
      ],
      reminder: [
        `Reminder: payment request #${n} is still open`,
        [`Payment request #${n} for ${balance} is still open, ${days} days after the due date (${due}).`, `We'd appreciate settling it in the coming days: ${payUrl}`, `If something is unclear, just reply and we'll sort it out.`],
      ],
      firm: [
        `Payment request #${n}: balance of ${balance} outstanding`,
        [`As of today, ${balance} on payment request #${n} is still unpaid, ${days} days past the due date.`, `Please arrange payment within the next 7 days: ${payUrl}`, `If you need a payment plan, reply and we'll find one together.`],
      ],
      final: [
        `Final reminder: payment request #${n}`,
        [`This is our last reminder about payment request #${n} (${balance}, due ${due}).`, `Please pay or get back to us this week so we can resolve it together: ${payUrl}`],
      ],
    };
    const [subject, body] = lines[tone];
    return { subject, body: [`Hi ${name},`, ...body, ``, `Thanks, ${businessName}`].join('\n') };
  }

  const lines: Record<ChaseTone, [string, string[]]> = {
    friendly: [
      `תזכורת ידידותית: דרישת תשלום #${n}`,
      [`רק תזכורת קטנה — דרישת התשלום #${n} על סך ${balance} הייתה לתשלום עד ${due}.`, `אפשר לשלם בקלות כאן: ${payUrl}`, `אם כבר שילמת — תודה, ואפשר להתעלם מההודעה.`],
    ],
    reminder: [
      `תזכורת: דרישת תשלום #${n} עדיין פתוחה`,
      [`דרישת התשלום #${n} על סך ${balance} עדיין פתוחה, ${days} ימים אחרי מועד התשלום (${due}).`, `נשמח להסדרה בימים הקרובים: ${payUrl}`, `אם משהו לא ברור — אפשר פשוט להשיב להודעה ונסדר את זה.`],
    ],
    firm: [
      `דרישת תשלום #${n}: יתרה של ${balance} טרם שולמה`,
      [`נכון להיום, יתרה של ${balance} בדרישת התשלום #${n} טרם שולמה, ${days} ימים אחרי המועד.`, `נבקש להסדיר את התשלום בשבוע הקרוב: ${payUrl}`, `אם נוח יותר לחלק לתשלומים — השיבו ונמצא פתרון יחד.`],
    ],
    final: [
      `תזכורת אחרונה: דרישת תשלום #${n}`,
      [`זו תזכורת אחרונה לגבי דרישת התשלום #${n} (${balance}, לתשלום עד ${due}).`, `נשמח אם תסדירו את התשלום או תחזרו אלינו עוד השבוע כדי שנמצא פתרון יחד: ${payUrl}`],
    ],
  };
  const [subject, body] = lines[tone];
  return { subject, body: [`שלום ${name},`, ...body, ``, `תודה, ${businessName}`].join('\n') };
}

/** wa.me deep link (international digits; Israeli 05x… becomes 9725x…). */
export function whatsappLink(phone: string | undefined, text: string) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `972${digits.slice(1)}`;
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
