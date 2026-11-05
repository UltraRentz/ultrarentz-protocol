// utils/disposableEmails.ts
// Simple list and checker for disposable email domains (MVP)

const disposableDomains = [
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'tempmail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'fakeinbox.com',
  'sharklasers.com',
  'dispostable.com',
  'maildrop.cc',
  'mintemail.com',
  'throwawaymail.com',
  'moakt.com',
  'mytemp.email',
  'emailondeck.com',
  'spamgourmet.com',
  'mailnesia.com',
  'temp-mail.org',
  'tempail.com',
  // ...add more as needed
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && disposableDomains.includes(domain);
}
