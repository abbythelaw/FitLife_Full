
const NUTRITION_KEY = 'fitlife-nutrition-daily'
const HEALTH_KEY = 'fitlife-health-readings'

function parse(raw, fallback = []) {
  try {
    return JSON.parse(raw) ?? fallback
  } catch {
    return fallback
  }
}

export function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

export function listNutritionDays() {
  const rows = parse(
    localStorage.getItem(NUTRITION_KEY),
    []
  )

  if (!Array.isArray(rows)) return []

  return rows
    .filter(row => row?.date)
    .sort((left, right) =>
      String(right.date).localeCompare(String(left.date))
    )
}

export function saveNutritionDay(input) {
  const date = input.date || localDateKey()

  if (!date) {
    throw new Error('A valid nutrition date is required.')
  }

  if (date > localDateKey()) {
    throw new Error('Nutrition summaries cannot use a future date.')
  }

  const row = {
    id: input.id || `nutrition:${date}`,
    date,
    calories: Math.max(0, Number(input.calories || 0)),
    protein_g: Math.max(0, Number(input.protein_g || 0)),
    carbs_g: Math.max(0, Number(input.carbs_g || 0)),
    fat_g: Math.max(0, Number(input.fat_g || 0)),
    fiber_g: Math.max(0, Number(input.fiber_g || 0)),
    sugar_g: Math.max(0, Number(input.sugar_g || 0)),
    source: input.source || 'MyFitnessPal',
    completeness: input.completeness || 'Complete day',
    notes: String(input.notes || '').trim(),
    glucose_reading_ids: Array.isArray(input.glucose_reading_ids)
      ? input.glucose_reading_ids
      : [],
    weight_reading_id: input.weight_reading_id || null,
    rhr_reading_id: input.rhr_reading_id || null,
    hba1c_reading_id: input.hba1c_reading_id || null,
    fasting_session_id: input.fasting_session_id || null,
    updated_at: new Date().toISOString()
  }

  const next = [
    row,
    ...listNutritionDays().filter(item => item.date !== date)
  ]

  localStorage.setItem(
    NUTRITION_KEY,
    JSON.stringify(next)
  )

  /*
   * Nutrition summaries are analysis inputs only.
   * Deliberately do not write to fitlife-log-history or My Life.
   */
  window.dispatchEvent(
    new CustomEvent('fitlife:nutrition-changed', {
      detail: next
    })
  )

  return row
}

export function deleteNutritionDay(date) {
  const next = listNutritionDays().filter(
    item => item.date !== date
  )

  localStorage.setItem(
    NUTRITION_KEY,
    JSON.stringify(next)
  )

  window.dispatchEvent(
    new CustomEvent('fitlife:nutrition-changed', {
      detail: next
    })
  )

  return next
}

function readingDate(row) {
  return (
    row.record_date ||
    row.entry_date ||
    row.local_date ||
    row.date ||
    String(row.occurred_at || row.created_at || '').slice(0, 10)
  )
}

function readingMetric(row) {
  return String(
    row.metric_id ||
    row.metric_key ||
    row.metric ||
    row.type ||
    row.name ||
    ''
  ).toLowerCase()
}

function readingValue(row) {
  const raw =
    row.value ??
    row.numeric_value ??
    row.current ??
    row.reading ??
    row.amount

  const number = Number(raw)
  return Number.isFinite(number) ? number : null
}

export function listHealthReadings() {
  const rows = parse(
    localStorage.getItem(HEALTH_KEY),
    []
  )

  if (!Array.isArray(rows)) return []

  return rows
    .map(row => ({
      ...row,
      normalized_date: readingDate(row),
      normalized_metric: readingMetric(row),
      normalized_value: readingValue(row)
    }))
    .filter(row =>
      row.normalized_date &&
      row.normalized_value !== null
    )
}

