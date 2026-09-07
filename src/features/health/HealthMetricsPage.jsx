import { useMemo, useState } from 'react'
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Edit3,
  Flame,
  HeartPulse,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import './HealthMetricsPage.css'

const METRICS = [
  { id: 'rhr', name: 'Resting heart rate', short: 'RHR', unit: 'bpm', icon: '♥', color: '#ff6f7d', targetMode: 'range', min: 55, max: 65, chart: 'line', current: 61.4, decimals: 1 },
  { id: 'hrv', name: 'Heart-rate variability', short: 'HRV', unit: 'ms', icon: '〽', color: '#9b83e6', targetMode: 'minimum', target: 60, chart: 'dot', current: 67, decimals: 0 },
  { id: 'steps', name: 'Steps', short: 'Steps', unit: 'steps', icon: '◉', color: '#38d38b', targetMode: 'minimum', target: 8000, chart: 'bar', current: 9257, decimals: 0 },
  { id: 'sleep', name: 'Sleep duration', short: 'Sleep', unit: 'h', icon: '☾', color: '#7f8fff', targetMode: 'range', min: 7, max: 9, chart: 'bar', current: 8.1, decimals: 1 },
  { id: 'weight', name: 'Weight', short: 'Weight', unit: 'kg', icon: '⚖', color: '#43c8ca', targetMode: 'range', min: 70, max: 74, chart: 'line', current: 72.3, decimals: 1 },
  { id: 'mood', name: 'Mood', short: 'Mood', unit: '/10', icon: '☺', color: '#f1c34d', targetMode: 'range', min: 7, max: 10, chart: 'dot', current: 10, decimals: 1 },
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function generateSeries(metric, count = 30) {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.72) * (metric.id === 'steps' ? 1450 : metric.id === 'hrv' ? 6 : metric.id === 'weight' ? 0.28 : 0.7)
    const drift = metric.id === 'weight' ? -index * 0.018 : metric.id === 'rhr' ? -index * 0.035 : 0
    const base = metric.current + wave + drift
    const value = metric.id === 'steps' ? Math.max(2800, Math.round(base)) : Math.max(0, Number(base.toFixed(metric.decimals)))
    const date = new Date(2026, 7, 9 + index)
    return {
      index,
      date: date.toISOString().slice(0, 10),
      label: count <= 7 ? DAY_LABELS[index % 7] : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date),
      value,
    }
  })
}

function targetStatus(metric, value) {
  if (metric.targetMode === 'range') {
    if (value < metric.min) return { label: 'Under range', tone: 'under' }
    if (value > metric.max) return { label: 'Over range', tone: 'over' }
    return { label: 'In range', tone: 'good' }
  }
  if (metric.targetMode === 'minimum') return value >= metric.target ? { label: 'Target reached', tone: 'good' } : { label: 'Below target', tone: 'under' }
  if (metric.targetMode === 'maximum') return value <= metric.target ? { label: 'Within target', tone: 'good' } : { label: 'Over target', tone: 'over' }
  return { label: 'Tracking', tone: 'neutral' }
}

function targetText(metric) {
  if (metric.targetMode === 'range') return `${metric.min}–${metric.max} ${metric.unit}`
  if (metric.targetMode === 'minimum') return `At least ${metric.target} ${metric.unit}`
  if (metric.targetMode === 'maximum') return `At most ${metric.target} ${metric.unit}`
  return 'Track only'
}

