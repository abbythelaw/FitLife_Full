const nativeSet = localStorage.setItem.bind(localStorage)
const SPORTS_KEYS = ['fitlife-sports-entries', 'fitlife-sports']
const HISTORY_KEY = 'fitlife-bivariate-history'
let deleteDialog = null

const read = (key, fallback = []) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
const dayKey = value => new Date(value).toISOString().slice(0, 10)
const isoWeek = date => {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7))
  const start = new Date(Date.UTC(value.getUTCFullYear(), 0, 1))
  return Math.ceil((((value - start) / 86400000) + 1) / 7)
}
const monday = date => {
  const value = new Date(date)
  const day = value.getDay() || 7
  value.setDate(value.getDate() - day + 1)
  value.setHours(0, 0, 0, 0)
  return value
}

const CLASSIFICATIONS = {
  health: {
    'Peak Readiness': '#3f516d',
    'Productive Momentum': '#6685b2',
    'Training Opportunity': '#5ca69a',
    'Balanced Recovery': '#9ca8c7',
    'Recovery Needed': '#b8d9c6',
    'Under-Recovered': '#ddb3bd',
    'Overloaded': '#b76f83',
    'High Strain Alert': '#745d87',
    'Maximum Performance': '#493d59',
  },
  training: {
    'Peak Training Demand': '#424872',
    'Productive Training': '#477fa5',
    'Aerobic Base': '#69ad7d',
    'Balanced Training Load': '#75aaa8',
    'Recovery Block': '#eee6cd',
    'Low Training Stimulus': '#c5d9a7',
    'Power Stimulus': '#d9b77d',
    'Intensity Overload': '#bc7554',
    'Heavy Training Block': '#7869a7',
  },
  habits: {
    'Consistent and Restored': '#566e9c',
    'Sustainable Rhythm': '#68b19d',
    'High Consistency': '#add7ba',
    'Balanced Routine': '#96bbb5',
    'Passive Reset': '#8089bd',
    'Habit Rebuild': '#c9badd',
    'Burnout Risk': '#d9c8ca',
    'Routine Drift': '#ead9df',
    'Strong Momentum': '#6494a5',
  },
}
const NO_DATA = '#434a47'

function sportsFingerprint(row) {
  return [
    row.client_entry_id || row.source_id || '',
    row.category || row.activity_type || row.sport || '',
    row.entry_date || row.date || '',
    row.start_time || row.time || '',
    Number(row.duration_minutes || row.duration || 0),
    Number(row.distance_km || row.distance || 0),
  ].map(value => String(value).trim().toLowerCase()).join('|')
}
function dedupeSports(rows) {
  if (!Array.isArray(rows)) return rows
  const results = []
  const fingerprints = new Map()
  for (const source of rows) {
    const row = { ...source }
    row.client_entry_id ||= row.id || crypto.randomUUID()
    const fingerprint = sportsFingerprint(row)
    const previousIndex = fingerprints.get(fingerprint)
    if (previousIndex == null) {
      fingerprints.set(fingerprint, results.length)
      results.push(row)
      continue
    }
    const previous = results[previousIndex]
    const quality = value => Object.values(value).filter(item => item !== null && item !== '' && item !== 0).length
    results[previousIndex] = quality(row) > quality(previous) ? { ...previous, ...row, client_entry_id: previous.client_entry_id } : { ...row, ...previous, client_entry_id: previous.client_entry_id }
  }
  return results
}
function installSportsDeduplication() {
  for (const key of SPORTS_KEYS) nativeSet(key, JSON.stringify(dedupeSports(read(key, []))))
  localStorage.setItem = (key, value) => {
    if (SPORTS_KEYS.includes(key)) {
      try { value = JSON.stringify(dedupeSports(JSON.parse(value))) } catch {}
    }
    nativeSet(key, value)
  }
}

