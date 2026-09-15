import { createRepository } from './baseRepository'
export const habitRepository=createRepository('fitlife_habits')
export const habitLogRepository=createRepository('fitlife_habit_logs',{dateColumn:'record_date'})
