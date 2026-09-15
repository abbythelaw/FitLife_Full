const PERIOD_DAYS = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 }

const numberValue = row => Number(
  row?.normalized_value ?? row?.value ?? row?.reading ?? row?.result
)

export const readingDate = row =>
  row?.normalized_date ||
  row?.date ||
  String(row?.observed_at || row?.recorded_at || '').slice(0, 10)

export const readingTime = row =>
  row?.normalized_time ||
  row?.time ||
  String(row?.observed_at || row?.recorded_at || '').slice(11, 16)

const rawUnit = row => String(
  row?.normalized_unit ?? row?.unit ?? row?.display_unit ?? ''
).trim()

const normalUnit = unit => String(unit || '')
  .trim()
  .toLowerCase()
  .replaceAll(' ', '')

export function metricDefaultUnit(metric) {
  if (metric === 'glucose') return 'mmol/L'
  if (metric === 'rhr') return 'bpm'
  if (metric === 'weight') return 'kg'
  if (metric === 'hba1c') return '%'
  return ''
}

export function displayUnit(row, metric) {
  return rawUnit(row) || metricDefaultUnit(metric)
}

function convertGlucose(value, from, to) {
  const source = normalUnit(from)
  const target = normalUnit(to)
  if (source === target) return value
  if (source === 'mmol/l' && target === 'mg/dl') return value * 18.0182
  if (source === 'mg/dl' && target === 'mmol/l') return value / 18.0182
  return null
}

function convertWeight(value, from, to) {
  const source = normalUnit(from)
  const target = normalUnit(to)
  if (source === target) return value
  if (source === 'lb' && target === 'kg') return value * 0.45359237
  if (source === 'kg' && target === 'lb') return value / 0.45359237
  return null
}

export function normalizedMetricValue(row, metric, targetUnit) {
  const value = numberValue(row)
  if (!Number.isFinite(value)) return null
  const sourceUnit = displayUnit(row, metric)
  if (!targetUnit || normalUnit(sourceUnit) === normalUnit(targetUnit)) return value
  if (metric === 'glucose') return convertGlucose(value, sourceUnit, targetUnit)
  if (metric === 'weight') return convertWeight(value, sourceUnit, targetUnit)
  return value
}

function preferredUnit(rows, metric) {
  const counts = new Map()
  for (const row of rows) {
    const unit = displayUnit(row, metric)
    if (unit) counts.set(unit, (counts.get(unit) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    || metricDefaultUnit(metric)
}

function localDate(value) {
  const [y, m, d] = String(value).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

function weekKey(date) {
  const d = localDate(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return readingDate({ date: [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-') })
}

function monthKey(date) {
  return String(date).slice(0, 7)
}

function bucketKey(date, period) {
  if (period === '90D') return weekKey(date)
  if (period === '1Y') return monthKey(date)
  return date
}

function uniqueRows(rows) {
  const ids = new Set()
  return rows.filter((row, index) => {
    const identity = row?.attachment_id || row?.id
    if (!identity) return true
    const key = String(identity)
    if (ids.has(key)) return false
    ids.add(key)
    return true
  })
}

export function aggregateMetricReadings(rows = [], metric, period = '30D', now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period] + 1)

  const dated = uniqueRows(rows)
    .filter(row => readingDate(row))
    .filter(row => localDate(readingDate(row)) >= cutoff)

  const unit = preferredUnit(dated, metric)
  const valid = dated
    .map(row => ({
      row,
      date: readingDate(row),
      time: readingTime(row),
      value: normalizedMetricValue(row, metric, unit),
    }))
    .filter(item => Number.isFinite(item.value))
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))

  const groups = new Map()
  for (const item of valid) {
    const key = bucketKey(item.date, period)
    const list = groups.get(key) || []
    list.push(item)
    groups.set(key, list)
  }

  const buckets = [...groups.entries()].map(([key, items]) => {
    const values = items.map(item => item.value)
    return {
      key,
      startDate: items[0].date,
      endDate: items.at(-1).date,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      count: values.length,
      readings: items,
    }
  })

  const values = valid.map(item => item.value)
  const summary = values.length ? {
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    count: values.length,
    firstDate: valid[0].date,
    lastDate: valid.at(-1).date,
  } : null

  return {
    metric,
    period,
    unit,
    rawReadings: valid,
    buckets,
    summary,
    bucketLabel: period === '90D' ? 'Weekly average' : period === '1Y' ? 'Monthly average' : 'Daily average',
  }
}

export function aggregateMetricForDate(rows = [], metric, date) {
  const selected = uniqueRows(rows).filter(row => readingDate(row) === date)
  const unit = preferredUnit(selected, metric)
  const readings = selected
    .map(row => ({ row, value: normalizedMetricValue(row, metric, unit), time: readingTime(row) }))
    .filter(item => Number.isFinite(item.value))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
  if (!readings.length) return { unit, readings: [], summary: null }
  const values = readings.map(item => item.value)
  return {
    unit,
    readings,
    summary: {
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      count: values.length,
    },
  }
}

export function metricDecimals(metric, unit) {
  if (metric === 'glucose' && normalUnit(unit) === 'mmol/l') return 1
  if (metric === 'weight' || metric === 'hba1c') return 1
  return 0
}
