import { useMemo, useState } from 'react'
import './HealthMetricDeleteDialog.css'

export default function HealthMetricDeleteDialog({ metric, readings = [], busy = false, onCancel, onDelete }) {
  const [step, setStep] = useState(1)
  const [confirmation, setConfirmation] = useState('')
  const hasReadings = readings.length > 0
  const canDelete = !busy && (!hasReadings || confirmation === 'DELETE')
  const related = useMemo(() => [
    `${readings.length} historical reading${readings.length === 1 ? '' : 's'}`,
    '30D, 90D, and 1Y contribution history',
    'Log History events for this metric',
    'My Life milestones for this metric',
    'Analytics references generated from this metric',
  ], [readings.length])

  return <div className="health-delete-layer">
    <button type="button" className="health-delete-backdrop" aria-label="Cancel metric deletion" onClick={busy ? undefined : onCancel}/>
    <section className="health-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="health-delete-title">
      {step === 1 ? <>
        <small>DELETE HEALTH METRIC</small>
        <h2 id="health-delete-title">Delete {metric.name}?</h2>
        <p>This will begin the permanent metric deletion process.</p>
        <div className="health-delete-summary">
          <span className="health-delete-icon" aria-hidden="true">{metric.icon || '🙂'}</span>
          <div><b>{metric.name}</b><small>{metric.category || 'Uncategorized'} · {metric.unit || 'No unit'}</small></div>
        </div>
        <footer><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="continue" onClick={() => setStep(2)}>Continue</button></footer>
      </> : <>
        <small>PERMANENT DELETION</small>
        <h2 id="health-delete-title">All related data will be deleted</h2>
        <p>This action cannot be recovered. FitLife will permanently remove:</p>
        <ul>{related.map(item => <li key={item}>{item}</li>)}</ul>
        {hasReadings && <label className="health-delete-confirm-input">Type <b>DELETE</b> to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value.toUpperCase())} autoComplete="off" autoFocus/></label>}
        <footer><button type="button" disabled={busy} onClick={() => setStep(1)}>Back</button><button type="button" className="danger" disabled={!canDelete} onClick={onDelete}>{busy ? 'Deleting…' : 'Delete Permanently'}</button></footer>
      </>}
    </section>
  </div>
}
