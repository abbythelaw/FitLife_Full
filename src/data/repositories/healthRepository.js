import { createRepository } from './baseRepository'
export const metricDefinitionRepository=createRepository('fitlife_metric_definitions',{dateColumn:'created_at'})
export const healthRepository=createRepository('fitlife_metric_observations',{dateColumn:'observed_at'})