function MetricChart({ metric, data, type = 'line', compact = false }) {
  const height = compact ? 142 : 330
  const tick = { fill: 'var(--muted)', fontSize: compact ? 8 : 10 }
  const margin = compact ? { top: 10, right: 12, bottom: 25, left: 2 } : { top: 15, right: 20, bottom: 38, left: 17 }
  const common = (
    <>
      <CartesianGrid stroke="var(--line)" strokeDasharray="3 5" vertical={false} />
      <XAxis
        dataKey="label"
        tick={tick}
        interval="preserveStartEnd"
        tickLine={false}
        axisLine={{ stroke: 'var(--line)' }}
        label={{ value: 'Date', position: 'insideBottom', offset: -16, fill: 'var(--muted)', fontSize: compact ? 8 : 10 }}
      />
      <YAxis
        width={compact ? 48 : 64}
        tick={tick}
        tickLine={false}
        axisLine={false}
        tickFormatter={(value) => metric.id === 'steps' && value >= 1000 ? `${Math.round(value / 1000)}k` : value}
        label={{ value: `${metric.short} (${metric.unit})`, angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: compact ? 8 : 10 }}
      />
      <Tooltip
        labelFormatter={(label) => `Date: ${label}`}
        formatter={(value) => [`${value} ${metric.unit}`, metric.name]}
        contentStyle={{ background: '#07110e', border: '1px solid var(--line)', borderRadius: 10, fontSize: 11 }}
      />
      {metric.targetMode === 'range' ? (
        <ReferenceArea y1={metric.min} y2={metric.max} fill={metric.color} fillOpacity={0.12} />
      ) : metric.targetMode !== 'track_only' ? (
        <ReferenceLine y={metric.target} stroke={metric.color} strokeDasharray="5 4" label={{ value: 'Target', fill: metric.color, fontSize: 8 }} />
      ) : null}
    </>
  )

  if (type === 'bar') {
    return <ResponsiveContainer width="100%" height={height}><BarChart data={data} margin={margin}>{common}<Bar dataKey="value" fill={metric.color} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
  }
  if (type === 'dot') {
    return <ResponsiveContainer width="100%" height={height}><ScatterChart margin={margin}>{common}<ZAxis range={[compact ? 26 : 46, compact ? 26 : 46]} /><Scatter data={data.filter((row) => row.value !== null)} dataKey="value" fill={metric.color} /></ScatterChart></ResponsiveContainer>
  }
  return <ResponsiveContainer width="100%" height={height}><ComposedChart data={data} margin={margin}>{common}<Area dataKey="value" fill={metric.color} fillOpacity={0.055} stroke="none" /><Line dataKey="value" stroke={metric.color} strokeWidth={compact ? 1.8 : 2.3} connectNulls={false} dot={compact ? { r: 2, fill: metric.color } : { r: 3, fill: metric.color }} /></ComposedChart></ResponsiveContainer>
}

function StreakStrip({ metric, data }) {
  const states = data.slice(-14).map((row) => targetStatus(metric, row.value).tone === 'good')
  const current = [...states].reverse().findIndex((value) => !value)
  const streak = current === -1 ? states.length : current
  return (
    <div className="metric-streak">
      <div><Flame size={14} /><b>{streak}-day streak</b></div>
      <div className="streak-boxes">{states.map((met, index) => <i key={index} className={met ? 'met' : ''} title={met ? 'Target met' : 'Target missed'} />)}</div>
    </div>
  )
}

function MetricCard({ metric, onOpen, onEdit }) {
  const data = useMemo(() => generateSeries(metric, 7), [metric])
  const status = targetStatus(metric, metric.current)
  const previous = data[data.length - 2]?.value ?? metric.current
  const delta = metric.current - previous
  return (
    <article className="metric-card" style={{ '--metric': metric.color }} onClick={onOpen}>
      <header>
        <span className="metric-icon">{metric.icon}</span>
        <div>
          <small>{metric.name}</small>
          <h3>{metric.current.toLocaleString('en-GB', { maximumFractionDigits: metric.decimals })} <i>{metric.unit}</i></h3>
        </div>
        <button onClick={(event) => { event.stopPropagation(); onEdit() }} aria-label={`Edit ${metric.name}`}><Edit3 size={15} /></button>
      </header>
      <div className="metric-status-row">
        <span className={status.tone}>{status.label}</span>
        <span className={delta <= 0 ? 'trend-down' : 'trend-up'}>{delta <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}{Math.abs(delta).toFixed(metric.decimals)}</span>
        <span>Last 7 days</span>
      </div>
      <MetricChart metric={metric} data={data} type={metric.chart} compact />
      <footer>
        <span><Target size={13} />{targetText(metric)}</span>
        <ChevronRight size={15} />
      </footer>
      <StreakStrip metric={metric} data={data} />
    </article>
  )
}

export default function HealthMetricsPage() {
  const [metrics, setMetrics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fitlife-health-defs-v2')) || METRICS } catch { return METRICS }
  })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [editor, setEditor] = useState(null)
  const visible = metrics.filter((metric) => metric.name.toLowerCase().includes(query.toLowerCase()))
  const readingsInRange = metrics.filter((metric) => targetStatus(metric, metric.current).tone === 'good').length
  const longestStreak = Math.max(...metrics.map((metric) => {
    const states = generateSeries(metric, 14).map((row) => targetStatus(metric, row.value).tone === 'good')
    const miss = [...states].reverse().findIndex((value) => !value)
    return miss === -1 ? states.length : miss
  }))

  function saveMetric(metric) {
    const row = { ...metric, id: metric.id || crypto.randomUUID() }
    const next = [row, ...metrics.filter((item) => item.id !== row.id)]
    setMetrics(next)
    localStorage.setItem('fitlife-health-defs-v2', JSON.stringify(next))
    setEditor(null)
  }

  return (
    <section className="health-dashboard">
      <div className="health-dashboard-heading">
        <div><small>HEALTH METRICS</small><h2>Health Metrics</h2><p>Trends, targets, streaks, and normal ranges in one compact view.</p></div>
        <button onClick={() => setEditor({ name: '', short: '', unit: '', icon: '✦', color: '#70e236', targetMode: 'minimum', target: 1, chart: 'line', current: 0, decimals: 1 })}><Plus size={18} />Custom metric</button>
      </div>

      <div className="health-summary-grid">
        <article><HeartPulse /><b>{readingsInRange}/{metrics.length}</b><span>Metrics in target</span></article>
        <article><Flame /><b>{longestStreak} days</b><span>Longest current streak</span></article>
        <article><Trophy /><b>3</b><span>Personal bests this month</span></article>
        <article><Sparkles /><b>83%</b><span>Data coverage</span></article>
      </div>

      <label className="health-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search metrics" /></label>

      <div className="metric-grid">{visible.map((metric) => <MetricCard key={metric.id} metric={metric} onOpen={() => setSelected(metric)} onEdit={() => setEditor(metric)} />)}</div>

      {selected && <MetricDetail metric={selected} onClose={() => setSelected(null)} />}
      {editor && <MetricEditor metric={editor} onClose={() => setEditor(null)} onSave={saveMetric} />}
    </section>
  )
}

