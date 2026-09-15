import { createRepository } from './baseRepository'
export const activityRepository=createRepository('fitlife_activities',{dateColumn:'started_at'})
export const activityMediaRepository=createRepository('fitlife_activity_media')
