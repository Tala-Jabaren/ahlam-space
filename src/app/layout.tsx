import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { CartProvider } from '@/lib/cart/cart-context'
import { dirFor } from '@/i18n/config'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo'
import './globals.css'

const trueArabic = localFont({
  variable: '--font-true-arabic',
  display: 'swap',
  src: [
    {
      path: '../../public/fonts/TrueArabic-Thin.otf',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Extralight.otf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Semibold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Bold.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Extrabold.otf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TrueArabic-Black.otf',
      weight: '900',
      style: 'normal',
    },
  ],
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.seo.defaultTitle,
      template: `%s | ${t.seo.siteName}`,
    },
    description: t.seo.defaultDescription,
    openGraph: {
      siteName: t.seo.siteName,
      locale: locale === 'ar' ? 'ar_PS' : 'en_US',
      type: 'website',
      images: [{ url: DEFAULT_OG_IMAGE }],
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${trueArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
