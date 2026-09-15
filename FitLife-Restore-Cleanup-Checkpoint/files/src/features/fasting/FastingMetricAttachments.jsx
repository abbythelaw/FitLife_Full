import {
  Activity,
  Check,
  ChevronRight,
  Droplets,
  HeartPulse,
  Link2,
  Plus,
  Scale,
  Unlink,
  X
} from 'lucide-react'
import {useMemo, useState} from 'react'
import {
  ATTACHABLE_METRICS,
  nutritionAttachments,
  readingsAvailableForAttachment,
  recommendedAttachmentIds,
  resolveAttachedReading,
  updateNutritionAttachments
} from './fastingNutritionStore'

const ICONS = {
  glucose: Droplets,
  weight: Scale,
  rhr: HeartPulse,
  hba1c: Activity
}

function attachmentKey(metric) {
  return metric === 'glucose'
    ? 'glucose_reading_ids'
    : `${metric}_reading_id`
}

function displayValue(metric, reading) {
  if (!reading) return 'Not attached'

  const definition = ATTACHABLE_METRICS.find(item => item.key === metric)
  const decimals = metric === 'weight' || metric === 'hba1c' ? 1 : 0

  return `${Number(reading.normalized_value).toFixed(decimals)} ${
    reading.normalized_unit || definition?.unit || ''
  }`.trim()
}

function attachedRows(metric, attachments) {
  if (metric === 'glucose') {
    return (attachments.glucose_reading_ids || [])
      .map(resolveAttachedReading)
      .filter(Boolean)
  }

  const row = resolveAttachedReading(
    attachments[attachmentKey(metric)]
  )

  return row ? [row] : []
}

function MetricAttachmentPicker({
  metric,
  date,
  selected,
  onSave,
  onClose
}) {
  const definition = ATTACHABLE_METRICS.find(item => item.key === metric)
  const Icon = ICONS[metric] || Activity
  const choices = useMemo(
    () => readingsAvailableForAttachment(metric, date),
    [metric, date]
  )
  const multiple = metric === 'glucose'
  const [selection,setSelection] = useState(() =>
    multiple
      ? new Set(selected || [])
      : selected || null
  )

  function toggle(id) {
    if (!multiple) {
      setSelection(id)
      return
    }

    setSelection(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    onSave(
      multiple
        ? [...selection]
        : selection
    )
  }

  return (
    <div className="fast-layer metric-attachment-layer">
      <button
        className="fast-backdrop"
        aria-label="Close attachment picker"
        onClick={onClose}
      />

      <aside className="fast-drawer metric-attachment-picker">
        <button
          type="button"
          className="close"
          aria-label="Close"
          onClick={onClose}
        >
          <X />
        </button>

        <small>ATTACH HEALTH METRIC</small>
        <h2>{definition?.label}</h2>
        <p>
          Select an existing Health Metrics reading. FitLife stores only
          the source record ID, so edits remain synchronised.
        </p>

        <div className="metric-attachment-options">
          {choices.length ? choices.map(row => {
            const checked = multiple
              ? selection.has(row.attachment_id)
              : selection === row.attachment_id

            return (
              <button
                key={row.attachment_id}
                className={checked ? 'selected' : ''}
                onClick={() => toggle(row.attachment_id)}
              >
                <span>
                  <Icon />
                </span>
                <div>
                  <b>{displayValue(metric,row)}</b>
                  <small>
                    {row.normalized_date}
                    {row.normalized_time ? ` · ${row.normalized_time}` : ''}
                    {row.context ? ` · ${row.context}` : ''}
                  </small>
                </div>
                <i>{checked ? <Check /> : null}</i>
              </button>
            )
          }) : (
            <div className="metric-attachment-empty">
              <Icon />
              <b>No suitable reading is available</b>
              <p>
                Add {definition?.label.toLowerCase()} in Health Metrics,
                then return to attach the source reading.
              </p>
              <button onClick={() => { location.hash = 'health' }}>
                <Plus />
                Open Health Metrics
              </button>
            </div>
          )}
        </div>

        <div className="fast-editor-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="save" onClick={save}>
            Save attachment
          </button>
        </div>
      </aside>
    </div>
  )
}

export default function FastingMetricAttachments({
  nutrition,
  date,
  onUpdated
}) {
  const [picker,setPicker] = useState(null)
  const [error,setError] = useState('')
  const attachments = nutritionAttachments(nutrition)

  function apply(metric,value) {
    try {
      const key = attachmentKey(metric)
      const updated = updateNutritionAttachments(date, {
        ...attachments,
        [key]: value
      })
      setError('')
      setPicker(null)
      onUpdated?.(updated)
    } catch (updateError) {
      setError(
        updateError?.message ||
        'The attachment could not be saved.'
      )
    }
  }

  function attachRecommended() {
    try {
      const recommended = recommendedAttachmentIds(date)
      const updated = updateNutritionAttachments(date, {
        ...attachments,
        ...recommended
      })
      setError('')
      onUpdated?.(updated)
    } catch (updateError) {
      setError(
        updateError?.message ||
        'Recommended readings could not be attached.'
      )
    }
  }

  if (!nutrition) {
    return (
      <section className="metric-attachments empty">
        <Link2 />
        <div>
          <b>Health Metric attachments</b>
          <p>
            Save this date's nutrition summary before attaching source
            readings.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="metric-attachments">
      <header>
        <div>
          <small>METABOLIC CONTEXT</small>
          <h3>Attached Health Metrics</h3>
          <p>
            Links only. No duplicate readings or timeline events are
            created.
          </p>
        </div>
        <button onClick={attachRecommended}>
          <Link2 />
          Attach available
        </button>
      </header>

      {error && (
        <div className="fast-validation-error">
          <b>Attachment error</b>
          <span>{error}</span>
        </div>
      )}

      <div className="metric-attachment-grid">
        {ATTACHABLE_METRICS.map(metric => {
          const Icon = ICONS[metric.key] || Activity
          const rows = attachedRows(metric.key, attachments)
          const primary = rows[0]

          return (
            <article key={metric.key}>
              <span className={`metric-icon ${metric.key}`}>
                <Icon />
              </span>
              <div>
                <small>{metric.label.toUpperCase()}</small>
                <b>
                  {primary
                    ? displayValue(metric.key,primary)
                    : 'Not attached'}
                </b>
                <p>
                  {metric.key === 'glucose' && rows.length > 1
                    ? `${rows.length} readings attached`
                    : primary
                      ? `${primary.normalized_date}${
                          primary.normalized_time
                            ? ` · ${primary.normalized_time}`
                            : ''
                        }`
                      : 'Choose a Health Metrics record'}
                </p>
              </div>
              <div className="metric-attachment-actions">
                {primary && (
                  <button
                    aria-label={`Detach ${metric.label}`}
                    title="Detach"
                    onClick={() => apply(
                      metric.key,
                      metric.key === 'glucose' ? [] : null
                    )}
                  >
                    <Unlink />
                  </button>
                )}
                <button onClick={() => setPicker(metric.key)}>
                  {primary ? 'Change' : 'Attach'}
                  <ChevronRight />
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {picker && (
        <MetricAttachmentPicker
          metric={picker}
          date={date}
          selected={
            picker === 'glucose'
              ? attachments.glucose_reading_ids
              : attachments[attachmentKey(picker)]
          }
          onSave={value => apply(picker,value)}
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  )
}