function mediaOf(card) {
  const entryId = card.dataset.entryId || card.dataset.id
  const rows = dedupeSports(read('fitlife-sports-entries', read('fitlife-sports', [])))
  const title = card.querySelector('h2,h3')?.textContent?.trim()
  const row = rows.find(item => String(item.id) === String(entryId)) || rows.find(item => String(item.title).trim() === title)
  if (!row) return []
  const photos = Array.isArray(row.photos) ? row.photos : Array.isArray(row.media) ? row.media : []
  return photos.map((photo, index) => ({
    src: photo.signed_url || photo.url || photo.data_url || photo.preview || photo.storage_url || '',
    positionX: Number(photo.position_x ?? photo.x ?? row.position_x ?? 50),
    positionY: Number(photo.position_y ?? photo.y ?? row.position_y ?? 50),
    scale: Number(photo.crop_scale ?? photo.scale ?? row.crop_scale ?? 1),
    featured: Boolean(photo.featured ?? index === Number(row.featured_index || 0)),
  })).filter(photo => photo.src)
}
function installSportsCarousel() {
  document.querySelectorAll('.sports-page article, .sports-page .sports-card').forEach(card => {
    if (card.dataset.v3Carousel === 'ready') return
    const photos = mediaOf(card)
    const existing = card.querySelector('img')
    if (!photos.length && existing?.src) photos.push({ src: existing.src, positionX: 50, positionY: 50, scale: 1, featured: true })
    if (!photos.length) return
    card.dataset.v3Carousel = 'ready'
    const imageHost = existing?.parentElement || card.querySelector('.sports-photo,.sports-hero')
    if (!imageHost) return
    imageHost.innerHTML = `<div class="fl-v3-media-track">${photos.map((photo, index) => `<figure data-photo-index="${index}"><img src="${escapeHtml(photo.src)}" alt="" draggable="false" style="object-position:${photo.positionX}% ${photo.positionY}%;transform:scale(${photo.scale})">${photo.featured ? '<span>★ Featured</span>' : ''}</figure>`).join('')}</div>${photos.length > 1 ? `<button type="button" class="fl-v3-media-prev" aria-label="Previous photo">‹</button><button type="button" class="fl-v3-media-next" aria-label="Next photo">›</button><div class="fl-v3-media-dots">${photos.map((_, index) => `<button type="button" data-dot="${index}" class="${index === 0 ? 'active' : ''}" aria-label="Photo ${index + 1}"></button>`).join('')}</div>` : ''}`
    const track = imageHost.querySelector('.fl-v3-media-track')
    const go = index => {
      const safe = Math.max(0, Math.min(photos.length - 1, index))
      track.scrollTo({ left: safe * track.clientWidth, behavior: 'smooth' })
      imageHost.querySelectorAll('[data-dot]').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === safe))
      imageHost.dataset.activePhoto = safe
    }
    imageHost.querySelector('.fl-v3-media-prev')?.addEventListener('click', event => { event.stopPropagation(); go(Number(imageHost.dataset.activePhoto || 0) - 1) })
    imageHost.querySelector('.fl-v3-media-next')?.addEventListener('click', event => { event.stopPropagation(); go(Number(imageHost.dataset.activePhoto || 0) + 1) })
    imageHost.querySelectorAll('[data-dot]').forEach(dot => dot.addEventListener('click', event => { event.stopPropagation(); go(Number(dot.dataset.dot)) }))
    track.addEventListener('scroll', () => {
      const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth))
      imageHost.dataset.activePhoto = index
      imageHost.querySelectorAll('[data-dot]').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index))
    }, { passive: true })
  })
}

function createDeleteDialog() {
  if (deleteDialog) return deleteDialog
  deleteDialog = document.createElement('div')
  deleteDialog.className = 'fl-v3-delete-layer'
  deleteDialog.hidden = true
  deleteDialog.innerHTML = '<button type="button" class="fl-v3-delete-backdrop" aria-label="Cancel deletion"></button><section role="alertdialog" aria-modal="true"><small>CONFIRM DELETE</small><h2>Delete record?</h2><p>This item will be permanently removed. This action cannot be undone.</p><div><button type="button" data-delete-cancel>Cancel</button><button type="button" class="danger" data-delete-confirm>Delete</button></div></section>'
  document.body.appendChild(deleteDialog)
  return deleteDialog
}
function askDelete({ title, message, confirm }) {
  const layer = createDeleteDialog()
  layer.querySelector('h2').textContent = title || 'Delete record?'
  layer.querySelector('p').textContent = message || 'This item will be permanently removed. This action cannot be undone.'
  layer.hidden = false
  const cleanup = () => { layer.hidden = true; cancel.onclick = null; okay.onclick = null; backdrop.onclick = null }
  const cancel = layer.querySelector('[data-delete-cancel]')
  const okay = layer.querySelector('[data-delete-confirm]')
  const backdrop = layer.querySelector('.fl-v3-delete-backdrop')
  cancel.onclick = cleanup
  backdrop.onclick = cleanup
  okay.onclick = async () => {
    okay.disabled = true; okay.textContent = 'Deleting…'
    try { await confirm?.(); cleanup() } catch (error) { console.error(error); alert(error.message || 'Delete failed.'); okay.disabled = false; okay.textContent = 'Delete' }
  }
}
function installDeleteInterception() {
  document.addEventListener('click', event => {
    const button = event.target.closest('button,a,[role="button"]')
    if (!button || button.closest('.fl-v3-delete-layer')) return
    const label = `${button.textContent || ''} ${button.getAttribute('aria-label') || ''}`.trim()
    if (!/\b(delete|remove)\b/i.test(label)) return
    event.preventDefault(); event.stopImmediatePropagation()
    const card = button.closest('article,.sports-card,[data-record-id],[role="dialog"]')
    const title = card?.querySelector('h2,h3,b')?.textContent?.trim() || 'this record'
    askDelete({ title: `Delete ${title}?`, message: `“${title}” and any associated media will be removed. This action cannot be undone.`, confirm: async () => {
      button.dataset.deleteConfirmed = 'true'
      button.click()
      setTimeout(() => delete button.dataset.deleteConfirmed, 0)
    } })
  }, true)
}

