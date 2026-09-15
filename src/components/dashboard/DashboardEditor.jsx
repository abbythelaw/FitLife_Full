import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Grip, Minus, Plus, RotateCcw, X } from 'lucide-react'
import './DashboardEditor.css'

const SIZE_MAP = {
  small: { w: 1, h: 2 }, medium: { w: 1, h: 3 }, wide: { w: 2, h: 3 }, large: { w: 2, h: 4 }, tall: { w: 1, h: 5 },
}
const SIZE_ORDER = ['small', 'medium', 'wide', 'large', 'tall']
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export default function DashboardEditor({
  widgets,
  value,
  onChange,
  columns = 4,
  rows = 12,
  renderWidget,
  storageKey,
  onDone,
}) {
  const gridRef = useRef(null)
  const [layout, setLayout] = useState(() => value || loadLayout(storageKey, widgets, columns))
  const [dragging, setDragging] = useState(null)
  const [hoverCell, setHoverCell] = useState(null)
  const pointerOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (value) setLayout(value)
  }, [value])
  function commit(next) {
    setLayout(next)
    onChange?.(next)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next))
  }
  function startDrag(event, item) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const card = event.currentTarget.closest('.fl-editor-widget')?.getBoundingClientRect()
    pointerOffset.current = { x: event.clientX - (card?.left || event.clientX), y: event.clientY - (card?.top || event.clientY) }
    setDragging(item.id)
    updateHover(event)
  }
  function updateHover(event) {
    if (!gridRef.current) return
    const box = gridRef.current.getBoundingClientRect()
    const cellW = box.width / columns
    const cellH = parseFloat(getComputedStyle(gridRef.current).getPropertyValue('--editor-row')) || 76
    setHoverCell({
      x: clamp(Math.floor((event.clientX - box.left - pointerOffset.current.x) / cellW), 0, columns - 1),
      y: clamp(Math.floor((event.clientY - box.top - pointerOffset.current.y) / cellH), 0, rows - 1),
    })
  }
  function endDrag(event) {
    if (!dragging || !hoverCell) return setDragging(null)
    const item = layout.find(x => x.id === dragging)
    const size = SIZE_MAP[item.size] || SIZE_MAP.medium
    const target = {
      ...item,
      x: clamp(hoverCell.x, 0, columns - size.w),
      y: clamp(hoverCell.y, 0, rows - size.h),
    }
    commit(resolveCollisions(layout, target, columns, rows))
    setDragging(null)
    setHoverCell(null)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }
  function changeSize(id, direction) {
    const current = layout.find(x => x.id === id)
    const index = SIZE_ORDER.indexOf(current.size)
    const nextSize = SIZE_ORDER[clamp(index + direction, 0, SIZE_ORDER.length - 1)]
    commit(resolveCollisions(layout, { ...current, size: nextSize }, columns, rows))
  }
  function remove(id) { commit(layout.map(item => item.id === id ? { ...item, hidden: true } : item)) }
  function reset() { commit(createDefaultLayout(widgets, columns)) }
  const occupied = useMemo(() => createOccupancy(layout.filter(x => !x.hidden), columns, rows), [layout, columns, rows])

  return <section className="fl-dashboard-editor">
    <header><div><small>EDIT DASHBOARD</small><h2>Arrange widgets</h2><p>Drag cards into open spaces. Resize or hide cards using the compact controls.</p></div><div><button onClick={reset} aria-label="Reset dashboard"><RotateCcw/></button><button className="done" onClick={() => onDone?.(layout)}><Check/><span>Done</span></button></div></header>
    <div
      ref={gridRef}
      className="fl-editor-grid"
      style={{ '--editor-columns': columns, '--editor-rows': rows }}
      onPointerMove={event => dragging && updateHover(event)}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {Array.from({ length: columns * rows }, (_, index) => {
        const x = index % columns, y = Math.floor(index / columns)
        const free = !occupied.has(`${x}:${y}`)
        return <i className={`fl-editor-slot ${free ? 'free' : 'occupied'}`} style={{ gridColumn: x + 1, gridRow: y + 1 }} key={index}/>
      })}
      {layout.filter(item => !item.hidden).map(item => {
        const size = SIZE_MAP[item.size] || SIZE_MAP.medium
        return <article
          className={`fl-editor-widget ${dragging === item.id ? 'dragging' : ''}`}
          style={{ gridColumn: `${item.x + 1} / span ${size.w}`, gridRow: `${item.y + 1} / span ${size.h}` }}
          key={item.id}
        >
          <div className="fl-editor-widget-controls">
            <button className="drag" onPointerDown={event => startDrag(event, item)} aria-label={`Move ${item.title}`}><Grip/></button>
            <span>{item.title}</span>
            <button onClick={() => changeSize(item.id, -1)} aria-label="Make widget smaller"><Minus/></button>
            <button onClick={() => changeSize(item.id, 1)} aria-label="Make widget larger"><Plus/></button>
            <button onClick={() => remove(item.id)} aria-label={`Hide ${item.title}`}><X/></button>
          </div>
          <div className="fl-editor-widget-preview">{renderWidget?.(item) || <WidgetPreview item={item}/>}</div>
        </article>
      })}
      {dragging && hoverCell && <i className="fl-editor-placeholder" style={{ gridColumn: hoverCell.x + 1, gridRow: hoverCell.y + 1 }}/>} 
    </div>
  </section>
}

