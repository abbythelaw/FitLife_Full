
import {useMemo, useState} from 'react'
import {
  Activity,
  CalendarDays,
  ChevronUp,
  Flame,
  Gauge,
  HeartPulse,
  Route,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react'
import MediaCarousel from '../media/MediaCarousel'
import {recordsForEntry, sportEmoji} from './sportsRecords'

const METRICS = [
  {
    key: 'distance_km',
    label: 'Distance',
    unit: 'km',
    higherIsBetter: true,
    icon: Route
  },
  {
    key: 'duration_minutes',
    label: 'Duration',
    unit: 'min',
    higherIsBetter: null,
    icon: Timer
  },
  {
    key: 'pace_min_km',
    label: 'Pace',
    unit: 'min/km',
    higherIsBetter: false,
    icon: Gauge
  },
  {
    key: 'average_speed_kmh',
    label: 'Speed',
    unit: 'km/h',
    higherIsBetter: true,
    icon: TrendingUp
  },
  {
    key: 'average_hr',
    label: 'Average HR',
    unit: 'bpm',
    higherIsBetter: null,
    icon: HeartPulse
  },
  {
    key: 'calories',
    label: 'Energy',
    unit: 'kcal',
    higherIsBetter: null,
    icon: Flame
  },
  {
    key: 'rpe',
    label: 'RPE',
    unit: '/10',
    higherIsBetter: null,
    icon: Activity
  }
]

const numeric = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function activityDate(entry) {
  const date = new Date(`${entry.entry_date || entry.date}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function sameSportHistory(entry, entries) {
  const selectedDate = activityDate(entry)

  if (!selectedDate) return []

  return entries
    .filter(candidate =>
      candidate.id !== entry.id &&
      candidate.category === entry.category &&
      activityDate(candidate) &&
      activityDate(candidate) < selectedDate
    )
    .sort((a, b) => activityDate(a) - activityDate(b))
}

function mean(values) {
  const valid = values
    .map(numeric)
    .filter(value => value !== null)

  if (!valid.length) return null

  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function formatValue(value, metric) {
  if (value === null || value === undefined) return '—'

  if (metric.key === 'pace_min_km') {
    const minutes = Math.floor(value)
    const seconds = Math.round((value - minutes) * 60)
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  if (metric.key === 'distance_km') {
    return Number(value).toFixed(
      Number(value) >= 10 ? 1 : 2
    )
  }

  return Number(value).toFixed(
    Number.isInteger(Number(value)) ? 0 : 1
  )
}

function compareMetric(current, comparison, metric) {
  const currentValue = numeric(current?.[metric.key])
  const comparisonValue = mean(
    comparison.map(entry => entry?.[metric.key])
  )

  if (currentValue === null || comparisonValue === null) return null

  const difference = currentValue - comparisonValue
  const percentage = comparisonValue
    ? Math.abs(difference / comparisonValue) * 100
    : 0

  let direction = 'similar'
  let favourable = null

  const similar =
    metric.key === 'average_hr'
      ? Math.abs(difference) <= 3
      : metric.key === 'rpe'
        ? Math.abs(difference) <= 0.5
        : percentage < 2

  if (!similar) {
    direction = difference > 0 ? 'higher' : 'lower'

    if (metric.higherIsBetter === true) {
      favourable = difference > 0
    } else if (metric.higherIsBetter === false) {
      favourable = difference < 0
    }
  }

  return {
    metric,
    currentValue,
    comparisonValue,
    difference,
    percentage,
    direction,
    favourable,
    count: comparison.length
  }
}

function comparisonText(result) {
  if (!result) return ''

  const {metric, difference, percentage, direction, favourable} = result

  if (direction === 'similar') return 'Similar to comparison'

  if (metric.key === 'pace_min_km') {
    const seconds = Math.round(Math.abs(difference) * 60)
    return `${seconds} sec/km ${difference < 0 ? 'faster' : 'slower'}`
  }

  if (metric.key === 'average_hr') {
    return `${Math.abs(Math.round(difference))} bpm ${direction}`
  }

  if (metric.key === 'rpe') {
    return `${Math.abs(difference).toFixed(1)} ${direction}`
  }

  const arrow = favourable === true
    ? '↑'
    : favourable === false
      ? '↓'
      : ''

  return `${percentage.toFixed(1)}% ${direction} ${arrow}`.trim()
}

function createInsight(entry, comparison, results) {
  if (!comparison.length) {
    return `This is your first recorded ${entry.category} activity. Record more ${entry.category.toLowerCase()} activities to unlock comparisons and trend insights.`
  }

  const distance = results.find(item =>
    item?.metric.key === 'distance_km'
  )
  const pace = results.find(item =>
    item?.metric.key === 'pace_min_km'
  )
  const heartRate = results.find(item =>
    item?.metric.key === 'average_hr'
  )
  const rpe = results.find(item =>
    item?.metric.key === 'rpe'
  )

  const statements = []

  if (distance && distance.direction !== 'similar') {
    statements.push(
      `This activity was ${distance.percentage.toFixed(0)}% ${distance.direction === 'higher' ? 'farther' : 'shorter'}`
    )
  }

  if (pace && pace.direction !== 'similar') {
    statements.push(
      `${Math.round(Math.abs(pace.difference) * 60)} sec/km ${pace.difference < 0 ? 'faster' : 'slower'}`
    )
  }

  if (!statements.length) {
    statements.push('Performance was broadly similar')
  }

  let effort = ''

  if (
    pace?.favourable === true &&
    heartRate?.direction === 'similar' &&
    (!rpe || rpe.direction === 'similar')
  ) {
    effort =
      ' Average heart rate and effort remained similar, which is consistent with improved efficiency in your recorded activities.'
  } else if (
    pace?.favourable === true &&
    (
      heartRate?.direction === 'higher' ||
      rpe?.direction === 'higher'
    )
  ) {
    effort =
      ' The faster pace was accompanied by higher cardiovascular or perceived effort, so part of the improvement may reflect a harder session.'
  } else if (
    distance?.direction === 'higher' &&
    pace?.favourable === false
  ) {
    effort =
      ' The slower pace may partly reflect the longer distance.'
  }

  return `${statements.join(' and ')} than the selected comparison.${effort}`
}

function linearRegression(values) {
  const count = values.length
  if (count < 2) return {slope: 0, intercept: values[0] || 0}
  const sumX = values.reduce((total, _, index) => total + index, 0)
  const sumY = values.reduce((total, value) => total + value, 0)
  const sumXY = values.reduce((total, value, index) => total + index * value, 0)
  const sumXX = values.reduce((total, _, index) => total + index * index, 0)
  const denominator = count * sumXX - sumX * sumX
  const slope = denominator ? (count * sumXY - sumX * sumY) / denominator : 0
  return {slope, intercept: (sumY - slope * sumX) / count}
}

function trendAxisLabel(metric) {
  return ({pace_min_km:'Pace (min/km)',distance_km:'Distance (km)',duration_minutes:'Duration (HH:MM:SS)',average_speed_kmh:'Average speed (km/h)',average_hr:'Average heart rate (bpm)',calories:'Energy burned (kcal)',rpe:'RPE (1-10)'})[metric.key] || `${metric.label} (${metric.unit})`
}

function readableTrendDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes || 0) * 60))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  return h ? [h,m,s].map(x => String(x).padStart(2,'0')).join(':') : [m,s].map(x => String(x).padStart(2,'0')).join(':')
}

function regressionDescription(metric, slope, count) {
  if (count < 3) return 'At least 3 activities are needed for a reliable trend'
  if (Math.abs(slope) < .0001) return 'Stable trend'
  if (metric.key === 'pace_min_km') {
    const seconds = Math.round(Math.abs(slope) * 60)
    return slope < 0 ? `Trending faster - ${seconds} sec/km per activity` : `Trending slower - ${seconds} sec/km per activity`
  }
  if (metric.key === 'duration_minutes') {
    const amount = readableTrendDuration(Math.abs(slope))
    return slope > 0 ? `Sessions trending longer - ${amount} per activity` : `Sessions trending shorter - ${amount} per activity`
  }
  return `Trending ${slope > 0 ? 'higher' : 'lower'} - ${Math.abs(slope).toFixed(2)} ${metric.unit} per activity`
}

function TrendPlot({entries, current, metricKey}) {
  const metric = METRICS.find(item => item.key === metricKey) || METRICS[0]
  const points = [...entries, current].filter(entry => numeric(entry?.[metric.key]) !== null).slice(-10)
  if (points.length < 2) return <div className="sports-analysis-empty">Record more activities to unlock the scatter plot and linear regression trend.</div>

  const values = points.map(entry => numeric(entry[metric.key]))
  const {slope, intercept} = linearRegression(values)
  const regressions = values.map((_, index) => intercept + slope * index)
  const all = [...values, ...regressions]
  const rawMin = Math.min(...all), rawMax = Math.max(...all)
  const rawRange = rawMax - rawMin || Math.max(1, rawMax * .1)
  const minimum = Math.max(0, rawMin - rawRange * .14), maximum = rawMax + rawRange * .14
  const range = maximum - minimum || 1
  const width=640,height=270,left=92,right=28,top=30,bottom=58
  const plotWidth=width-left-right, plotHeight=height-top-bottom
  const xFor = index => left + index * (plotWidth / Math.max(1, values.length - 1))
  const yFor = value => top + ((maximum - value) / range) * plotHeight
  const ticks = Array.from({length:5}, (_,index) => maximum - index * (range / 4))
  const formatTick = value => {
    if (metric.key === 'pace_min_km') {
      const minutes = Math.floor(value), seconds = Math.round((value - minutes) * 60)
      return `${minutes}:${String(seconds).padStart(2,'0')}`
    }
    if (metric.key === 'duration_minutes') return readableTrendDuration(value)
    return Number(value).toFixed(value >= 100 ? 0 : 1)
  }
  const firstDate = points[0]?.entry_date || points[0]?.date || 'Older'
  const currentDate = current?.entry_date || current?.date || 'Current'

  return <div className="sports-dotplot sports-scatterplot">
    <div className="sports-dotplot-header"><div><small>{metric.label.toUpperCase()} TREND</small><strong>{regressionDescription(metric,slope,points.length)}</strong></div><span>{points.length} activities</span></div>
    <div className="sports-scatterplot-scroll"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${trendAxisLabel(metric)} scatter plot with linear regression`}>
      <text x="20" y={top+plotHeight/2} className="sports-axis-title" textAnchor="middle" transform={`rotate(-90 20 ${top+plotHeight/2})`}>{trendAxisLabel(metric)}</text>
      {ticks.map((value,index)=><g key={`tick-${index}`}><line x1={left} y1={yFor(value)} x2={width-right} y2={yFor(value)} className="sports-chart-gridline"/><text x={left-12} y={yFor(value)+4} textAnchor="end" className="sports-axis-tick">{formatTick(value)}</text></g>)}
      <line x1={left} y1={height-bottom} x2={width-right} y2={height-bottom} className="sports-chart-axis"/>
      <line x1={left} y1={top} x2={left} y2={height-bottom} className="sports-chart-axis"/>
      {points.length>=3&&<line x1={xFor(0)} y1={yFor(intercept)} x2={xFor(values.length-1)} y2={yFor(intercept+slope*(values.length-1))} className="sports-regression-line"/>}
      {values.map((value,index)=>{const selected=index===values.length-1;const date=points[index]?.entry_date||points[index]?.date||`Activity ${index+1}`;return <g key={`${date}-${index}`}>{selected&&<circle cx={xFor(index)} cy={yFor(value)} r="14" className="sports-chart-halo"/>}<circle cx={xFor(index)} cy={yFor(value)} r={selected?8:6} className={selected?'sports-chart-point current':'sports-chart-point'}><title>{`${date}: ${formatTick(value)} ${metric.unit}`}</title></circle></g>})}
      <text x={left} y={height-24} className="sports-axis-tick">{firstDate}</text><text x={width-right} y={height-24} textAnchor="end" className="sports-axis-tick">{currentDate}</text><text x={left+plotWidth/2} y={height-7} textAnchor="middle" className="sports-axis-title">Activity date</text>
    </svg></div>
    <div className="sports-regression-legend"><span><i className="dot"/>Recorded activity</span><span><i className="current-dot"/>Current activity</span>{points.length>=3&&<span><i className="line"/>Linear regression</span>}</div>
  </div>
}

export default function SportsActivityAnalysis({
  entry,
  entries,
  onClose,
  onEdit,
  onDelete
}) {
  const [mode, setMode] = useState('previous')
  const [trendCount, setTrendCount] = useState(5)

  const history = useMemo(
    () => sameSportHistory(entry, entries),
    [entry, entries]
  )

  const currentDate = activityDate(entry)
  const year = currentDate?.getFullYear()

  const historyThisYear = history.filter(item =>
    activityDate(item)?.getFullYear() === year
  )

  const previous = history.length
    ? [history[history.length - 1]]
    : []

  const recent = history.slice(-3)

  const comparison =
    mode === 'previous'
      ? previous
      : mode === 'recent'
        ? recent
        : historyThisYear

  const results = METRICS
    .map(metric => compareMetric(entry, comparison, metric))
    .filter(Boolean)

  const achievements =
    entry.achievements ||
    recordsForEntry(entry, entries)

  const trendEntries =
    trendCount === 'year'
      ? historyThisYear
      : history.slice(-Number(trendCount))

  const defaultTrendMetric =
    numeric(entry.pace_min_km)
      ? 'pace_min_km'
      : numeric(entry.average_speed_kmh)
        ? 'average_speed_kmh'
        : numeric(entry.distance_km)
          ? 'distance_km'
          : 'duration_minutes'

  const insight = createInsight(entry, comparison, results)

  return (
    <article className="sports-detail sports-analysis-detail">
      <div className="sports-analysis-top-actions">
        <button type="button" onClick={() => onEdit(entry)}>
          Edit
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => onDelete(entry)}
        >
          Delete
        </button>
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close activity analysis"
        >
          <X />
        </button>
      </div>

      <MediaCarousel
        photos={entry.photos}
        positionX={entry.position_x}
        positionY={entry.position_y}
        featuredIndex={entry.featured_index || 0}
        fallbackClass="sports-fallback sports-fallback-1"
      />

      <div className="sports-analysis-content">
        <header className="sports-analysis-heading">
          <span className="sports-category">
            <span aria-hidden="true">{sportEmoji(entry.category)}</span>
            {entry.category}
          </span>

          <h2>{entry.title}</h2>

          <p>
            <CalendarDays />
            {entry.entry_date} · {entry.start_time}
          </p>
        </header>

        <section>
          <div className="sports-analysis-section-title">
            <div>
              <small>SESSION</small>
              <h3>Activity summary</h3>
            </div>
          </div>

          <div className="sports-analysis-metrics">
            {METRICS.map(metric => {
              const value = numeric(entry[metric.key])

              if (value === null) return null

              const Icon = metric.icon

              return (
                <div key={metric.key} className="sports-analysis-metric">
                  <Icon />
                  <strong>{formatValue(value, metric)}</strong>
                  <span>{metric.unit}</span>
                  <small>{metric.label}</small>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className="sports-analysis-section-title">
            <div>
              <small>PERSONAL BESTS</small>
              <h3>Achievements</h3>
            </div>
          </div>

          {achievements.length ? (
            <div className="sports-analysis-achievements">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`sports-analysis-achievement is-${achievement.level}`}
                >
                  <span>{achievement.icon}</span>
                  <div>
                    <strong>{achievement.label}</strong>
                    <small>
                      {achievement.level === 'ever'
                        ? 'Compared with all earlier activities'
                        : `Compared with ${achievement.year} activities`}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sports-analysis-empty">
              {history.length === 0
                ? `This is your first recorded ${entry.category} activity and is your starting benchmark.`
                : 'No new personal best was recorded in this activity.'}
            </div>
          )}
        </section>

        <section>
          <div className="sports-analysis-section-title">
            <div>
              <small>COMPARISON</small>
              <h3>How this activity compares</h3>
            </div>
            <span>
              {comparison.length
                ? `${comparison.length} comparison ${
                    comparison.length === 1 ? 'activity' : 'activities'
                  }`
                : 'Starting benchmark'}
            </span>
          </div>

          <div className="sports-analysis-tabs">
            <button
              type="button"
              className={mode === 'previous' ? 'active' : ''}
              onClick={() => setMode('previous')}
            >
              Previous
            </button>
            <button
              type="button"
              className={mode === 'recent' ? 'active' : ''}
              onClick={() => setMode('recent')}
            >
              Recent 3
            </button>
            <button
              type="button"
              className={mode === 'year' ? 'active' : ''}
              onClick={() => setMode('year')}
            >
              This Year
            </button>
          </div>

          {!comparison.length ? (
            <div className="sports-analysis-empty">
              <Sparkles />
              <strong>Exercise more to unlock insights</strong>
              <span>
                Record another {entry.category} activity to unlock
                comparisons, trends and personalised observations.
              </span>
            </div>
          ) : (
            <div className="sports-comparison-grid">
              {results.map(result => {
                const Icon =
                  result.favourable === true
                    ? TrendingUp
                    : result.favourable === false
                      ? TrendingDown
                      : ChevronUp

                return (
                  <div
                    key={result.metric.key}
                    className={`sports-comparison-box ${
                      result.favourable === true
                        ? 'positive'
                        : result.favourable === false
                          ? 'negative'
                          : 'neutral'
                    }`}
                  >
                    <Icon />
                    <strong>{comparisonText(result)}</strong>
                    <small>{result.metric.label} vs comparison</small>
                    <span>
                      {formatValue(
                        result.currentValue,
                        result.metric
                      )}{' '}
                      vs{' '}
                      {formatValue(
                        result.comparisonValue,
                        result.metric
                      )}{' '}
                      {result.metric.unit}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="sports-analysis-section-title">
            <div>
              <small>TREND</small>
              <h3>Recent activity dot plot</h3>
            </div>
          </div>

          <div className="sports-analysis-tabs">
            {[3, 5, 10].map(count => (
              <button
                key={count}
                type="button"
                className={trendCount === count ? 'active' : ''}
                onClick={() => setTrendCount(count)}
              >
                Last {count}
              </button>
            ))}
            <button
              type="button"
              className={trendCount === 'year' ? 'active' : ''}
              onClick={() => setTrendCount('year')}
            >
              This Year
            </button>
          </div>

          <TrendPlot
            entries={trendEntries}
            current={entry}
            metricKey={defaultTrendMetric}
          />
        </section>

        <section className="sports-fitlife-insight">
          <Sparkles />
          <div>
            <small>FITLIFE INSIGHT</small>
            <h3>
              {history.length === 0
                ? 'Starting benchmark'
                : `Compared with ${
                    mode === 'previous'
                      ? 'your previous activity'
                      : mode === 'recent'
                        ? `your recent ${comparison.length}`
                        : `your ${year} activity history`
                  }`}
            </h3>
            <p>{insight}</p>

            {history.length >= 2 && (
              <span>
                You have {history.length} previous {entry.category}{' '}
                {history.length === 1 ? 'activity' : 'activities'}.
              </span>
            )}
          </div>
        </section>

        {entry.notes && (
          <section className="sports-analysis-notes">
            <small>NOTES</small>
            <p>{entry.notes}</p>
          </section>
        )}
      </div>
    </article>
  )
}
