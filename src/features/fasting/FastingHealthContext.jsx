import { useEffect, useMemo, useState } from 'react'
import { Activity, ChevronRight, Droplets, HeartPulse, Scale } from 'lucide-react'
import { readingsForMetric } from './fastingNutritionStore'
import { aggregateMetricReadings, metricDecimals } from '../health/metricAggregation'
import './FastingHealthContext.css'

const META = {
  glucose: { label: 'Glucose', color: '#35d483', Icon: Droplets },
  rhr: { label: 'Resting heart rate', color: '#a66be8', Icon: HeartPulse },
  weight: { label: 'Weight', color: '#54aaf5', Icon: Scale },
  hba1c: { label: 'HbA1c', color: '#c66be8', Icon: Activity },
}
const PERIODS = ['7D', '30D', '90D', '1Y']
const shortDate = value => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`)) : 'No date'

const GRAPH = { width: 500, height: 140, left: 58, right: 14, top: 12, bottom: 24 }

function niceStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(rawStep))
  const fraction = rawStep / power
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return niceFraction * power
}

function minimumSpan(metric, unit) {
  if (metric === 'weight') return String(unit).toLowerCase() === 'lb' ? 10 : 5
  if (metric === 'glucose') return String(unit).toLowerCase().includes('mmol') ? 2 : 40
  if (metric === 'rhr') return 10
  if (metric === 'hba1c') return 1
  return 5
}

function axisModel(buckets, metric, unit, tickCount = 5) {
  const values = buckets.map(bucket => bucket.average).filter(Number.isFinite)
  if (!values.length) return null
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const requiredSpan = minimumSpan(metric, unit)
  const centre = (dataMin + dataMax) / 2
  const rawSpan = Math.max(dataMax - dataMin, requiredSpan)
  const paddedMin = Math.min(dataMin, centre - rawSpan / 2) - rawSpan * .12
  const paddedMax = Math.max(dataMax, centre + rawSpan / 2) + rawSpan * .12
  const step = niceStep((paddedMax - paddedMin) / Math.max(1, tickCount - 1))
  const min = Math.floor(paddedMin / step) * step
  const max = Math.ceil(paddedMax / step) * step
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => max - index * step)
    .slice(0, 7)
  return { min, max, step, ticks }
}

function xPosition(index, count) {
  const usable = GRAPH.width - GRAPH.left - GRAPH.right
  return count === 1 ? GRAPH.left + usable / 2 : GRAPH.left + index / (count - 1) * usable
}

function yPosition(value, axis) {
  const usable = GRAPH.height - GRAPH.top - GRAPH.bottom
  return GRAPH.top + (axis.max - value) / Math.max(axis.max - axis.min, 1) * usable
}

function chartPoints(buckets, axis) {
  if (!buckets.length || !axis) return ''
  return buckets.map((bucket, index) => `${xPosition(index, buckets.length)},${yPosition(bucket.average, axis)}`).join(' ')
}

function tickLabel(value, metric, unit) {
  const decimals = metricDecimals(metric, unit)
  return `${Number(value).toFixed(decimals)} ${unit}`.trim()
}

function openHealthMetric(metric) {
  sessionStorage.setItem('fitlife-health-prefill', JSON.stringify({ metric }))
  const button = document.querySelector('.app nav button[title="Health Metrics"]')
    || document.querySelector('.app nav button[title="Health"]')
    || [...document.querySelectorAll('.app nav button')].find(item => ['Health', 'Health Metrics'].includes(item.textContent?.trim()))
  if (button) button.click()
  else {
    window.location.hash = 'health'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
}

export default function FastingHealthContext() {
  const [period, setPeriod] = useState('30D')
  const [token, setToken] = useState(0)
  useEffect(() => {
    const refresh = () => setToken(value => value + 1)
    window.addEventListener('fitlife:health-readings-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('fitlife:health-readings-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const datasets = useMemo(() => Object.keys(META).map(metric => ({
    metric,
    model: aggregateMetricReadings(readingsForMetric(metric), metric, period),
  })), [period, token])

  return <section className="fast-health-context">
    <header>
      <div><small>HEALTH CONTEXT</small><h2>Health readings during your fasting period</h2><p>All raw readings are retained. Charts show daily, weekly, or monthly averages.</p></div>
      <nav aria-label="Health graph period">{PERIODS.map(value => <button type="button" className={period === value ? 'active' : ''} onClick={() => setPeriod(value)} key={value}>{value}</button>)}</nav>
    </header>
    <div className="fast-health-grid">{datasets.map(({ metric, model }) => <MetricGraph key={metric} metric={metric} model={model}/>)}</div>
  </section>
}

function MetricGraph({ metric, model }) {
  const meta = META[metric]
  const Icon = meta.Icon
  const summary = model.summary
  const decimals = metricDecimals(metric, model.unit)
  const axis = axisModel(model.buckets, metric, model.unit)
  const averageY = summary && axis ? yPosition(summary.average, axis) : null

  return <article className="fast-health-graph" style={{ '--metric': meta.color }}>
    <header>
      <div><Icon/><span>{meta.label}</span></div>
      <div><small>AVERAGE</small><b>{summary ? summary.average.toFixed(decimals) : '—'} <em>{model.unit}</em></b></div>
    </header>

    {summary ? <>
      <div className="fast-health-statline">
        <span>Range <b>{summary.minimum.toFixed(decimals)}–{summary.maximum.toFixed(decimals)} {model.unit}</b></span>
        <span>{summary.count} {summary.count === 1 ? 'reading' : 'readings'}</span>
        <span>{model.bucketLabel}</span>
      </div>

      <div className="fast-health-chart">
        <svg viewBox={`0 0 ${GRAPH.width} ${GRAPH.height}`} preserveAspectRatio="none" role="img" aria-label={`${meta.label} ${model.bucketLabel.toLowerCase()} with a dynamic ${model.unit} axis`}>
          {axis.ticks.map(tick => {
            const y = yPosition(tick, axis)
            return <g key={tick}>
              <line className="axis-gridline" x1={GRAPH.left} y1={y} x2={GRAPH.width - GRAPH.right} y2={y}/>
              <text className="axis-label" x={GRAPH.left - 8} y={y + 3} textAnchor="end">{tickLabel(tick, metric, model.unit)}</text>
            </g>
          })}
          <line className="average-line" x1={GRAPH.left} y1={averageY} x2={GRAPH.width - GRAPH.right} y2={averageY}/>
          <text className="average-label" x={GRAPH.width - GRAPH.right} y={Math.max(GRAPH.top + 9, averageY - 5)} textAnchor="end">Avg {summary.average.toFixed(decimals)}</text>
          <polyline points={chartPoints(model.buckets, axis)}/>
          {model.buckets.map((bucket, index) => <circle key={bucket.key} cx={xPosition(index, model.buckets.length)} cy={yPosition(bucket.average, axis)} r="4"><title>{bucket.key}: {bucket.average.toFixed(decimals)} {model.unit} average from {bucket.count} {bucket.count === 1 ? 'reading' : 'readings'}</title></circle>)}
        </svg>
        <span>{shortDate(summary.firstDate)}</span>
        <span>{shortDate(summary.lastDate)}</span>
      </div>
    </> : <div className="fast-health-empty"><b>No readings recorded for this period</b><span>Add {meta.label.toLowerCase()} in Health.</span></div>}

    <footer>
      <span>{summary ? `${summary.count} ${summary.count === 1 ? 'reading' : 'readings'}` : '0 readings'}</span>
      <button type="button" onClick={() => openHealthMetric(metric)}>Open in Health <ChevronRight/></button>
    </footer>
  </article>
}
