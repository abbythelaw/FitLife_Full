
import {ChevronRight,Link2,Plus,Save,X} from 'lucide-react'
import {useMemo,useState} from 'react'
import {
  listFastingLocalReadings,
  listMetricMappings,
  saveFastingOnlyReading,
  saveMappedMetricReading,
  saveMetricMapping
} from './fastingNutritionStore'

const META = {
  glucose: {
    label: 'Glucose',
    unit: 'mg/dL',
    suggestions: ['glucose','blood glucose','metabolic']
  },
  rhr: {
    label: 'Resting heart rate',
    unit: 'bpm',
    suggestions: ['rhr','resting heart rate','cardiovascular','heart']
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    suggestions: ['weight','body composition','body','metabolic']
  },
  hba1c: {
    label: 'HbA1c',
    unit: '%',
    suggestions: ['hba1c','a1c','metabolic','cardiovascular']
  }
}

function parse(raw,fallback=[]) {
  try { return JSON.parse(raw) ?? fallback }
  catch { return fallback }
}

function allHealthMetricCards() {
  const keys = [
    'fitlife-health-defs-v2',
    'fitlife-health-cards',
    'fitlife-health-metrics',
    'health-metric-cards'
  ]
  const cards = new Map()

  for (const key of keys) {
    const rows = parse(localStorage.getItem(key),[])
    if (!Array.isArray(rows)) continue

    for (const row of rows) {
      if (!row || row.deleted_at || row.is_dummy || row.is_demo || row.is_sample) continue

      const label = String(
        row.name || row.label || row.metric || row.type || row.title || 'Health Metric'
      ).trim()
      const id = String(
        row.id || row.card_id || row.metric_id || label
      )

      cards.set(id,{
        ...row,
        card_id:id,
        display_label:label
      })
    }
  }

  return [...cards.values()]
}

function suggestedCard(cards,metric) {
  const words = META[metric]?.suggestions || [metric]
  return cards.find(card => {
    const label = String(card.display_label || '').toLowerCase()
    return words.some(word => label.includes(word))
  }) || null
}

function ChoiceScreen({metric,cards,onLink,onManual,onClose}) {
  const meta = META[metric]
  return <div className="fast-layer">
    <button className="fast-backdrop" aria-label="Close" onClick={onClose}/>
    <aside className="fast-drawer metric-choice-drawer">
      <button className="close" aria-label="Close" onClick={onClose}><X/></button>
      <small>ADD READING</small>
      <h2>{meta.label}</h2>
      <p>Choose where this reading should be stored.</p>

      <div className="metric-choice-actions">
        <button
          className="link-choice"
          disabled={!cards.length}
          onClick={onLink}
        >
          <span><Link2/></span>
          <div>
            <b>Link to Health Metrics</b>
            <small>
              {cards.length
                ? 'Choose from all available Health Metric cards.'
                : 'No Health Metric cards are currently available.'}
            </small>
          </div>
          <ChevronRight/>
        </button>

        <button className="manual-choice" onClick={onManual}>
          <span><Plus/></span>
          <div>
            <b>Add manually</b>
            <small>Save inside Fasting and link it later if needed.</small>
          </div>
          <ChevronRight/>
        </button>
      </div>
    </aside>
  </div>
}

function CardPicker({metric,cards,value,onChange,onBack,onContinue,onClose}) {
  const suggested = suggestedCard(cards,metric)
  return <div className="fast-layer">
    <button className="fast-backdrop" aria-label="Close" onClick={onClose}/>
    <aside className="fast-drawer metric-card-picker">
      <button className="close" aria-label="Close" onClick={onClose}><X/></button>
      <small>LINK TO HEALTH METRICS</small>
      <h2>Select destination</h2>
      <p>Choose the Health Metric whose log should supply the Fasting graph and calculations.</p>

      <label>
        Available Health Metrics
        <select value={value} onChange={event=>onChange(event.target.value)}>
          {cards.map(card=><option key={card.card_id} value={card.card_id}>
            {card.display_label}{card.card_id===suggested?.card_id?' · Suggested':''}
          </option>)}
        </select>
      </label>

      <div className="fast-editor-actions">
        <button onClick={onBack}>Back</button>
        <button className="save" onClick={onContinue}><Link2/>Use this metric</button>
      </div>
    </aside>
  </div>
}

