const ORDER_KEY = 'fitlife-snapshot-order'
const NAV_MAP = [
  [/view analytics|analytics/i, 'analytics'],
  [/view fasting|open fasting|fasting details/i, 'fasting'],
  [/view habit|today.s habits|habits/i, 'habits'],
  [/view all.*sport|go to sports|sports/i, 'sports'],
  [/view all.*timeline|log history|history/i, 'history'],
  [/exercise|workout/i, 'exercises'],
  [/health metric|sleep|steps|rhr|hrv/i, 'health'],
]

function snapshotRoot() { return document.querySelector('.snapshot-unified') }
function widgetId(node) {
  const known = [...node.classList].find(name => name.startsWith('su-') && !['su-widget','su-card'].includes(name))
  return node.dataset.snapshotWidget || known?.replace(/^su-/, '') || node.id || ''
}
function currentWidgets(root) { return [...root.querySelectorAll('.su-layout > .su-widget')] }
function saveOrder(root) {
  const order = currentWidgets(root).map(widgetId).filter(Boolean)
  if (order.length) localStorage.setItem(ORDER_KEY, JSON.stringify(order))
}
function reorderDom(root, ids) {
  const layout = root.querySelector('.su-layout')
  if (!layout) return
  const widgets = currentWidgets(root)
  const byId = new Map(widgets.map(node => [widgetId(node), node]))
  ids.forEach(id => { const node = byId.get(id); if (node) layout.appendChild(node) })
  widgets.forEach(node => { if (!ids.includes(widgetId(node))) layout.appendChild(node) })
}

function enableTouchEditor(root) {
  let dragging = null
  let target = null
  const clear = () => {
    dragging?.classList.remove('snap-dragging')
    target?.classList.remove('snap-drop-target')
    dragging = null
    target = null
  }
  root.addEventListener('pointerdown', event => {
    if (!root.classList.contains('editing')) return
    const handle = event.target.closest('.su-widget-tools')
    const widget = handle?.closest('.su-widget')
    if (!handle || !widget) return
    dragging = widget
    widget.classList.add('snap-dragging')
    handle.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  })
  root.addEventListener('pointermove', event => {
    if (!dragging) return
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('.su-widget')
    if (!hit || hit === dragging || !hit.closest('.snapshot-unified')) return
    target?.classList.remove('snap-drop-target')
    target = hit
    target.classList.add('snap-drop-target')
    const layout = root.querySelector('.su-layout')
    const box = hit.getBoundingClientRect()
    layout.insertBefore(dragging, event.clientY < box.top + box.height / 2 ? hit : hit.nextSibling)
  })
  const finish = () => {
    if (!dragging) return
    saveOrder(root)
    root.dispatchEvent(new CustomEvent('fitlife:snapshot-order-changed', { detail: localStorage.getItem(ORDER_KEY) }))
    clear()
  }
  root.addEventListener('pointerup', finish)
  root.addEventListener('pointercancel', clear)
}

function addNavigationFallbacks(root) {
  root.addEventListener('click', event => {
    const control = event.target.closest('button,a,[role="button"]')
    if (!control || control.disabled) return
    if (control.tagName === 'A' && control.getAttribute('href')) return
    const label = `${control.getAttribute('aria-label') || ''} ${control.getAttribute('title') || ''} ${control.textContent || ''}`.trim()
    if (!label) return
    const match = NAV_MAP.find(([pattern]) => pattern.test(label))
    if (!match) return
    requestAnimationFrame(() => {
      if (event.defaultPrevented) return
      const tab = match[1]
      if (tab === 'health') {
        const metric = /sleep/i.test(label) ? 'sleep' : /steps/i.test(label) ? 'steps' : /hrv/i.test(label) ? 'hrv' : /rhr/i.test(label) ? 'rhr' : ''
        if (metric) localStorage.setItem('fitlife-open-health-metric', metric)
      }
      window.location.hash = tab
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
  }, { capture: false })
}

function markCompactControls(root) {
  root.querySelectorAll('.su-page-head button').forEach(button => {
    const text = button.textContent.trim()
    if (text && !button.title) button.title = text
    if (text && !button.getAttribute('aria-label')) button.setAttribute('aria-label', text)
  })
}

function init() {
  const root = snapshotRoot()
  if (!root || root.dataset.enhancementV1 === 'ready') return
  root.dataset.enhancementV1 = 'ready'
  try {
    const stored = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]')
    if (Array.isArray(stored)) reorderDom(root, stored)
  } catch {}
  enableTouchEditor(root)
  addNavigationFallbacks(root)
  markCompactControls(root)
}

const observer = new MutationObserver(init)
observer.observe(document.documentElement, { childList: true, subtree: true })
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()
window.fitlifeSnapshotEnhancement = { init, saveOrder: () => snapshotRoot() && saveOrder(snapshotRoot()) }