function WidgetPreview({ item }) { return <><small>{item.category || 'WIDGET'}</small><b>{item.title}</b><span>{item.description || 'Widget preview'}</span></> }
function overlaps(a, b) {
  const as = SIZE_MAP[a.size] || SIZE_MAP.medium, bs = SIZE_MAP[b.size] || SIZE_MAP.medium
  return a.x < b.x + bs.w && a.x + as.w > b.x && a.y < b.y + bs.h && a.y + as.h > b.y
}
function resolveCollisions(layout, target, columns, rows) {
  const next = layout.map(item => item.id === target.id ? target : { ...item })
  const size = SIZE_MAP[target.size] || SIZE_MAP.medium
  target.x = clamp(target.x, 0, columns - size.w)
  target.y = clamp(target.y, 0, rows - size.h)
  for (const item of next) {
    if (item.id === target.id || item.hidden || !overlaps(item, target)) continue
    const itemSize = SIZE_MAP[item.size] || SIZE_MAP.medium
    let placed = false
    for (let y = 0; y <= rows - itemSize.h && !placed; y++) {
      for (let x = 0; x <= columns - itemSize.w && !placed; x++) {
        const candidate = { ...item, x, y }
        if (!next.some(other => other.id !== item.id && !other.hidden && overlaps(candidate, other))) {
          Object.assign(item, candidate); placed = true
        }
      }
    }
  }
  return next
}
function createOccupancy(layout, columns, rows) {
  const cells = new Set()
  for (const item of layout) {
    const size = SIZE_MAP[item.size] || SIZE_MAP.medium
    for (let y = item.y; y < Math.min(rows, item.y + size.h); y++) for (let x = item.x; x < Math.min(columns, item.x + size.w); x++) cells.add(`${x}:${y}`)
  }
  return cells
}
function createDefaultLayout(widgets, columns) {
  let x = 0, y = 0
  return widgets.map(widget => {
    const size = SIZE_MAP[widget.defaultSize || 'medium'] || SIZE_MAP.medium
    if (x + size.w > columns) { x = 0; y += 3 }
    const item = { ...widget, size: widget.defaultSize || 'medium', x, y, hidden: false }
    x += size.w
    return item
  })
}
function loadLayout(key, widgets, columns) {
  if (key) try { const saved = JSON.parse(localStorage.getItem(key)); if (Array.isArray(saved)) return saved } catch {}
  return createDefaultLayout(widgets, columns)
}
