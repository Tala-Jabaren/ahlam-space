import { bankDetails, bankDetailsArePlaceholders } from '@/lib/bank-details'

// Single source of truth for every public-facing contact detail and the
// bank-transfer instructions - every page/email that needs one of these
// should import it from here instead of hardcoding its own copy, so there
// is only ever one place to update when a number/address changes.
//
// No secrets live here (none of this is sensitive - it's the same info a
// customer could get by calling the business). EMAIL_FROM stays an env var
// (src/lib/email/mailer.ts) - it is not part of this file on purpose.

export const PHONE_DISPLAY = '+972 56-699-3658'
export const PHONE_E164 = '+972566993658'
export const WHATSAPP_URL = 'https://wa.me/972566993658'

// Public-facing support address for legal pages and customer emails.
export const SUPPORT_EMAIL = 'ahlamspace@ahlamspace.com'

// Ahlam's own contact details, shown in the site footer - distinct from
// SUPPORT_EMAIL above, which stays the address used for legal pages and
// automated customer emails.
export const CONTACT_EMAIL = 'nmi.ahlam@gmail.com'
export const INSTAGRAM_URL = 'https://www.instagram.com/ahlam_space_/'

// bankName/accountHolder/iban come from src/lib/bank-details.ts (the
// existing, already-reviewed source of truth - including its exact
// "احلام حسين محمد حامد" spelling, left as-is pending the owner confirming
// the legally correct one) - this just adds the one new field (note) the
// trip/booking/order payment instructions also need, so every consumer can
// import a single BANK object instead of reaching into two files.
export const BANK = {
  bankName: bankDetails.bankName,
  accountHolder: bankDetails.accountHolder,
  iban: bankDetails.accountNumber,
  note: 'التحويل ممكن كمان على رقم الجوال +972 56-699-3658 (عبر تطبيق البنك)',
}

export { bankDetailsArePlaceholders }