function ManualForm({metric,date,existing,linkedCard,onBack,onClose,onSaved,onLink}) {
  const meta = META[metric]
  const [value,setValue] = useState(existing?.normalized_value ?? existing?.value ?? '')
  const [time,setTime] = useState(existing?.normalized_time || existing?.time || '12:00')
  const [context,setContext] = useState(existing?.context || '')
  const [notes,setNotes] = useState(existing?.notes || '')
  const [error,setError] = useState('')

  function submit() {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      setError('Enter a valid value.')
      return
    }

    const input = {
      id: existing?.id || existing?.attachment_id,
      value:numeric,
      unit:meta.unit,
      date,
      time,
      context,
      notes
    }

    let row
    if (linkedCard) {
      saveMetricMapping(metric,{
        destination:'health_metrics',
        metric_card_id:linkedCard.card_id
      })
      row = saveMappedMetricReading(metric,input)
    } else {
      saveMetricMapping(metric,{destination:'fasting'})
      row = saveFastingOnlyReading({...input,metric_type:metric})
    }

    onSaved?.(row)
  }

  return <div className="fast-layer">
    <button className="fast-backdrop" aria-label="Close" onClick={onClose}/>
    <aside className="fast-drawer metric-recorder">
      <button className="close" aria-label="Close" onClick={onClose}><X/></button>
      <small>{linkedCard ? 'LINKED READING' : 'MANUAL READING'}</small>
      <h2>{meta.label}</h2>
      <p className="metric-record-source">
        {linkedCard
          ? `Destination: ${linkedCard.display_label}`
          : 'Stored in Fasting only'}
      </p>

      {error&&<div className="fast-validation-error"><b>Cannot save</b><span>{error}</span></div>}

      <div className="metric-recorder-grid">
        <label>Value<input type="number" step="any" value={value} onChange={e=>setValue(e.target.value)}/></label>
        <label>Unit<input value={meta.unit} readOnly/></label>
        <label>Date<input type="date" value={date} readOnly/></label>
        <label>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
      </div>

      <label>Context<input value={context} onChange={e=>setContext(e.target.value)}/></label>
      <label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>

      {!linkedCard&&<button className="link-later-button" onClick={onLink}>
        <Link2/> Link to Health Metrics
      </button>}

      <div className="fast-editor-actions">
        <button onClick={onBack}>Back</button>
        <button className="save" onClick={submit}><Save/>Save reading</button>
      </div>
    </aside>
  </div>
}

export default function FastingMetricRecorder({metric,date,onClose,onSaved,existing}) {
  const cards = useMemo(allHealthMetricCards,[])
  const mapping = listMetricMappings()[metric]
  const suggested = suggestedCard(cards,metric)
  const initialCard = cards.find(card=>String(card.card_id)===String(mapping?.metric_card_id)) || suggested || cards[0] || null
  const [step,setStep] = useState(existing ? 'form' : 'choice')
  const [cardId,setCardId] = useState(initialCard?.card_id || '')
  const [linked,setLinked] = useState(
    existing?.source === 'health_metrics' ? initialCard : null
  )

  const selectedCard = cards.find(card=>String(card.card_id)===String(cardId)) || cards[0] || null

  if (step==='choice') return <ChoiceScreen
    metric={metric}
    cards={cards}
    onLink={()=>setStep('cards')}
    onManual={()=>{setLinked(null);setStep('form')}}
    onClose={onClose}
  />

  if (step==='cards') return <CardPicker
    metric={metric}
    cards={cards}
    value={cardId}
    onChange={setCardId}
    onBack={()=>setStep('choice')}
    onContinue={()=>{setLinked(selectedCard);setStep('form')}}
    onClose={onClose}
  />

  return <ManualForm
    metric={metric}
    date={date}
    existing={existing}
    linkedCard={linked}
    onBack={()=>setStep(linked?'cards':'choice')}
    onLink={()=>setStep('cards')}
    onClose={onClose}
    onSaved={onSaved}
  />
}
