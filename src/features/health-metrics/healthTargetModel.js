export const TARGET_TYPES = [
  { value: 'minimum', label: 'Minimum' },
  { value: 'target', label: 'Target' },
  { value: 'range', label: 'Range' },
]

export const HEALTH_CATEGORIES = [
  'Recovery',
  'Sleep',
  'Cardiovascular',
  'Body Composition',
  'Metabolic',
  'Mobility',
  'Nutrition',
  'Mental Wellbeing',
  'Exercise Related',
  'Medical',
  'General Wellbeing',
  'Custom',
  'Uncategorized',
]

export function normaliseTarget(metric = {}) {
  const type = metric.target_type || (metric.range_min != null || metric.range_max != null ? 'range' : 'target')
  return {
    target_type: type,
    minimum_value: metric.minimum_value ?? metric.minimum ?? null,
    target_value: metric.target_value ?? metric.target ?? null,
    maximum_value: metric.maximum_value ?? metric.maximum ?? null,
    target_tolerance: metric.target_tolerance ?? null,
    baseline_type: metric.baseline_type || 'manual',
    baseline_value: metric.baseline_value ?? metric.baseline ?? null,
  }
}

export function metricStatus(metric, rawValue) {
  const value = Number(rawValue)
  if (!Number.isFinite(value)) return { key: 'no-data', label: 'No data', level: 0 }
  const model = normaliseTarget(metric)
  if (model.target_type === 'minimum') {
    const minimum = Number(model.minimum_value ?? model.target_value)
    if (!Number.isFinite(minimum)) return { key: 'recorded', label: 'Recorded', level: 2 }
    return value >= minimum
      ? { key: 'reached', label: 'Minimum reached', level: value > minimum ? 3 : 2 }
      : { key: 'below', label: 'Below minimum', level: 1 }
  }
  if (model.target_type === 'range') {
    const minimum = Number(model.minimum_value)
    const maximum = Number(model.maximum_value)
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return { key: 'recorded', label: 'Recorded', level: 2 }
    if (value < minimum) return { key: 'below', label: 'Below range', level: 1 }
    if (value > maximum) return { key: 'above', label: 'Above range', level: 1 }
    return { key: 'in-range', label: 'In range', level: 3 }
  }
  const target = Number(model.target_value)
  const tolerance = Number(model.target_tolerance || 0)
  if (!Number.isFinite(target)) return { key: 'recorded', label: 'Recorded', level: 2 }
  const difference = Math.abs(value - target)
  if (difference <= tolerance) return { key: 'reached', label: 'Target reached', level: 3 }
  const ratio = target ? difference / Math.abs(target) : difference
  return ratio <= 0.1
    ? { key: 'near', label: 'Near target', level: 2 }
    : { key: value > target ? 'above' : 'below', label: value > target ? 'Above target' : 'Below target', level: 1 }
}

export function targetDescription(metric) {
  const model = normaliseTarget(metric)
  const unit = metric.unit ? ` ${metric.unit}` : ''
  if (model.target_type === 'minimum') return `Minimum: ${model.minimum_value ?? model.target_value ?? 'not set'}${unit}`
  if (model.target_type === 'range') return `Range: ${model.minimum_value ?? '—'}–${model.maximum_value ?? '—'}${unit}`
  return `Target: ${model.target_value ?? 'not set'}${unit}`
}