function MetricDetail({ metric, onClose }) {
  const [type, setType] = useState(metric.chart || 'line')
  const [period, setPeriod] = useState('30D')
  const count = period === '7D' ? 7 : period === '90D' ? 90 : period === '1Y' ? 365 : 30
  const data = useMemo(() => generateSeries(metric, count), [metric, count])
  const average = data.reduce((sum, row) => sum + row.value, 0) / data.length
  return (
    <div className="health-layer"><button className="health-backdrop" onClick={onClose} aria-label="Close" /><section className="metric-detail">
      <button className="close" onClick={onClose}><X /></button>
      <span className="health-big-icon">{metric.icon}</span><small>{metric.name.toUpperCase()}</small><h2>{metric.current} {metric.unit}</h2>
      <div className="chart-controls"><div>{['line', 'dot', 'bar'].map((item) => <button className={type === item ? 'selected' : ''} onClick={() => setType(item)} key={item}>{item}</button>)}</div><div>{['7D', '30D', '90D', '1Y'].map((item) => <button className={period === item ? 'selected' : ''} onClick={() => setPeriod(item)} key={item}>{item}</button>)}</div></div>
      <MetricChart metric={metric} data={data} type={type} />
      <div className="detail-target"><Target /><div><small>TARGET OR NORMAL RANGE</small><b>{targetText(metric)}</b></div><span className={targetStatus(metric, metric.current).tone}>{targetStatus(metric, metric.current).label}</span></div>
      <div className="detail-stats"><article><b>{metric.current}</b><span>Current</span></article><article><b>{average.toFixed(metric.decimals)}</b><span>Average</span></article><article><b>{Math.min(...data.map((row) => row.value)).toFixed(metric.decimals)}</b><span>Minimum</span></article><article><b>{Math.max(...data.map((row) => row.value)).toFixed(metric.decimals)}</b><span>Maximum</span></article></div>
      <StreakStrip metric={metric} data={data} />
    </section></div>
  )
}

function MetricEditor({ metric, onClose, onSave }) {
  const [form, setForm] = useState(metric)
  return (
    <div className="health-layer"><button className="health-backdrop" onClick={onClose} aria-label="Close" /><aside className="metric-editor"><button className="close" onClick={onClose}><X /></button><small>EDIT METRIC</small><h2>{form.name || 'Custom metric'}</h2>
      <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Short axis label<input value={form.short || ''} onChange={(event) => setForm({ ...form, short: event.target.value })} /></label>
      <label>Unit<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
      <label>Icon<input value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} /></label>
      <label>Colour<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
      <label>Default graph<select value={form.chart} onChange={(event) => setForm({ ...form, chart: event.target.value })}><option value="line">Line</option><option value="dot">Dot plot</option><option value="bar">Bar</option></select></label>
      <label>Target mode<select value={form.targetMode} onChange={(event) => setForm({ ...form, targetMode: event.target.value })}><option value="minimum">Minimum</option><option value="maximum">Maximum</option><option value="range">Range</option><option value="track_only">Track only</option></select></label>
      {form.targetMode === 'range' ? <div className="editor-range"><label>Minimum<input type="number" value={form.min} onChange={(event) => setForm({ ...form, min: Number(event.target.value) })} /></label><label>Maximum<input type="number" value={form.max} onChange={(event) => setForm({ ...form, max: Number(event.target.value) })} /></label></div> : form.targetMode !== 'track_only' && <label>Target<input type="number" value={form.target} onChange={(event) => setForm({ ...form, target: Number(event.target.value) })} /></label>}
      <button className="save-metric" onClick={() => onSave(form)}>Save metric</button>
    </aside></div>
  )
}
