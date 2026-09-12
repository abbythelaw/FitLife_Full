const NUTRITION_KEY = 'fitlife-nutrition-daily'
const HEALTH_KEY = 'fitlife-health-readings-v2'

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
    glucose:['glucose','blood glucose','blood-glucose','blood_glucose'],
    rhr:['rhr','resting heart rate','resting-heart-rate','resting_heart_rate'],
    weight:['weight','body weight','body-weight','body_weight'],
    hba1c:['hba1c','a1c','haemoglobin a1c','hemoglobin a1c']
  }
  const accepted=(aliases[metric]||[metric]).map(normalizeText)
  const definitions=parse(localStorage.getItem('fitlife-health-defs-v2'),[])
  const mapping=listMetricMappings()[metric]
  const mappedId=String(mapping?.metric_card_id||'')
  const matchingDefinitionIds=new Set(
    definitions
      .filter(definition=>{
        const label=normalizeText(definition.name||definition.label||definition.short||definition.id)
        return String(definition.id)===mappedId || accepted.some(alias=>label===alias||label.includes(alias))
      })
      .map(definition=>String(definition.id))
  )
  if(mappedId) matchingDefinitionIds.add(mappedId)

  return normalizedHealthReadings()
    .filter(row=>{
      const rowMetricId=String(row.metric_id||row.metric_card_id||row.card_id||'')
      const rowLabel=normalizeText(row.normalized_metric||row.metric||row.name||row.label)
      return matchingDefinitionIds.has(rowMetricId) || accepted.some(alias=>rowLabel===alias||rowLabel.includes(alias))
    })
    .filter(isRealHealthReading)
    .sort((left,right)=>`${right.normalized_date}T${right.normalized_time||'00:00'}`.localeCompare(`${left.normalized_date}T${left.normalized_time||'00:00'}`))
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