function historyRows(matrix) {
  const raw = read(HISTORY_KEY, [])
  const aliases = { health: ['health','health_recovery'], training: ['training','sports','sports_workouts'], habits: ['habits','habits_mindfulness'] }
  return raw.filter(row => aliases[matrix]?.includes(row.matrix || row.metric_type)).map(row => ({ ...row, date: row.date || String(row.recorded_at || '').slice(0, 10) }))
}
function classificationColor(matrix, classification) {
  return CLASSIFICATIONS[matrix]?.[classification] || NO_DATA
}
function buildCalendarDates(period) {
  const count = period === '30D' ? 30 : period === '90D' ? 90 : 365
  const end = new Date(); end.setHours(0,0,0,0)
  const start = new Date(end); start.setDate(end.getDate() - count + 1)
  const gridStart = monday(start)
  const weeks = []
  for (let cursor = new Date(gridStart); cursor <= end; cursor.setDate(cursor.getDate() + 7)) {
    weeks.push({ number: isoWeek(cursor), days: Array.from({ length: 7 }, (_, index) => { const date = new Date(cursor); date.setDate(cursor.getDate() + index); return { date, key: dayKey(date), outside: date < start || date > end } }) })
  }
  return weeks
}
function bivariateCell(day, record, matrix) {
  const hasData = record && record.x_value != null && record.y_value != null && record.classification
  const color = hasData ? classificationColor(matrix, record.classification) : NO_DATA
  const label = hasData ? `${record.classification} · ${record.y_value} / ${record.x_value}` : 'No data'
  return `<button type="button" class="fl-v3-bi-cell ${hasData ? '' : 'no-data'} ${day.outside ? 'outside' : ''}" style="--cell:${color}" data-history-id="${escapeHtml(record?.id || '')}" data-date="${day.key}" title="${escapeHtml(day.date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}))} · ${escapeHtml(label)}"></button>`
}
function bivariateCalendar(period, matrix) {
  const rows = historyRows(matrix)
  const byDate = new Map(rows.map(row => [row.date, row]))
  const weeks = buildCalendarDates(period)
  if (period === '30D') {
    return `<div class="fl-v3-calendar-box"><div class="fl-v3-thirty"><div class="head"><span></span>${['M','T','W','T','F','S','S'].map(x=>`<b>${x}</b>`).join('')}</div>${weeks.map(week=>`<div class="week"><strong>W${String(week.number).padStart(2,'0')}</strong>${week.days.map(day=>bivariateCell(day,byDate.get(day.key),matrix)).join('')}</div>`).join('')}</div>${legend(matrix)}</div>`
  }
  const labels = period === '90D' ? weeks.map(week => `W${week.number}`) : weeks.map((week,index) => index % 4 === 0 ? week.days[0].date.toLocaleDateString('en-GB',{month:'short',year:'2-digit'}).replace(' ',' ') : '')
  return `<div class="fl-v3-calendar-box"><div class="fl-v3-horizontal ${period==='1Y'?'year':''}"><div class="week-labels"><span></span>${labels.map(label=>`<b>${label}</b>`).join('')}</div><div class="body"><div class="days">${['M','T','W','T','F','S','S'].map(x=>`<b>${x}</b>`).join('')}</div><div class="weeks">${weeks.map(week=>`<div>${week.days.map(day=>bivariateCell(day,byDate.get(day.key),matrix)).join('')}</div>`).join('')}</div></div></div>${legend(matrix)}</div>`
}
function legend(matrix) {
  const entries = Object.entries(CLASSIFICATIONS[matrix] || {}).slice(0, 5)
  entries.push(['No data', NO_DATA])
  return `<div class="fl-v3-legend">${entries.map(([name,color])=>`<span><i style="background:${color}"></i>${escapeHtml(name)}</span>`).join('')}</div>`
}
function historyDialog(record, matrix) {
  const layer = document.createElement('div'); layer.className = 'fl-v3-history-layer'
  const color = record ? classificationColor(matrix, record.classification) : NO_DATA
  layer.innerHTML = `<button type="button" class="fl-v3-history-backdrop"></button><section><button type="button" class="close">×</button><small>HISTORICAL CLASSIFICATION</small><h2>${record ? escapeHtml(record.classification) : 'No data'}</h2><time>${escapeHtml(record?.date || 'Date unavailable')}</time><div class="state" style="--state:${color}"></div>${record ? `<dl><div><dt>Y value</dt><dd>${escapeHtml(record.y_value)}</dd></div><div><dt>X value</dt><dd>${escapeHtml(record.x_value)}</dd></div></dl><footer><button type="button" class="danger">Delete record</button></footer>` : '<p>There is not enough saved information to calculate a classification for this date.</p>'}</section>`
  document.body.appendChild(layer)
  const close = () => layer.remove()
  layer.querySelector('.close').onclick = close; layer.querySelector('.fl-v3-history-backdrop').onclick = close
  layer.querySelector('footer .danger')?.addEventListener('click', () => askDelete({ title: 'Delete historical classification?', message: 'The stored historical classification will be removed. This action cannot be undone.', confirm: async () => { const rows = read(HISTORY_KEY, []).filter(row => row.id !== record.id); nativeSet(HISTORY_KEY, JSON.stringify(rows)); close(); installBivariateCalendars(true) } }))
}
function matrixType(card, index) { const text = card.textContent.toLowerCase(); return /health|recovery/.test(text) ? 'health' : /sport|workout|training/.test(text) ? 'training' : /habit|mindful/.test(text) ? 'habits' : ['health','training','habits'][index] }
function installBivariateCalendars(force = false) {
  document.querySelectorAll('.snapshot-unified .su-trend').forEach((card,index) => {
    if (card.dataset.v3Bivariate === 'ready' && !force) return
    card.dataset.v3Bivariate = 'ready'
    const matrix = matrixType(card,index)
    let mount = card.querySelector('.fl-v3-bi-mount')
    if (!mount) { mount = document.createElement('div'); mount.className='fl-v3-bi-mount'; card.querySelector('.fl-v2-calendar-mount,.su-trend-chart,.su-trend-cells')?.replaceWith(mount) }
    let period = localStorage.getItem(`fitlife-trend-period-${matrix}`) || '30D'
    const render = () => { mount.innerHTML = bivariateCalendar(period,matrix); mount.querySelectorAll('.fl-v3-bi-cell').forEach(cell => cell.onclick = () => { const row = historyRows(matrix).find(item => item.id === cell.dataset.historyId || item.date === cell.dataset.date); historyDialog(row,matrix) }) }
    render()
    let toggle = card.querySelector('.fl-v3-periods')
    if (!toggle) { toggle=document.createElement('div');toggle.className='fl-v3-periods';card.querySelector('header')?.appendChild(toggle) }
    toggle.innerHTML=['30D','90D','1Y'].map(value=>`<button type="button" class="${value===period?'active':''}" data-period="${value}">${value}</button>`).join('')
    toggle.querySelectorAll('button').forEach(button=>button.onclick=()=>{period=button.dataset.period;localStorage.setItem(`fitlife-trend-period-${matrix}`,period);toggle.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===button));render()})
  })
}

function update() { installSportsCarousel(); installBivariateCalendars() }
function init() {
  installSportsDeduplication(); installDeleteInterception(); update()
  new MutationObserver(update).observe(document.documentElement,{childList:true,subtree:true})
  window.fitlifeUXV3 = { update, dedupeSports, askDelete, installBivariateCalendars }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
