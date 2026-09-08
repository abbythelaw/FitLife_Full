import { supabase } from './supabaseClient'

const DRAFT_PREFIX = 'fitlife-draft-'
const DIRTY_ATTRIBUTE = 'data-fitlife-dirty'
let drawer = null
let currentTab = 'habits'
let currentDate = new Date()
let dirty = false
let uploadPatchInstalled = false

const read = (key, fallback = []) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const dateKey = value => value.toISOString().slice(0, 10)
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]))

function activeHabits() {
  return read('fitlife-habits', []).filter(habit => !habit.archived && !habit.deleted && !habit.paused)
}
function healthMetrics() {
  return read('fitlife-health-defs-v2', read('fitlife-health-defs', []))
}
function getDraft(tab = currentTab) {
  return read(`${DRAFT_PREFIX}${tab}-${dateKey(currentDate)}`, {})
}
function saveDraft(tab, value) {
  localStorage.setItem(`${DRAFT_PREFIX}${tab}-${dateKey(currentDate)}`, JSON.stringify(value))
  setDirty(true)
}
function clearDraft(tab = currentTab) {
  localStorage.removeItem(`${DRAFT_PREFIX}${tab}-${dateKey(currentDate)}`)
}
function setDirty(value) {
  dirty = Boolean(value)
  document.documentElement.toggleAttribute(DIRTY_ATTRIBUTE, dirty)
  drawer?.querySelector('.fl-repair-unsaved')?.toggleAttribute('hidden', !dirty)
}
function confirmDiscard(action) {
  if (!dirty || window.confirm('Discard unsaved changes?\n\nThe current entry has changes that have not been saved.')) {
    setDirty(false)
    action?.()
    return true
  }
  return false
}

