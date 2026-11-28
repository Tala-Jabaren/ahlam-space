'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClassWeekRefresh({ at }: { at: string }) {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => router.refresh(), Math.max(0, Date.parse(at) - Date.now() + 1000))
    return () => window.clearTimeout(timer)
  }, [at, router])

  return null
}
