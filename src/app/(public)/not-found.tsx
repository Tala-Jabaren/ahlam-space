import Link from 'next/link'
import { getT } from '@/i18n/get-t'

export default async function PublicNotFound() {
  const { t, dir } = await getT()

  return (
    <div
      dir={dir}
      className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-20 text-center"
    >
      <p className="font-serif text-7xl text-[#617A55]">404</p>
      <h1 className="mt-4 font-serif text-3xl text-[#25311f] sm:text-4xl">
        {t.notFound.heading}
      </h1>
      <p className="mt-3 max-w-md text-base leading-7 text-[#4f5d49]">
        {t.notFound.description}
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#617A55] px-7 py-3 text-sm font-semibold text-[#F7F6F0] transition-colors hover:bg-[#617A55]/90"
      >
        {t.notFound.backHome}
      </Link>
    </div>
  )
}
