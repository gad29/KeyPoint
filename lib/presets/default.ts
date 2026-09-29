import type { Preset } from '@/lib/presets/types';

export const defaultPreset: Preset = {
  id: 'default',
  name: 'Small business',
  nameHe: 'עסק קטן',
  tagline: 'Onboard a client, run the job, get paid — all in one place.',
  taglineHe: 'קליטת לקוח, ניהול העבודה וקבלת תשלום — הכול במקום אחד.',
  features: {
    bankOffers: false,
    appraiser: false,
    mortgageColumns: false,
    invoicing: true,
  },
  financeCategories: ['שירות', 'מקדמה', 'מוצרים', 'עמלה', 'שיווק', 'ספקים', 'הוצאה משרדית', 'מיסים ואגרות', 'אחר'],
  wizardSteps: [
    {
      key: 'contact',
      labelEn: 'Contact',
      labelHe: 'יצירת קשר',
      titleEn: 'Your details',
      titleHe: 'הפרטים שלך',
      descriptionEn: 'So we can reach you and prepare your file.',
      descriptionHe: 'כדי שנוכל להגיע אליך ולהכין את התיק.',
      fields: [
        { key: 'fullName', labelEn: 'Full name', labelHe: 'שם מלא', kind: 'text', required: true },
        { key: 'email', labelEn: 'Email', labelHe: 'אימייל', kind: 'email' },
        { key: 'phone', labelEn: 'Phone', labelHe: 'טלפון', kind: 'tel', required: true },
        {
          key: 'preferredChannel',
          labelEn: 'Preferred contact',
          labelHe: 'ערוץ מועדף',
          kind: 'select',
          options: [
            { value: 'whatsapp', labelEn: 'WhatsApp', labelHe: 'ווטסאפ' },
            { value: 'phone', labelEn: 'Phone call', labelHe: 'שיחה' },
            { value: 'email', labelEn: 'Email', labelHe: 'אימייל' },
          ],
        },
      ],
    },
    {
      key: 'service',
      labelEn: 'Service',
      labelHe: 'השירות',
      titleEn: 'What do you need?',
      titleHe: 'במה נוכל לעזור?',
      descriptionEn: 'A short description helps us prep for the first meeting.',
      descriptionHe: 'תיאור קצר יעזור לנו להתכונן לפגישה הראשונה.',
      fields: [
        { key: 'serviceType', labelEn: 'Service', labelHe: 'סוג השירות', kind: 'text' },
        { key: 'brief', labelEn: 'Brief', labelHe: 'תקציר', kind: 'textarea', placeholderEn: 'Tell us the goal, timeline, and anything we should know.', placeholderHe: 'ספרו על המטרה, לוחות הזמנים ומה חשוב שנדע.' },
        { key: 'budget', labelEn: 'Budget (optional)', labelHe: 'תקציב (לא חובה)', kind: 'text' },
      ],
    },
    {
      key: 'consent',
      labelEn: 'Consent',
      labelHe: 'אישורים',
      titleEn: 'Consent',
      titleHe: 'אישורים',
      descriptionEn: 'Required to open your file.',
      descriptionHe: 'נדרש לפתיחת התיק.',
      fields: [
        { key: 'privacyAccepted', labelEn: 'I agree to the privacy policy.', labelHe: 'אני מאשר/ת את מדיניות הפרטיות.', kind: 'checkbox', required: true },
        { key: 'accuracyConfirmed', labelEn: 'I confirm the details above are accurate.', labelHe: 'אני מאשר/ת שהפרטים מעלה מדויקים.', kind: 'checkbox', required: true },
      ],
    },
  ],
};
