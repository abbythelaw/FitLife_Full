import { useMemo } from 'react'
import './HealthMetricCardCompletion.css'

const READING_KEY = 'fitlife-health-readings-v2'
const FALLBACK_READING_KEY = 'fitlife-health-readings'

export const HEALTH_CATEGORY_STYLE = {
  Recovery: { icon: '🌿', color: '#70e236' },
  Sleep: { icon: '🌙', color: '#818cf8' },
  Cardiovascular: { icon: '❤️', color: '#fb7185' },
  'Body Composition': { icon: '⚖️', color: '#fbbf24' },
  Metabolic: { icon: '🩸', color: '#fb923c' },
  Mobility: { icon: '🦵', color: '#38bdf8' },
  Nutrition: { icon: '🍎', color: '#4ade80' },
  'Mental Wellbeing': { icon: '🧠', color: '#a78bfa' },
  'Exercise Related': { icon: '💪', color: '#22d3ee' },
  Medical: { icon: '🏥', color: '#ef4444' },
  'General Wellbeing': { icon: '✨', color: '#fde047' },
  Custom: { icon: '🙂', color: '#94a3b8' },
  Other: { icon: '🙂', color: '#94a3b8' },
  Uncategorized: { icon: '🙂', color: '#94a3b8' },
}

function readJson(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export function localDateKey(value) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const prefix = raw.match(/^(\d{4}-\d{2}-\d{2})T/)?.[1]
  if (prefix) return prefix
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function categoryStyle(category) {
  return HEALTH_CATEGORY_STYLE[category] || HEALTH_CATEGORY_STYLE.Uncategorized
}

export function readingStatus(metric, rawValue) {
  const value = Number(rawValue)
  if (!Number.isFinite(value)) return { key: 'no-data', label: 'No data', successful: false }
  if (metric.targetMode === 'range') {
    if (value < Number(metric.min)) return { key: 'below-range', label: 'Below range', successful: false }
    if (value > Number(metric.max)) return { key: 'above-range', label: 'Above range', successful: false }
    return { key: 'in-range', label: 'In range', successful: true }
  }
  if (metric.targetMode === 'minimum') {
    return value >= Number(metric.target)
      ? { key: 'met', label: 'Minimum reached', successful: true }
      : { key: 'partial', label: 'Below minimum', successful: false }
  }
  if (metric.targetMode === 'target') {
    return value === Number(metric.target)
      ? { key: 'met', label: 'Target reached', successful: true }
      : { key: value > Number(metric.target) ? 'above-range' : 'partial', label: value > Number(metric.target) ? 'Above target' : 'Below target', successful: false }
  }
  return { key: 'met', label: 'Recorded', successful: true }
}

export function readingsForMetric(metricId) {
  const primary = readJson(READING_KEY, [])
  const fallback = readJson(FALLBACK_READING_KEY, [])
  const rows = primary.length ? primary : fallback
  return rows
    .filter(row => String(row.metric_id) === String(metricId))
    .filter(row => {
      const savedDate = row.record_date || row.local_date || localDateKey(row.recorded_at || row.date)
      return savedDate && savedDate <= localDateKey(new Date())
    })
    .sort((a, b) => String(b.record_date || b.local_date || b.recorded_at).localeCompare(String(a.record_date || a.local_date || a.recorded_at)))
}

function rollingDays(readings, metric, count = 30) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const byDate = new Map()
  readings.forEach(row => {
    const savedDate = row.record_date || row.local_date || localDateKey(row.recorded_at || row.date)
    if (!savedDate) return
    const previous = byDate.get(savedDate)
    if (!previous || String(row.updated_at || row.recorded_at) > String(previous.updated_at || previous.recorded_at)) byDate.set(savedDate, row)
  })
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (count - 1 - index))
    const savedDate = localDateKey(date)
    const row = byDate.get(savedDate)
    return { date, savedDate, row, status: row ? readingStatus(metric, row.value) : { key: 'no-data', label: 'No data', successful: false } }
  })
}

