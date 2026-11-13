'use client'

import { createContext, useContext } from 'react'
import { publicRoutes, type ExperienceRoutes } from '@/lib/experience-routes'

const ExperienceContext = createContext<ExperienceRoutes>(publicRoutes)

export function ExperienceProvider({ routes, children }: {
  routes: ExperienceRoutes
  children: React.ReactNode
}) {
  return <ExperienceContext.Provider value={routes}>{children}</ExperienceContext.Provider>
}

export function useExperienceRoutes() {
  return useContext(ExperienceContext)
}
