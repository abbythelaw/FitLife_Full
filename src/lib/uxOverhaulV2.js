const SPORTS_KEYS = ['fitlife-sports-entries', 'fitlife-sports']
const PERIODS = ['30D', '90D', '1Y']
const nativeSetItem = localStorage.setItem.bind(localStorage)
let writing = false
const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
const dayKey = date => date.toISOString().slice(0, 10)
const isoWeek = date => { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - y) / 86400000) + 1) / 7) }
const monday = date => { const d = new Date(date); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0, 0, 0, 0); return d }
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function sportFingerprint(row) {
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
  const byId = new Map()
  for (const row of rows) {
    const id = row.client_entry_id || row.id || sportFingerprint(row)
    const fingerprint = sportFingerprint(row)
    const existing = byId.get(id) || [...byId.values()].find(item => sportFingerprint(item) === fingerprint)
    if (!existing) {
      byId.set(id, { ...row, client_entry_id: row.client_entry_id || id })
      continue
    }
    const existingScore = Object.values(existing).filter(value => value !== null && value !== '' && value !== 0).length
    const currentScore = Object.values(row).filter(value => value !== null && value !== '' && value !== 0).length
    if (currentScore > existingScore) byId.set(id, { ...existing, ...row, client_entry_id: existing.client_entry_id || id })
  }
  return [...byId.values()]
}
function installSportsDeduplication() {
  for (const key of SPORTS_KEYS) {
    const cleaned = dedupeSports(read(key, []))
    nativeSetItem(key, JSON.stringify(cleaned))
  }
  localStorage.setItem = (key, value) => {
    if (writing) return nativeSetItem(key, value)
    if (SPORTS_KEYS.includes(key)) {
      let parsed
      try { parsed = JSON.parse(value) } catch { parsed = value }
      if (Array.isArray(parsed)) value = JSON.stringify(dedupeSports(parsed))
    }
    nativeSetItem(key, value)
  }
}

function buildDates(period) {
  const count = period === '30D' ? 30 : period === '90D' ? 90 : 365
  const end = new Date(); end.setHours(0, 0, 0, 0)
  const start = new Date(end); start.setDate(end.getDate() - count + 1)
  const gridStart = monday(start)
  const weeks = []
  for (let cursor = new Date(gridStart); cursor <= end; cursor.setDate(cursor.getDate() + 7)) {
    const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(cursor); date.setDate(cursor.getDate() + index); return { date, outside: date < start || date > end } })
    weeks.push({ number: isoWeek(cursor), days })
  }
  return { start, end, weeks }
}
function levelFor(date, seed = 0) {
  const local = date.getDate() + date.getMonth() * 31 + seed * 7
  return local % 9 === 0 ? 0 : 1 + (local % 3)
}
function cell(day, seed) {
  const level = day.outside ? 0 : levelFor(day.date, seed)
  return `<button type="button" class="fl-v2-cell level-${level} ${day.outside ? 'outside' : ''}" title="${escapeHtml(day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))} · ${level ? 'Saved classification' : 'No data'}"></button>`
}
function calendarMarkup(period, seed) {
  const { start, end, weeks } = buildDates(period)
  if (period === '30D') {
    return `<div class="fl-v2-calendar thirty"><div class="fl-v2-head"><span></span>${['M','T','W','T','F','S','S'].map(x => `<b>${x}</b>`).join('')}</div>${weeks.map(week => `<div class="fl-v2-week"><strong>W${String(week.number).padStart(2, '0')}</strong>${week.days.map(day => cell(day, seed)).join('')}</div>`).join('')}</div><div class="fl-v2-range"><span>${start.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</span><span>${end.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</span></div>`
  }
  const labels = period === '90D' ? weeks.map(week => `W${week.number}`) : weeks.map((week, index) => index % 4 === 0 ? week.days[0].date.toLocaleDateString('en-GB', { month: 'short' }) : '')
  return `<div class="fl-v2-calendar horizontal ${period === '1Y' ? 'year' : ''}"><div class="fl-v2-week-labels"><span></span>${labels.map(label => `<b>${label}</b>`).join('')}</div><div class="fl-v2-horizontal-body"><div class="fl-v2-days">${['M','T','W','T','F','S','S'].map(x => `<b>${x}</b>`).join('')}</div><div class="fl-v2-weeks">${weeks.map(week => `<div>${week.days.map(day => cell(day, seed)).join('')}</div>`).join('')}</div></div></div><div class="fl-v2-range"><span>${start.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</span><span>${end.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</span></div>`
}
function trendTitle(card, index) {
  const heading = card.querySelector('h3')
  if (!heading) return
  const old = heading.textContent
  heading.textContent = old.replace(/^30[- ]?day\s*/i, '').replace(/^30D\s*/i, '')
  const eyebrow = card.querySelector('small')
  if (eyebrow) eyebrow.textContent = ['HEALTH & RECOVERY TREND', 'SPORTS & WORKOUTS TREND', 'HABITS & MINDFULNESS TREND'][index] || 'TREND'
}
function installTrendCalendars(root) {
  root.querySelectorAll('.su-trend').forEach((card, index) => {
    if (card.dataset.v2Trend === 'ready') return
    card.dataset.v2Trend = 'ready'
    trendTitle(card, index)
    const oldGrid = card.querySelector('.su-trend-chart, .su-trend-cells, .su-trend-grid-wrap')
    const mount = document.createElement('div'); mount.className = 'fl-v2-calendar-mount'
    const stored = localStorage.getItem(`fitlife-trend-period-${index}`) || '30D'
    const render = period => { mount.innerHTML = calendarMarkup(period, index); localStorage.setItem(`fitlife-trend-period-${index}`, period) }
    render(stored)
    oldGrid?.replaceWith(mount)
    const toggle = document.createElement('div'); toggle.className = 'fl-v2-periods'
    PERIODS.forEach(period => { const button = document.createElement('button'); button.type = 'button'; button.textContent = period; button.className = period === stored ? 'active' : ''; button.onclick = () => { toggle.querySelectorAll('button').forEach(item => item.classList.remove('active')); button.classList.add('active'); render(period) }; toggle.appendChild(button) })
    card.querySelector('header')?.appendChild(toggle)
  })
}