export function isRealHealthReading(row) {
  if (!row || typeof row !== 'object') return false

  const marker = [
    row.id,
    row.record_id,
    row.reading_id,
    row.source,
    row.origin,
    row.name,
    row.label,
    row.notes
  ].filter(Boolean).join(' ').toLowerCase()

  const explicitlySynthetic =
    row.is_dummy === true ||
    row.isDummy === true ||
    row.is_demo === true ||
    row.isDemo === true ||
    row.is_sample === true ||
    row.isSample === true ||
    row.synthetic === true ||
    row.placeholder === true ||
    marker.includes('dummy') ||
    marker.includes('sample data') ||
    marker.includes('demo data') ||
    marker.includes('placeholder') ||
    marker.includes('synthetic')

  if (explicitlySynthetic || row.deleted_at) return false

  const value = Number(
    row.normalized_value ??
    row.value ??
    row.numeric_value ??
    row.reading ??
    row.amount ??
    row.result
  )

  const date = String(
    row.normalized_date ||
    row.record_date ||
    row.entry_date ||
    row.local_date ||
    row.date ||
    row.reading_date ||
    row.occurred_at ||
    row.created_at ||
    ''
  ).slice(0, 10)

  return Number.isFinite(value) && /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export function normalizedHealthReadings() {
  const candidates = [
    'fitlife-health-readings-v2',
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

  return [...byId.values()].filter(isRealHealthReading).sort((left, right) => {
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


export const FASTING_LOCAL_READINGS_KEY='fitlife-fasting-local-readings'
export const METRIC_MAPPING_KEY='fitlife-fasting-metric-mapping'

export function listFastingLocalReadings(){
  return parse(localStorage.getItem(FASTING_LOCAL_READINGS_KEY),[])
}

export function listMetricMappings(){
  return parse(localStorage.getItem(METRIC_MAPPING_KEY),{})
}

export function saveMetricMapping(metric,mapping){
  const next={...listMetricMappings(),[metric]:mapping}
  localStorage.setItem(METRIC_MAPPING_KEY,JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('fitlife:metric-mapping-changed',{detail:next}))
  return next
}

export function compatibleHealthMetricCards(metric){
  const keys=['fitlife-health-defs-v2','fitlife-health-cards','fitlife-health-metrics','health-metric-cards']
  const aliases={
    glucose:['glucose','blood glucose','fasting glucose'],
    rhr:['rhr','resting heart rate'],
    weight:['weight','body weight'],
    hba1c:['hba1c','a1c','haemoglobin a1c','hemoglobin a1c']
  }
  const accepted=aliases[metric]||[metric]
  const found=[]
  for(const key of keys){
    const rows=parse(localStorage.getItem(key),[])
    if(!Array.isArray(rows))continue
    for(const row of rows){
      const label=String(row.name||row.label||row.metric||row.type||'').toLowerCase()
      if(accepted.some(alias=>label.includes(alias))) found.push({...row,card_id:String(row.id||row.card_id||label)})
    }
  }
  return [...new Map(found.map(row=>[row.card_id,row])).values()]
}

export function saveFastingOnlyReading(input){
  const row={...input,id:input.id||crypto.randomUUID(),source:'fasting',updated_at:new Date().toISOString()}
  const next=[row,...listFastingLocalReadings().filter(x=>x.id!==row.id)]
  localStorage.setItem(FASTING_LOCAL_READINGS_KEY,JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('fitlife:fasting-local-readings-changed',{detail:next}))
  return row
}


export function saveMappedMetricReading(metric,input){
  const definitions=healthMetricDefinitions()
  const preferredId=String(input.metric_card_id||listMetricMappings()[metric]?.metric_card_id||'')
  const selected=definitions.find(card=>String(card.id||card.card_id)===preferredId)
    || compatibleHealthMetricCards(metric)[0]
  if(!selected)return saveFastingOnlyReading({...input,metric_type:metric})
  const key='fitlife-health-readings-v2'
  const existing=parse(localStorage.getItem(key),[])
  const date=input.date||localDateKey(),time=input.time||'12:00'
  const id=input.id||crypto.randomUUID()
  const row={id,metric_id:selected.id||selected.metric_id||selected.card_id,value:Number(input.value),unit:input.unit,recorded_at:`${date}T${time}:00`,record_date:date,local_date:date,notes:input.notes||'',context:input.context||'',source_type:'fasting-linked',updated_at:new Date().toISOString()}
  const next=[row,...existing.filter(item=>String(item.id)!==String(id))]
  localStorage.setItem(key,JSON.stringify(next))
  saveMetricMapping(metric,{destination:'health_metrics',metric_card_id:String(selected.id||selected.card_id)})
  window.dispatchEvent(new CustomEvent('fitlife:health-readings-changed',{detail:next}))
  return {...row,source:'health_metrics'}
}

export function allReadingsForMetric(metric){
 const linked=readingsForMetric(metric)
 const local=listFastingLocalReadings().filter(row=>String(row.metric_type||row.metric||'').toLowerCase()===metric).map(row=>({...row,normalized_date:row.date,normalized_time:row.time||'',normalized_metric:metric,normalized_value:Number(row.value),normalized_unit:row.unit||'',attachment_id:row.id,source:'fasting'}))
 return [...linked,...local].filter(isRealHealthReading).filter((row,index,all)=>all.findIndex(item=>String(item.attachment_id||item.id)===String(row.attachment_id||row.id))===index).sort((a,b)=>`${b.normalized_date}T${b.normalized_time||'00:00'}`.localeCompare(`${a.normalized_date}T${a.normalized_time||'00:00'}`))
}


export function healthMetricDefinitions(){
  const rows=parse(localStorage.getItem('fitlife-health-defs-v2'),[])
  return Array.isArray(rows)?rows.filter(row=>row&&!row.deleted_at):[]
}

export function healthMetricDefinitionForReading(row,metric){
  const definitions=healthMetricDefinitions()
  const mappings=listMetricMappings()
  const mappedId=String(mappings[metric]?.metric_card_id||'')
  const rowId=String(row?.metric_id||row?.metric_card_id||row?.card_id||'')
  return definitions.find(def=>String(def.id)===rowId)
    || definitions.find(def=>String(def.id)===mappedId)
    || definitions.find(def=>normalizeText(def.name||def.short||def.id).includes(normalizeText(metric)))
    || null
}

export function displayReadingsForMetric(metric){
  return allReadingsForMetric(metric).map(row=>{
    const definition=healthMetricDefinitionForReading(row,metric)
    const linked=row.source==='health_metrics'||row.source_type==='fasting-linked'||Boolean(definition)
    return {
      ...row,
      display_source:linked?'linked':'manual',
      display_metric_name:linked?(definition?.name||definition?.short||'Health Metrics'):'Fasting',
      display_colour:linked?(definition?.color||definition?.colour||null):null,
      configured_min:definition?.min??definition?.minimum_value??definition?.range_min??null,
      configured_max:definition?.max??definition?.maximum_value??definition?.range_max??null,
      configured_target:definition?.target??definition?.target_value??null,
      configured_mode:definition?.targetMode||definition?.target_mode||definition?.target_type||null
    }
  })
}


// FASTING MASTER P33 DATA HELPERS
export function p33HealthMetricDefinitions(){
  const rows=parse(localStorage.getItem('fitlife-health-defs-v2'),[])
  return Array.isArray(rows)?rows.filter(row=>row&&!row.deleted_at&&!row.is_dummy&&!row.is_demo&&!row.is_sample):[]
}
export function p33DefinitionForReading(row,metric){
  const defs=p33HealthMetricDefinitions(),mapping=listMetricMappings()[metric]
  const ids=[row?.metric_id,row?.metric_card_id,row?.card_id,mapping?.metric_card_id].filter(Boolean).map(String)
  return defs.find(def=>ids.includes(String(def.id)))||defs.find(def=>normalizeText(def.name||def.short||def.id).includes(normalizeText(metric)))||null
}
export function p33DisplayReadings(metric){
  return allReadingsForMetric(metric).filter(isRealHealthReading).map(row=>{
    const def=p33DefinitionForReading(row,metric)
    const linked=Boolean(def)||row.source==='health_metrics'||row.source_type==='fasting-linked'
    return {...row,display_source:linked?'linked':'manual',display_metric_name:linked?(def?.name||def?.short||'Health Metrics'):'Fasting',display_colour:linked?(def?.color||def?.colour||null):null,configured_min:def?.min??def?.minimum_value??def?.range_min??null,configured_max:def?.max??def?.maximum_value??def?.range_max??null,configured_target:def?.target??def?.target_value??null,configured_mode:def?.targetMode||def?.target_mode||def?.target_type||null}
  })
}
