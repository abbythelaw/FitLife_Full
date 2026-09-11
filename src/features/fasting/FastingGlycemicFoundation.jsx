import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Droplets,
  Flame,
  Scale,
  Utensils
} from 'lucide-react'
import {useMemo} from 'react'
import {
  listNutritionDays,
  macroContribution,
  normalizedHealthReadings,
  readingsAvailableForAttachment
} from './fastingNutritionStore'

function linearSlope(values) {
  if (values.length < 2) return 0

  const count = values.length
  const sumX = values.reduce((sum,_,index) => sum + index,0)
  const sumY = values.reduce((sum,item) => sum + item.value,0)
  const sumXY = values.reduce(
    (sum,item,index) => sum + index * item.value,
    0
  )
  const sumXX = values.reduce(
    (sum,_,index) => sum + index * index,
    0
  )
  const denominator = count * sumXX - sumX * sumX

  return denominator
    ? (count * sumXY - sumX * sumY) / denominator
    : 0
}

function metricRows(metric) {
  const aliases = {
    glucose: ['glucose','blood glucose'],
    weight: ['weight','body weight'],
    rhr: ['rhr','resting heart rate'],
    hba1c: ['hba1c','a1c','haemoglobin a1c','hemoglobin a1c']
  }

  return normalizedHealthReadings()
    .filter(row => aliases[metric].some(alias =>
      row.normalized_metric === alias ||
      row.normalized_metric.includes(alias)
    ))
    .sort((left,right) =>
      String(left.normalized_date).localeCompare(String(right.normalized_date))
    )
}

function sessionHours(session) {
  const end = session.ended_at
    ? new Date(session.ended_at)
    : new Date()

  return Math.max(
    0,
    (end - new Date(session.started_at)) / 36e5
  )
}

function fastingCoverage(sessions,days = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const recent = sessions.filter(session =>
    session.started_at &&
    new Date(session.started_at) >= cutoff &&
    !session.deleted_at
  )

  const qualifying = recent.filter(session =>
    sessionHours(session) >= 12
  )

  return {
    recent: recent.length,
    qualifying: qualifying.length,
    ratio: recent.length
      ? qualifying.length / recent.length
      : 0
  }
}

function latestLabHbA1c() {
  return metricRows('hba1c').at(-1) || null
}

function glucoseDerivedA1c(glucoseRows) {
  if (!glucoseRows.length) return null

  const recent = glucoseRows.slice(-30)
  const average = recent.reduce(
    (sum,row) => sum + Number(row.normalized_value),
    0
  ) / recent.length

  /*
   * Educational eAG conversion only. The range is widened below and
   * displayed as a trajectory rather than a laboratory prediction.
   */
  return (average + 46.7) / 28.7
}

