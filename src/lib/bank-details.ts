// Single source of truth for the bank transfer details shown to customers
// after placing an order, buying a course, or booking a paid session.
// Replace the placeholders with the real account details before launch.
export const bankDetails = {
  accountHolder: 'احلام حسين محمد حامد',
  bankName: 'بنك فلسطين',
  accountNumber: 'PS47PALS046208304500993000000',
}

const PLACEHOLDER_BANK_NAME = 'اسم البنك'
const PLACEHOLDER_ACCOUNT_NUMBER = 'رقم الحساب / IBAN'

// True whenever the real values haven't been filled in yet. Exported so
// payment-confirmation-block.tsx can show an unmissable on-page warning
// instead of quietly sending customers fake payment instructions.
export const bankDetailsArePlaceholders =
  bankDetails.bankName === PLACEHOLDER_BANK_NAME ||
  bankDetails.accountNumber === PLACEHOLDER_ACCOUNT_NUMBER

// NODE_ENV is 'production' for every deployed Vercel environment (both
// Production and Preview - only `next dev` is 'development'), so this fires
// on preview deploys too instead of only the real launch. It only warns -
// it never throws, so it can't break a build or crash the page for a real
// customer; the on-page banner above is what actually stops a silent launch.
if (process.env.NODE_ENV === 'production' && bankDetailsArePlaceholders) {
  console.error(
    '[bank-details] WARNING: placeholder bank details are still in place. ' +
      'Replace bankName/accountNumber in src/lib/bank-details.ts with the real account before taking this live.'
  )
}
