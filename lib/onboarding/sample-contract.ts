import type { TemplateContract } from '@/lib/onboarding/types';

/** Starting point only. The business must review and adapt it; it is not legal advice. */
export const SAMPLE_CONTRACT: TemplateContract = {
  titleHe: 'הסכם שירות',
  titleEn: 'Service agreement',
  bodyHe: [
    'הסכם זה נערך ביום {{date}} בין {{business_name}} ("נותן השירות") לבין {{client_name}} ("הלקוח").',
    '1. השירות: נותן השירות יספק ללקוח את השירותים שסוכמו בין הצדדים, בהתאם לפרטים שמסר הלקוח בטופס הקליטה.',
    '2. מסמכים ומידע: הלקוח ימסור מידע נכון ומלא ויעביר את המסמכים הנדרשים במועד. עיכוב במסירתם עלול לדחות את לוחות הזמנים.',
    '3. תשלום: התמורה ומועדי התשלום יהיו כפי שסוכמו. חשבונית תישלח ללקוח, ותשלום שלא יבוצע במועד יזכה בתזכורת.',
    '4. סודיות: נותן השירות ישמור בסודיות את המידע והמסמכים שיתקבלו מהלקוח וישתמש בהם לצורך מתן השירות בלבד.',
    '5. ביטול: כל צד רשאי לסיים את ההתקשרות בהודעה בכתב. עבודה שבוצעה עד מועד הסיום תשולם.',
    'בחתימתו מאשר הלקוח שקרא את ההסכם והוא מסכים לתנאיו.',
  ].join('\n\n'),
  bodyEn: [
    'This agreement is made on {{date}} between {{business_name}} (the "Provider") and {{client_name}} (the "Client").',
    '1. Services: the Provider will deliver the services agreed between the parties, based on the details the Client gave in the onboarding form.',
    '2. Information and documents: the Client will provide accurate, complete information and the required documents on time. Delays may push back the schedule.',
    '3. Payment: fees and payment dates are as agreed. An invoice will be sent to the Client; late payments will receive a reminder.',
    '4. Confidentiality: the Provider will keep the Client\'s information and documents confidential and use them only to deliver the services.',
    '5. Termination: either party may end the engagement with written notice. Work completed up to that date will be paid for.',
    'By signing, the Client confirms they have read and accept this agreement.',
  ].join('\n\n'),
};