export function buildGlycemicFoundation(sessions = []) {
  const nutrition = listNutritionDays()
  const glucose = metricRows('glucose')
  const weight = metricRows('weight')
  const rhr = metricRows('rhr')
  const hba1c = latestLabHbA1c()
  const fasting = fastingCoverage(sessions,30)

  const glucoseSlope = linearSlope(
    glucose.slice(-30).map(row => ({value:Number(row.normalized_value)}))
  )
  const weightSlope = linearSlope(
    weight.slice(-30).map(row => ({value:Number(row.normalized_value)}))
  )
  const rhrSlope = linearSlope(
    rhr.slice(-30).map(row => ({value:Number(row.normalized_value)}))
  )

  const completeNutrition = nutrition.filter(row =>
    row.completeness === 'Complete day'
  )
  const nutritionCoverage = Math.min(1,completeNutrition.length / 30)

  let directionScore = 0
  const positive = []
  const caution = []
  const missing = []

  if (glucose.length >= 3) {
    if (glucoseSlope < -0.25) {
      directionScore += 3
      positive.push(
        `Glucose readings are trending lower (${glucoseSlope.toFixed(1)} mg/dL per reading).`
      )
    } else if (glucoseSlope > 0.25) {
      directionScore -= 3
      caution.push(
        `Glucose readings are trending higher (+${glucoseSlope.toFixed(1)} mg/dL per reading).`
      )
    } else {
      positive.push('Glucose readings are broadly stable.')
    }
  } else {
    missing.push('At least 3 glucose readings')
  }

  if (weight.length >= 3) {
    if (weightSlope < -0.02) {
      directionScore += 1.5
      positive.push('Weight is trending downward.')
    } else if (weightSlope > 0.02) {
      directionScore -= 1
      caution.push('Weight is trending upward.')
    }
  } else {
    missing.push('At least 3 weight readings')
  }

  if (fasting.qualifying >= 8) {
    directionScore += 1.5
    positive.push(
      `${fasting.qualifying} recent fasts reached at least 12 hours.`
    )
  } else if (fasting.qualifying > 0) {
    directionScore += 0.5
    positive.push(
      `${fasting.qualifying} recent fasts reached at least 12 hours.`
    )
  } else {
    missing.push('More completed 12-hour fasting periods')
  }

  if (nutritionCoverage >= 0.7) {
    directionScore += 0.7
    positive.push(
      `${completeNutrition.length} complete nutrition days are available.`
    )
  } else if (nutrition.length) {
    caution.push(
      `Nutrition coverage is limited (${completeNutrition.length} complete days).`
    )
  } else {
    missing.push('Daily CPF nutrition summaries')
  }

  if (rhr.length >= 3) {
    if (rhrSlope < -0.05) {
      directionScore += 0.4
      positive.push('Resting heart rate is trending lower.')
    } else if (rhrSlope > 0.05) {
      directionScore -= 0.3
      caution.push('Resting heart rate is trending higher.')
    }
  } else {
    missing.push('More resting heart-rate readings')
  }

  if (!hba1c) {
    missing.push('A laboratory HbA1c anchor')
  }

  const direction = directionScore >= 2
    ? 'Improving'
    : directionScore <= -1.5
      ? 'Worsening'
      : 'Stable'

  const estimated = glucoseDerivedA1c(glucose)
  const anchor = hba1c
    ? Number(hba1c.normalized_value)
    : estimated

  let range = null

  if (anchor !== null && Number.isFinite(anchor)) {
    const directionAdjustment = direction === 'Improving'
      ? -0.08
      : direction === 'Worsening'
        ? 0.08
        : 0

    const centre = Math.max(3.5,anchor + directionAdjustment)
    const halfWidth = hba1c && glucose.length >= 7
      ? 0.2
      : glucose.length >= 5
        ? 0.35
        : 0.5

    range = {
      low: Math.max(3.5,centre - halfWidth),
      high: centre + halfWidth
    }
  }

  const evidencePoints = [
    glucose.length >= 3,
    weight.length >= 3,
    fasting.qualifying >= 4,
    completeNutrition.length >= 7,
    rhr.length >= 3,
    Boolean(hba1c)
  ].filter(Boolean).length

  const confidence = evidencePoints >= 5 && glucose.length >= 10 && hba1c
    ? 'Moderate'
    : evidencePoints >= 3 && glucose.length >= 3
      ? 'Limited'
      : 'Early view'

  return {
    direction,
    directionScore,
    confidence,
    range,
    positive,
    caution,
    missing,
    counts: {
      glucose: glucose.length,
      weight: weight.length,
      rhr: rhr.length,
      nutrition: nutrition.length,
      completeNutrition: completeNutrition.length,
      qualifyingFasts: fasting.qualifying
    },
    labHbA1c: hba1c
  }
}

export default function FastingGlycemicFoundation({sessions = []}) {
  const model = useMemo(
    () => buildGlycemicFoundation(sessions),
    [sessions]
  )

  const DirectionIcon = model.direction === 'Improving'
    ? ArrowDownRight
    : model.direction === 'Worsening'
      ? ArrowUpRight
      : ArrowRight

  return (
    <section className={`glycemic-foundation ${model.direction.toLowerCase()}`}>
      <header>
        <div>
          <small>GLYCEMIC FOUNDATION</small>
          <h2>Metabolic direction</h2>
          <p>
            An evidence-weighted educational trajectory, not a laboratory
            result, diagnosis or treatment recommendation.
          </p>
        </div>
        <span className="glycemic-confidence">
          {model.confidence} confidence
        </span>
      </header>

      <div className="glycemic-foundation-main">
        <article className="glycemic-direction-card">
          <DirectionIcon />
          <small>DIRECTION</small>
          <strong>{model.direction}</strong>
          <span>
            {model.range
              ? `${model.range.low.toFixed(1)}%–${model.range.high.toFixed(1)}%`
              : 'Range unavailable'}
          </span>
          <p>Possible HbA1c context range</p>
        </article>

        <article className="glycemic-data-card">
          <h3>Available evidence</h3>
          <div>
            <span><Droplets/><b>{model.counts.glucose}</b>Glucose</span>
            <span><Scale/><b>{model.counts.weight}</b>Weight</span>
            <span><Flame/><b>{model.counts.qualifyingFasts}</b>12h+ fasts</span>
            <span><Utensils/><b>{model.counts.completeNutrition}</b>Nutrition days</span>
          </div>
        </article>
      </div>

      <div className="glycemic-driver-grid">
        <article>
          <h3><CheckCircle2/>Positive or stable drivers</h3>
          {model.positive.length
            ? model.positive.map((item,index) => <p key={index}>{item}</p>)
            : <p>More repeated measurements are needed.</p>}
        </article>

        <article>
          <h3><ArrowUpRight/>Watch items</h3>
          {model.caution.length
            ? model.caution.map((item,index) => <p key={index}>{item}</p>)
            : <p>No clear adverse direction is visible in available data.</p>}
        </article>

        <article>
          <h3><CircleDashed/>Data still needed</h3>
          {model.missing.length
            ? model.missing.map((item,index) => <p key={index}>{item}</p>)
            : <p>The foundation dataset is well covered.</p>}
        </article>
      </div>

      <footer>
        The displayed range is deliberately broad. Finger-prick readings,
        meal timing, red-blood-cell factors and laboratory methods can differ.
        Use laboratory HbA1c and professional advice for clinical decisions.
      </footer>
    </section>
  )
}

