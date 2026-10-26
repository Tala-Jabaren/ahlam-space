'use client'

import { useState } from 'react'
import { useT } from '@/i18n/i18n-context'
import { meditationsAr } from '@/i18n/meditations'

export default function MeditationPlayer({ src }: { src: string }) {
  const { t } = useT()
  const [failed, setFailed] = useState(false)
  const copy = t.meditations ?? meditationsAr
  return <div className="rounded-lg border border-[#617A55]/15 bg-[#D6E2B6]/25 p-5 sm:p-6">
    <audio aria-label={copy.audio} src={src} controls controlsList="nodownload" preload="metadata"
      onError={() => setFailed(true)} className="w-full" />
    {failed && <p role="alert" className="mt-4 text-sm leading-7">{copy.audioError}</p>}
  </div>
}