function renderTabs() {
  const tabs = [
    ['habits', '✓', 'Habits'],
    ['health', '♥', 'Health'],
    ['exercise', '◆', 'Exercise'],
    ['sports', '●', 'Sports'],
    ['fasting', '🔥', 'Fasting'],
    ['gratitude', '✦', 'Gratitude'],
  ]
  return tabs.map(([id, icon, label]) => `<button type="button" data-quick-tab="${id}" class="${id === currentTab ? 'active' : ''}"><span>${icon}</span>${label}</button>`).join('')
}
function renderHabits() {
  const draft = getDraft('habits')
  const habits = activeHabits()
  if (!habits.length) return '<div class="fl-repair-empty"><b>No active habits</b><span>Create or activate habits from the Habits tab.</span><button type="button" data-open-tab="habits">Open Habits</button></div>'
  return `<div class="fl-repair-list">${habits.map(habit => {
    const value = draft[habit.id] || {}
    const measured = habit.target_value || habit.unit || habit.tracking_type === 'measured'
    return `<article data-habit-id="${escapeHtml(habit.id)}"><span class="fl-repair-icon">${escapeHtml((habit.icon && habit.icon.length <= 4) ? habit.icon : '✓')}</span><div><b>${escapeHtml(habit.name)}</b><small>${measured ? `Target: ${escapeHtml(habit.target_value || '—')} ${escapeHtml(habit.unit || '')}` : 'Done or not done'}</small>${measured ? `<input data-habit-value type="number" inputmode="decimal" value="${escapeHtml(value.value || '')}" placeholder="Actual value">` : ''}</div><button type="button" data-habit-done class="${value.completed ? 'done' : ''}">${value.completed ? 'Done' : 'Not done'}</button></article>`
  }).join('')}</div>`
}
function renderHealth() {
  const draft = getDraft('health')
  const metrics = healthMetrics()
  if (!metrics.length) return '<div class="fl-repair-empty"><b>No Health Metrics configured</b><button type="button" data-open-tab="health">Open Health Metrics</button></div>'
  return `<div class="fl-repair-list health">${metrics.map(metric => `<label data-metric-id="${escapeHtml(metric.id)}"><span><b>${escapeHtml(metric.name)}</b><small>${escapeHtml(metric.unit || 'Value')} · ${metric.target ? `Target ${escapeHtml(metric.target)}` : 'Baseline not set'}</small></span><input data-metric-value type="number" inputmode="decimal" value="${escapeHtml(draft[metric.id] || '')}"></label>`).join('')}</div>`
}
function renderGratitude() {
  const draft = getDraft('gratitude')
  return `<label class="fl-repair-note"><span>What are you grateful for?</span><textarea data-gratitude-note placeholder="Write a gratitude note...">${escapeHtml(draft.note || '')}</textarea></label>`
}
function renderModuleShortcut(tab, title) {
  return `<div class="fl-repair-empty"><b>${title}</b><span>Use the full ${title} form for detailed recording.</span><button type="button" data-open-tab="${tab}">Open ${title}</button></div>`
}
function renderContent() {
  if (currentTab === 'habits') return renderHabits()
  if (currentTab === 'health') return renderHealth()
  if (currentTab === 'gratitude') return renderGratitude()
  if (currentTab === 'exercise') return renderModuleShortcut('exercises', 'Exercise')
  if (currentTab === 'sports') return renderModuleShortcut('sports', 'Sports')
  if (currentTab === 'fasting') return renderModuleShortcut('fasting', 'Fasting')
  return ''
}
function createDrawer() {
  if (drawer) return drawer
  drawer = document.createElement('div')
  drawer.className = 'fl-repair-quick-layer'
  drawer.hidden = true
  drawer.innerHTML = '<button class="fl-repair-backdrop" type="button" aria-label="Close Quick Log"></button><aside class="fl-repair-drawer" role="dialog" aria-modal="true" aria-label="Quick Log"></aside>'
  document.body.appendChild(drawer)
  drawer.querySelector('.fl-repair-backdrop').addEventListener('click', closeQuickLog)
  drawer.addEventListener('click', handleDrawerClick)
  drawer.addEventListener('input', handleDrawerInput)
  return drawer
}
function renderDrawer() {
  createDrawer()
  const panel = drawer.querySelector('.fl-repair-drawer')
  panel.innerHTML = `<header><div><small>QUICK LOG</small><h2>Log Day</h2><span class="fl-repair-unsaved" ${dirty ? '' : 'hidden'}>Unsaved changes</span></div><button type="button" data-close-quick aria-label="Close">×</button></header><div class="fl-repair-date"><button type="button" data-date-step="-1">‹</button><time>${escapeHtml(currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</time><button type="button" data-date-step="1" ${dateKey(currentDate) >= dateKey(new Date()) ? 'disabled' : ''}>›</button></div><nav>${renderTabs()}</nav><main>${renderContent()}</main><footer><button type="button" data-close-quick>Cancel</button><button type="button" data-save-quick class="save">Save</button></footer>`
}
function openQuickLog(tab = 'habits') {
  currentTab = tab
  createDrawer()
  const existingDraft = getDraft(tab)
  setDirty(Object.keys(existingDraft).length > 0)
  renderDrawer()
  drawer.hidden = false
  document.body.classList.add('fl-quick-open')
}
function closeQuickLog() {
  confirmDiscard(() => {
    drawer.hidden = true
    document.body.classList.remove('fl-quick-open')
  })
}
function switchTab(tab) {
  confirmDiscard(() => {
    currentTab = tab
    setDirty(Object.keys(getDraft(tab)).length > 0)
    renderDrawer()
  })
}
function saveQuickLog() {
  const day = dateKey(currentDate)
  const draft = getDraft(currentTab)
  if (currentTab === 'habits') {
    const logs = read('fitlife-habit-logs', [])
    const next = [...logs]
    Object.entries(draft).forEach(([habitId, value]) => {
      const index = next.findIndex(row => String(row.habit_id) === String(habitId) && row.log_date === day)
      const row = { ...(index >= 0 ? next[index] : {}), id: index >= 0 ? next[index].id : crypto.randomUUID(), habit_id: habitId, log_date: day, completed: Boolean(value.completed), value: value.value === '' || value.value == null ? null : Number(value.value), updated_at: new Date().toISOString() }
      if (index >= 0) next[index] = row
      else next.unshift(row)
    })
    localStorage.setItem('fitlife-habit-logs', JSON.stringify(next))
  } else if (currentTab === 'health') {
    const rows = read('fitlife-health-readings', [])
    const next = [...rows]
    Object.entries(draft).forEach(([metricId, value]) => {
      if (value === '') return
      const index = next.findIndex(row => String(row.metric_id) === String(metricId) && String(row.recorded_at || row.date).slice(0, 10) === day)
      const row = { ...(index >= 0 ? next[index] : {}), id: index >= 0 ? next[index].id : crypto.randomUUID(), metric_id: metricId, value: Number(value), recorded_at: `${day}T12:00:00.000Z`, updated_at: new Date().toISOString() }
      if (index >= 0) next[index] = row
      else next.unshift(row)
    })
    localStorage.setItem('fitlife-health-readings', JSON.stringify(next))
  } else if (currentTab === 'gratitude' && draft.note?.trim()) {
    const rows = read('fitlife-grateful-entries', [])
    rows.unshift({ id: crypto.randomUUID(), entry_date: day, note: draft.note.trim(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    localStorage.setItem('fitlife-grateful-entries', JSON.stringify(rows))
  }
  clearDraft(currentTab)
  setDirty(false)
  window.dispatchEvent(new CustomEvent('fitlife:quick-log-saved', { detail: { tab: currentTab, date: day } }))
  drawer.hidden = true
  document.body.classList.remove('fl-quick-open')
  window.location.reload()
}
function handleDrawerClick(event) {
  const tab = event.target.closest('[data-quick-tab]')?.dataset.quickTab
  if (tab) return switchTab(tab)
  if (event.target.closest('[data-close-quick]')) return closeQuickLog()
  if (event.target.closest('[data-save-quick]')) return saveQuickLog()
  const dateStep = event.target.closest('[data-date-step]')?.dataset.dateStep
  if (dateStep) return confirmDiscard(() => { currentDate = new Date(currentDate.getTime() + Number(dateStep) * 86400000); setDirty(Object.keys(getDraft()).length > 0); renderDrawer() })
  const moduleTab = event.target.closest('[data-open-tab]')?.dataset.openTab
  if (moduleTab) return confirmDiscard(() => { drawer.hidden = true; document.body.classList.remove('fl-quick-open'); window.location.hash = moduleTab; window.dispatchEvent(new HashChangeEvent('hashchange')) })
  const habitDone = event.target.closest('[data-habit-done]')
  if (habitDone) {
    const article = habitDone.closest('[data-habit-id]')
    const draft = getDraft('habits')
    const id = article.dataset.habitId
    draft[id] = { ...(draft[id] || {}), completed: !draft[id]?.completed }
    saveDraft('habits', draft); renderDrawer()
  }
}
function handleDrawerInput(event) {
  const article = event.target.closest('[data-habit-id]')
  if (article && event.target.matches('[data-habit-value]')) {
    const draft = getDraft('habits'); const id = article.dataset.habitId
    draft[id] = { ...(draft[id] || {}), value: event.target.value }; saveDraft('habits', draft)
  }
  const metric = event.target.closest('[data-metric-id]')
  if (metric && event.target.matches('[data-metric-value]')) {
    const draft = getDraft('health'); draft[metric.dataset.metricId] = event.target.value; saveDraft('health', draft)
  }
  if (event.target.matches('[data-gratitude-note]')) saveDraft('gratitude', { note: event.target.value })
}

function installButtonRouting() {
  document.addEventListener('click', event => {
    const control = event.target.closest('button,a,[role="button"]')
    if (!control || control.closest('.fl-repair-quick-layer')) return
    const label = `${control.textContent || ''} ${control.getAttribute('aria-label') || ''} ${control.title || ''}`.trim()
    if (/\blog day\b|\bquick log\b/i.test(label)) {
      event.preventDefault(); event.stopImmediatePropagation(); openQuickLog('habits')
    } else if (/gratitude note/i.test(label)) {
      event.preventDefault(); event.stopImmediatePropagation(); openQuickLog('gratitude')
    }
  }, true)
}

function installGlobalDirtyGuard() {
  window.addEventListener('beforeunload', event => {
    const activeDirty = dirty || document.querySelector('form[data-dirty="true"], [data-unsaved="true"], [data-fitlife-dirty="true"]')
    if (activeDirty) { event.preventDefault(); event.returnValue = '' }
  })
  document.addEventListener('input', event => {
    const editable = event.target.closest('form, .gratitude-form, .grateful-form, .sports-form, .habit-form, .metric-form, [role="dialog"]')
    if (editable && !editable.closest('.fl-repair-quick-layer')) editable.dataset.fitlifeDirty = 'true'
  }, true)
  document.addEventListener('submit', event => {
    const form = event.target.closest('form')
    if (form) setTimeout(() => delete form.dataset.fitlifeDirty, 500)
  }, true)
}

async function optimiseImage(file) {
  if (!file || (!file.type.startsWith('image/') && !/\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name || ''))) return file
  const image = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const element = new Image()
    element.onload = () => { URL.revokeObjectURL(url); resolve(element) }
    element.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be converted. Try a JPEG, PNG, screenshot, or another iPhone photo.')) }
    element.src = url
  })
  const mode = localStorage.getItem('fitlife-photo-quality') || 'balanced'
  const preset = mode === 'save' ? [1280, .70] : mode === 'high' ? [2048, .88] : [1600, .80]
  const ratio = Math.min(1, preset[0] / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const context = canvas.getContext('2d', { alpha: false }); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image compression failed.')), 'image/webp', preset[1]))
  return new File([blob], `${(file.name || 'photo').replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: Date.now() })
}
function installStorageCompression() {
  if (!supabase || uploadPatchInstalled) return
  uploadPatchInstalled = true
  const nativeFrom = supabase.storage.from.bind(supabase.storage)
  supabase.storage.from = bucket => {
    const api = nativeFrom(bucket)
    const nativeUpload = api.upload.bind(api)
    api.upload = async (path, body, options = {}) => {
      if (body instanceof File && (body.type.startsWith('image/') || /\.(heic|heif)$/i.test(body.name))) {
        try {
          const optimised = await optimiseImage(body)
          path = path.replace(/\.[^.]+$/, '.webp')
          return nativeUpload(path, optimised, { ...options, contentType: 'image/webp' })
        } catch (error) {
          console.error('[FitLife media] Optimisation failed', error)
          throw error
        }
      }
      return nativeUpload(path, body, options)
    }
    return api
  }
}

function init() {
  createDrawer(); installButtonRouting(); installGlobalDirtyGuard(); installStorageCompression()
  window.fitlifeUXRepair = { openQuickLog, closeQuickLog, optimiseImage, isDirty: () => dirty }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()