export function readingsForMetric(metric) {
  const aliases = {
    glucose: [
      'glucose',
      'blood glucose',
      'blood-glucose',
      'blood_glucose'
    ],
    rhr: [
      'rhr',
      'resting heart rate',
      'resting-heart-rate',
      'resting_heart_rate'
    ],
    weight: [
      'weight',
      'body weight',
      'body-weight',
      'body_weight'
    ],
    hba1c: [
      'hba1c',
      'a1c',
      'haemoglobin a1c',
      'hemoglobin a1c'
    ]
  }

  const accepted = aliases[metric] || [metric]

  return listHealthReadings().filter(row =>
    accepted.some(alias =>
      row.normalized_metric === alias ||
      row.normalized_metric.includes(alias)
    )
  )
}

export function macroContribution(row) {
  const proteinCalories = Number(row?.protein_g || 0) * 4
  const carbohydrateCalories = Number(row?.carbs_g || 0) * 4
  const fatCalories = Number(row?.fat_g || 0) * 9
  const macroCalories =
    proteinCalories +
    carbohydrateCalories +
    fatCalories

  if (!macroCalories) {
    return {
      protein: 0,
      carbs: 0,
      fat: 0,
      macroCalories: 0
    }
  }

  return {
    protein: proteinCalories / macroCalories * 100,
    carbs: carbohydrateCalories / macroCalories * 100,
    fat: fatCalories / macroCalories * 100,
    macroCalories
  }
}


export const ATTACHABLE_METRICS = [
  {
    key: 'glucose',
    label: 'Blood glucose',
    unit: 'mg/dL',
    icon: '🩸',
    aliases: [
      'glucose',
      'blood glucose',
      'blood-glucose',
      'blood_glucose'
    ]
  },
  {
    key: 'weight',
    label: 'Weight',
    unit: 'kg',
    icon: '⚖️',
    aliases: [
      'weight',
      'body weight',
      'body-weight',
      'body_weight'
    ]
  },
  {
    key: 'rhr',
    label: 'Resting heart rate',
    unit: 'bpm',
    icon: '❤️',
    aliases: [
      'rhr',
      'resting heart rate',
      'resting-heart-rate',
      'resting_heart_rate'
    ]
  },
  {
    key: 'hba1c',
    label: 'HbA1c',
    unit: '%',
    icon: '🧪',
    aliases: [
      'hba1c',
      'a1c',
      'haemoglobin a1c',
      'hemoglobin a1c'
    ]
  }
]

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function healthReadingId(row, index = 0) {
  return String(
    row.id ||
    row.record_id ||
    row.reading_id ||
    row.client_entry_id ||
    row.source_id ||
    [
      healthReadingMetric(row),
      healthReadingDate(row),
      healthReadingTime(row),
      healthReadingValue(row),
      index
    ].join(':')
  )
}

function healthReadingMetric(row) {
  return normalizeText(
    row.metric_id ||
    row.metric_key ||
    row.metric ||
    row.type ||
    row.name ||
    row.label ||
    row.category
  )
}

function healthReadingDate(row) {
  return String(
    row.record_date ||
    row.entry_date ||
    row.local_date ||
    row.date ||
    row.reading_date ||
    row.occurred_at ||
    row.created_at ||
    ''
  ).slice(0, 10)
}

function healthReadingTime(row) {
  const explicit =
    row.time ||
    row.record_time ||
    row.entry_time ||
    row.reading_time

  if (explicit) return String(explicit).slice(0, 5)

  const timestamp = String(
    row.occurred_at ||
    row.created_at ||
    row.updated_at ||
    ''
  )

  return timestamp.match(/T(\d{2}:\d{2})/)?.[1] || ''
}

