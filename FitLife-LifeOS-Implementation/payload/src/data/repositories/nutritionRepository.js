import { createRepository } from './baseRepository'
export const nutritionRepository=createRepository('fitlife_nutrition_days',{dateColumn:'record_date'})
export const nutritionTargetRepository=createRepository('fitlife_nutrition_targets',{dateColumn:'effective_from'})
