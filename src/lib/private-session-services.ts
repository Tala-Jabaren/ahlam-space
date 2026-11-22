import { ar } from '@/i18n/ar'
import { en } from '@/i18n/en'
import { privateSessionDetailsAr, privateSessionDetailsEn } from '@/i18n/private-session-details'
import { PRIVATE_SESSION_HOURLY_PRICE, SOUND_HEALING_SESSION_PRICE } from './private-session-details'

export const privateSessionImages = [
  { path: '/images/about2.png', label: 'صورة أحلام' },
  { path: '/member/yoga-class.png', label: 'صورة اليوغا' },
  { path: '/member/fitness-class.png', label: 'صورة الحركة' },
] as const

export type PrivateSessionService = {
  id: number
  title_ar: string
  title_en: string | null
  description_ar: string
  description_en: string | null
  image: string
  price: number | null
  hourly: boolean
  duration_ar: string | null
  duration_en: string | null
}

export const defaultPrivateSessionServices: PrivateSessionService[] = ar.privateSessions.services.map((item, index) => ({
  id: index + 1,
  title_ar: index === 2 ? privateSessionDetailsAr.title : item.title,
  title_en: index === 2 ? privateSessionDetailsEn.title : en.privateSessions.services[index].title,
  description_ar: item.description,
  description_en: en.privateSessions.services[index].description,
  image: privateSessionImages[index].path,
  price: index === 2 ? PRIVATE_SESSION_HOURLY_PRICE : index === 1 ? SOUND_HEALING_SESSION_PRICE : null,
  hourly: index === 2,
  duration_ar: index === 2 ? privateSessionDetailsAr.duration : index === 1 ? privateSessionDetailsAr.soundDuration : null,
  duration_en: index === 2 ? privateSessionDetailsEn.duration : index === 1 ? privateSessionDetailsEn.soundDuration : null,
}))