function healthReadingValue(row) {
  const raw =
    row.value ??
    row.numeric_value ??
    row.current ??
    row.reading ??
    row.amount ??
    row.result

  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function metricDefinition(metric) {
  return ATTACHABLE_METRICS.find(item => item.key === metric)
}

function matchesMetric(row, metric) {
  const definition = metricDefinition(metric)
  if (!definition) return false

  const normalized = healthReadingMetric(row)

  return definition.aliases.some(alias => {
    const candidate = normalizeText(alias)
    return normalized === candidate || normalized.includes(candidate)
  })
}

export function normalizedHealthReadings() {
  const candidates = [
    'fitlife-health-readings',
    'fitlife-health-metrics-readings',
    'fitlife-health-metrics',
    'health-readings'
  ]

  const byId = new Map()

  for (const key of candidates) {
    const rows = parse(localStorage.getItem(key), [])
    if (!Array.isArray(rows)) continue

    rows.forEach((row, index) => {
      if (!row || row.deleted_at) return

      const value = healthReadingValue(row)
      const date = healthReadingDate(row)
      if (value === null || !date) return

      const id = healthReadingId(row, index)

      byId.set(id, {
        ...row,
        attachment_id: id,
        normalized_metric: healthReadingMetric(row),
        normalized_date: date,
        normalized_time: healthReadingTime(row),
        normalized_value: value,
        normalized_unit:
          row.unit ||
          row.measurement_unit ||
          row.value_unit ||
          ''
      })
    })
  }

  return [...byId.values()].sort((left, right) => {
    const leftStamp = `${left.normalized_date}T${left.normalized_time || '00:00'}`
    const rightStamp = `${right.normalized_date}T${right.normalized_time || '00:00'}`
    return rightStamp.localeCompare(leftStamp)
  })
}

export function readingsAvailableForAttachment(metric, date) {
  const rows = normalizedHealthReadings().filter(row =>
    matchesMetric(row, metric)
  )

  if (metric === 'hba1c') {
    const sameOrEarlier = rows.filter(row =>
      row.normalized_date <= date
    )
    return sameOrEarlier.slice(0, 12)
  }

  return rows.filter(row => row.normalized_date === date)
}

export function resolveAttachedReading(readingId) {
  if (!readingId) return null

  return normalizedHealthReadings().find(row =>
    String(row.attachment_id) === String(readingId)
  ) || null
}

export function recommendedAttachmentIds(date) {
  const result = {}

  for (const metric of ATTACHABLE_METRICS) {
    const rows = readingsAvailableForAttachment(metric.key, date)

    if (metric.key === 'glucose') {
      const fasting = rows.find(row =>
        normalizeText(row.context || row.notes).includes('fasting')
      )
      const selected = fasting || (rows.length === 1 ? rows[0] : null)
      result.glucose_reading_ids = selected
        ? [selected.attachment_id]
        : []
      continue
    }

    const selected = rows.length ? rows[0] : null
    result[`${metric.key}_reading_id`] = selected?.attachment_id || null
  }

  return result
}

export function nutritionAttachments(row) {
  return {
    glucose_reading_ids: Array.isArray(row?.glucose_reading_ids)
      ? row.glucose_reading_ids
      : [],
    weight_reading_id: row?.weight_reading_id || null,
    rhr_reading_id: row?.rhr_reading_id || null,
    hba1c_reading_id: row?.hba1c_reading_id || null,
    fasting_session_id: row?.fasting_session_id || null
  }
}

export function updateNutritionAttachments(date, attachments) {
  const existing = listNutritionDays().find(row => row.date === date)

  if (!existing) {
    throw new Error(
      'Save the nutrition summary before attaching Health Metrics.'
    )
  }

  return saveNutritionDay({
    ...existing,
    ...nutritionAttachments(attachments)
  })
}

export function attachmentCoverage(row) {
  const attachments = nutritionAttachments(row)

  const attached = [
    attachments.glucose_reading_ids.length > 0,
    Boolean(attachments.weight_reading_id),
    Boolean(attachments.rhr_reading_id),
    Boolean(attachments.hba1c_reading_id)
  ].filter(Boolean).length

  return {
    attached,
    total: 4,
    percent: attached / 4 * 100
  }
}