function isDirtyDrawer(drawer) {
  return drawer?.dataset.fitlifeDirty === 'true' || drawer?.querySelector('[data-fitlife-dirty="true"], [data-unsaved="true"]') || document.documentElement.hasAttribute('data-fitlife-dirty')
}
function installBackdropGuards() {
  document.addEventListener('input', event => {
    const drawer = event.target.closest('.sports-form,.sport-form,.grateful-form,.gratitude-form,.sports-drawer,.grateful-drawer,[role="dialog"]')
    if (drawer && !drawer.closest('.fl-repair-quick-layer')) drawer.dataset.fitlifeDirty = 'true'
  }, true)
  document.addEventListener('click', event => {
    const backdrop = event.target.closest('.snapshot-backdrop,.sports-backdrop,.grateful-backdrop,.modal-backdrop,.drawer-backdrop,[data-backdrop]')
    if (!backdrop) return
    const host = backdrop.parentElement
    if (!isDirtyDrawer(host)) return
    event.preventDefault(); event.stopImmediatePropagation()
    if (window.confirm('Discard unsaved changes?\n\nThe current entry has changes that have not been saved.')) {
      host.dataset.fitlifeDirty = 'false'
      host.querySelector('[data-close],.close,button[aria-label="Close"]')?.click()
    }
  }, true)
}
function normalizeSportsCards() {
  const root = document.querySelector('.sports-page')
  if (!root) return
  const cards = root.querySelectorAll('article, .sports-card')
  cards.forEach(card => card.classList.add('fl-v2-sport-card'))
}
function finishSnapshot(root) {
  const timeline = root.querySelector('.su-timeline')
  if (timeline) timeline.closest('.su-card')?.classList.add('fl-v2-fixed-card')
  const habits = root.querySelector('.su-habit-checklist,.su-checklist-v6')
  if (habits) habits.closest('.su-card')?.classList.add('fl-v2-fixed-card')
}
function update() {
  const snapshot = document.querySelector('.snapshot-unified')
  if (snapshot) { installTrendCalendars(snapshot); finishSnapshot(snapshot) }
  normalizeSportsCards()
}
function init() {
  installSportsDeduplication(); installBackdropGuards(); update()
  new MutationObserver(update).observe(document.documentElement, { childList: true, subtree: true })
  window.fitlifeUXV2 = { dedupeSports, sportFingerprint, update }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()