function streaks(metric, readings) {
  const allByDate = new Map()
  readings.forEach(row => {
    const date = row.record_date || row.local_date || localDateKey(row.recorded_at || row.date)
    if (date) allByDate.set(date, readingStatus(metric, row.value))
  })
  const dates = [...allByDate.keys()].sort()
  let best = 0
  let run = 0
  let previous = null
  dates.forEach(key => {
    const status = allByDate.get(key)
    const date = new Date(`${key}T12:00:00`)
    const consecutive = previous && Math.round((date - previous) / 86400000) === 1
    if (status.successful) run = consecutive ? run + 1 : 1
    else run = 0
    best = Math.max(best, run)
    previous = date
  })
  let current = 0
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  for (;;) {
    const key = localDateKey(cursor)
    const status = allByDate.get(key)
    if (!status?.successful) break
    current += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return { current, best: Math.max(best, current), activeRecord: current > 0 && current >= Math.max(best, current) }
}

function targetCopy(metric) {
  const unit = metric.unit ? ` ${metric.unit}` : ''
  if (metric.targetMode === 'range') return `${metric.min ?? '—'}–${metric.max ?? '—'}${unit}`
  if (metric.targetMode === 'minimum') return `Minimum ${metric.target ?? '—'}${unit}`
  if (metric.targetMode === 'target') return `Target ${metric.target ?? '—'}${unit}`
  return 'Tracking only'
}

export default function HealthMetricCardCompletion({ metric }) {
  const readings = useMemo(() => readingsForMetric(metric.id), [metric.id])
  const days = useMemo(() => rollingDays(readings, metric, 30), [readings, metric])
  const streak = useMemo(() => streaks(metric, readings), [metric, readings])
  const style = categoryStyle(metric.category)
  const firstDate = days[0]?.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const lastDate = days[days.length - 1]?.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const latest = readings[0]
  const latestStatus = latest ? readingStatus(metric, latest.value) : { label: 'No reading yet', key: 'no-data' }

  return <section className="health-card-completion" style={{ '--metric-color': style.color }}>
    <div className="health-card-completion-summary">
      <span className="health-card-category-icon" aria-hidden="true">{style.icon}</span>
      <div>
        <small>{metric.category || 'Uncategorized'}</small>
        <b>{latestStatus.label}</b>
        <span>{targetCopy(metric)}</span>
      </div>
    </div>

    <div className={`health-card-streak ${streak.activeRecord ? 'record-active' : ''}`}>
      <span className="streak-flame">🔥</span>
      <b>Current: {streak.current} {streak.current === 1 ? 'day' : 'days'}</b>
      {streak.activeRecord
        ? <span className="active-crown" title="Personal record active">👑</span>
        : streak.best > 0 && <em>(👑: {streak.best} {streak.best === 1 ? 'day' : 'days'})</em>}
    </div>

    <div className="health-card-history-compact">
      <div className="health-card-history-cells">
        {days.map(day => <span
          key={day.savedDate}
          className={`health-card-history-cell ${day.status.key}`}
          title={`${day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · ${day.row ? `${day.row.value} ${metric.unit || ''} · ${day.status.label}` : 'No data'}`}
        />)}
      </div>
      <div className="health-card-history-range"><time>{firstDate}</time><time>{lastDate}</time></div>
    </div>
  </section>
}

export function syncHealthReadingSummaries(rows = []) {
  const definitions = readJson('fitlife-health-defs-v2', [])
  const history = readJson('fitlife-log-history', [])
  const otherHistory = history.filter(item => item.source_type !== 'health_metric_reading')
  const healthEvents = rows.map(row => {
    const metric = definitions.find(item => String(item.id) === String(row.metric_id)) || {}
    const style = categoryStyle(metric.category)
    const status = readingStatus(metric, row.value)
    return {
      id: `health-${row.id}`,
      source_id: row.id,
      source_type: 'health_metric_reading',
      event_type: 'health_metric_reading',
      occurred_at: row.recorded_at || `${row.record_date || row.local_date}T12:00:00`,
      record_date: row.record_date || row.local_date || localDateKey(row.recorded_at),
      title: metric.name || 'Health metric',
      icon: style.icon,
      color: style.color,
      value: row.value,
      unit: metric.unit || '',
      status: status.label,
      notes: row.notes || '',
      metric_id: row.metric_id,
    }
  })
  localStorage.setItem('fitlife-log-history', JSON.stringify([...healthEvents, ...otherHistory]))
  window.dispatchEvent(new CustomEvent('fitlife:log-history-changed', { detail: healthEvents }))

  const milestones = readJson('fitlife-my-life-events', []).filter(item => item.source_type !== 'health_metric_milestone')
  const generated = []
  definitions.forEach(metric => {
    const metricRows = rows.filter(row => String(row.metric_id) === String(metric.id))
    const { current, best } = streaks(metric, metricRows)
    if (current > 0 && current >= best) {
      const style = categoryStyle(metric.category)
      generated.push({
        id: `health-milestone-${metric.id}-${best}`,
        source_type: 'health_metric_milestone',
        source_id: metric.id,
        event_date: localDateKey(new Date()),
        title: `${metric.name} personal record`,
        subtitle: `${best}-day successful streak`,
        icon: '👑',
        color: style.color,
        category: 'Health Metrics',
      })
    }
  })
  localStorage.setItem('fitlife-my-life-events', JSON.stringify([...generated, ...milestones]))
  window.dispatchEvent(new CustomEvent('fitlife:my-life-changed', { detail: generated }))
}
