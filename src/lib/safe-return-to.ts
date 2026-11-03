// Shared by the login and sign-up pages so their post-auth redirect
// validation can't drift between the two. Only a same-origin relative path
// is ever safe to hand to router.push/replace here:
//   - must start with exactly one '/' - "//evil.com" is a protocol-relative
//     URL browsers resolve to a different host, and an absolute URL never
//     starts with a single '/' at all, so both are rejected by this alone.
//   - no backslash ('\') anywhere - some URL parsers (and some browsers'
//     history/navigation handling) treat '\' as equivalent to '/', which
//     can smuggle a second "//" past a naive startsWith('//') check.
//   - no control character (U+0000-U+001F) anywhere - these can be used to
//     smuggle a stray newline/CR or get silently stripped by a downstream
//     parser in a way that changes what the string actually points to.
const SAFE_RETURN_TO_RE = /^\/(?!\/)[^\\\u0000-\u001f]*$/

export function getSafeReturnTo(value: string | null): string | null {
  return value !== null && SAFE_RETURN_TO_RE.test(value) ? value : null
}
