import { createRepository } from './baseRepository'
export const fastingRepository=createRepository('fitlife_fasting_sessions',{dateColumn:'started_at'})
