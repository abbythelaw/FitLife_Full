const ICON_MAP = {
  language: '◉', languages: '◉', italian: '◉', learning: '◉',
  walk: '◌', walking: '◌', footprint: '◌', footprints: '◌', movement: '◌',
  water: '◆', hydration: '◆', droplets: '◆',
  sleep: '☾', moon: '☾', rest: '☾',
  exercise: '◇', workout: '◇', dumbbell: '◇',
  mindfulness: '✦', meditation: '✦', brain: '✦',
  reading: '▤', book: '▤',
  habit: '✓', target: '✓', check: '✓',
}

function iconToken(value) {
  const raw = String(value || '').trim()
  if (!raw) return '✓'
  if (raw.length <= 4 && !/[a-z]/i.test(raw)) return raw
  const key = raw.replace(/[^a-z]/gi, '').toLowerCase()
  return ICON_MAP[key] || ICON_MAP[Object.keys(ICON_MAP).find(item => key.includes(item))] || '✓'
}

function habitRecords() {
  try { return JSON.parse(localStorage.getItem('fitlife-habits') || '[]') } catch { return [] }
}

function selectedHabit(card) {
  const selected = card.querySelector('select')?.value
  const title = card.querySelector('.su-habit-selected h3,.su-habit-detail h3,h3')?.textContent?.trim()
  return habitRecords().find(row => String(row.id) === String(selected)) || habitRecords().find(row => row.name === title)
}

function repairHabitIcon(card) {
  const habit = selectedHabit(card)
  const title = habit?.name || card.querySelector('.su-habit-selected h3,.su-habit-detail h3,h3')?.textContent?.trim() || 'Habit'
  const category = habit?.category || habit?.group || habit?.type || 'Habit'
  const token = iconToken(habit?.icon || category)
  let host = card.querySelector('.fl-habit-contribution-icon')
  if (!host) {
    const detail = card.querySelector('.su-habit-selected,.su-habit-detail')
    if (!detail) return
    host = document.createElement('span')
    host.className = 'fl-habit-contribution-icon'
    detail.prepend(host)
  }
  host.textContent = token
  host.setAttribute('aria-label', `${title} icon`)
  card.querySelectorAll('.su-habit-selected>span:not(.fl-habit-contribution-icon),.su-habit-detail>span:not(.fl-habit-contribution-icon)').forEach(node => {
    if (/languages?|footprints?|walking|movement|mindset|hydration|sleep|exercise/i.test(node.textContent || '')) node.hidden = true
  })
  const metadata = card.querySelector('.su-habit-selected p,.su-habit-detail p')
  if (metadata && !metadata.textContent.toLowerCase().includes(category.toLowerCase())) {
    const streak = metadata.textContent.split('·').slice(-1)[0].trim()
    metadata.textContent = `${category} · ${streak}`
  }
}

function parseProgress(card) {
  const percentText = [...card.querySelectorAll('*')].map(node => node.children.length ? '' : node.textContent).find(text => /^\s*\d+(?:\.\d+)?%\s*$/.test(text || ''))
  if (percentText) return Number(percentText.replace('%', '').trim())
  const elapsed = card.querySelector('.su-fast-elapsed,.su-fast-ring b,.su-fast-ring strong')?.textContent || ''
  const goal = card.querySelector('.su-fast-goal,.su-fast-ring+*')?.textContent || ''
  const toHours = value => { const match = String(value).match(/(?:(\d+):)?(\d+):(\d+)/); return match ? Number(match[1] || 0) + Number(match[2]) / 60 + Number(match[3]) / 3600 : null }
  const elapsedHours = toHours(elapsed)
  const goalHours = Number(String(goal).match(/(\d+(?:\.\d+)?)\s*h/i)?.[1])
  return elapsedHours != null && goalHours ? elapsedHours / goalHours * 100 : 0
}

function updateFastingRing(card) {
  const ring = card.querySelector('.su-fast-ring')
  if (!ring) return
  const progress = Math.max(0, parseProgress(card))
  const capped = Math.min(100, progress)
  ring.style.setProperty('--fast-progress', `${capped * 3.6}deg`)
  ring.dataset.progressState = progress >= 100 ? 'complete' : progress >= 75 ? 'near' : progress >= 50 ? 'mid' : progress >= 25 ? 'early' : 'start'
  ring.dataset.progressOver = progress > 100 ? 'true' : 'false'
  card.style.setProperty('--fast-percent', String(progress))
}

function update() {
  document.querySelectorAll('.snapshot-unified .su-habits,.snapshot-unified .su-habit-contributions').forEach(repairHabitIcon)
  document.querySelectorAll('.snapshot-unified .su-fasting,.fasting-page .current-fast').forEach(updateFastingRing)
}

let frame
const observer = new MutationObserver(() => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(update)
})
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
window.addEventListener('storage', update)
window.addEventListener('fitlife:quick-log-saved', update)
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update)
else update()
window.fitlifeHabitFastingRefinement = { update, iconToken }
