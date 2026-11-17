'use client'

import { useT } from '@/i18n/i18n-context'
import { floatingContactCopy } from '@/i18n/floating-contact'
import styles from './floating-whatsapp.module.css'

export default function FloatingWhatsApp({ href, member = false }: { href: string; member?: boolean }) {
  const { locale, dir } = useT()
  const copy = floatingContactCopy[locale]
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${copy.label} — ${copy.opens}`} className={`${styles.launcher} ${member ? styles.member : ''}`} data-whatsapp-contact>
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path d="M21 11.5a9 9 0 0 1-13.3 7.9L3 21l1.6-4.6A9 9 0 1 1 21 11.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.75 13.5c-.25-.13-1.5-.74-1.73-.82s-.4-.13-.57.13-.65.82-.8.99-.29.19-.54.06c-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5l.38-.45c.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.88-.2-.5-.41-.44-.57-.45h-.49c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.11s.9 2.45 1.03 2.62c.13.17 1.78 2.71 4.31 3.8.6.26 1.07.42 1.43.53.6.19 1.15.16 1.58.1.48-.08 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.48-.29Z" fill="currentColor" />
    </svg>
    <span className={styles.tooltip} aria-hidden="true"><bdi dir={dir}>{copy.tooltip}</bdi></span>
  </a>
}
