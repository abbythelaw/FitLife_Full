import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Crosshair, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import './PhotoPositioner.css'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const normalize = value => ({ x: value?.x ?? 50, y: value?.y ?? 50, scale: value?.scale ?? 1 })

export default function PhotoPositioner({
  src,
  alt = '',
  value,
  onChange,
  onSave,
  aspectRatio = 16 / 9,
  minScale = 1,
  maxScale = 3,
  disabled = false,
  className = '',
}) {
  const viewportRef = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const [position, setPosition] = useState(() => normalize(value))

  useEffect(() => setPosition(normalize(value)), [value?.x, value?.y, value?.scale])
  const commit = next => {
    const safe = { x: clamp(next.x, 0, 100), y: clamp(next.y, 0, 100), scale: clamp(next.scale, minScale, maxScale) }
    setPosition(safe)
    onChange?.(safe)
  }
  const pointDistance = list => list.length < 2 ? 0 : Math.hypot(list[1].x - list[0].x, list[1].y - list[0].y)
  const pointerList = () => [...pointers.current.values()]

  function begin(event) {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const list = pointerList()
    gesture.current = {
      origin: position,
      centroid: {
        x: list.reduce((sum, p) => sum + p.x, 0) / list.length,
        y: list.reduce((sum, p) => sum + p.y, 0) / list.length,
      },
      distance: pointDistance(list),
    }
  }
  function move(event) {
    if (!pointers.current.has(event.pointerId) || disabled) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const list = pointerList()
    const box = viewportRef.current?.getBoundingClientRect()
    if (!box || !gesture.current) return
    const centroid = {
      x: list.reduce((sum, p) => sum + p.x, 0) / list.length,
      y: list.reduce((sum, p) => sum + p.y, 0) / list.length,
    }
    const scale = list.length > 1 && gesture.current.distance
      ? gesture.current.origin.scale * (pointDistance(list) / gesture.current.distance)
      : gesture.current.origin.scale
    const sensitivity = 100 / Math.max(1, Math.min(box.width, box.height) * scale)
    commit({
      x: gesture.current.origin.x - (centroid.x - gesture.current.centroid.x) * sensitivity,
      y: gesture.current.origin.y - (centroid.y - gesture.current.centroid.y) * sensitivity,
      scale,
    })
  }
  function end(event) {
    pointers.current.delete(event.pointerId)
    if (!pointers.current.size) gesture.current = null
    else begin({ ...event, currentTarget: viewportRef.current })
  }
  const imageStyle = useMemo(() => ({
    objectPosition: `${position.x}% ${position.y}%`,
    transform: `scale(${position.scale})`,
  }), [position])

  return <section className={`fl-photo-positioner ${disabled ? 'disabled' : ''} ${className}`}>
    <div
      ref={viewportRef}
      className="fl-photo-viewport"
      style={{ aspectRatio }}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="application"
      aria-label="Drag the image to position it. Use two fingers or the zoom controls to resize."
    >
      <img src={src} alt={alt} draggable="false" style={imageStyle}/>
      {!disabled && <><Crosshair className="fl-photo-crosshair"/><span className="fl-photo-hint">Drag to reposition · pinch to zoom</span></>}
    </div>
    {!disabled && <div className="fl-photo-controls">
      <button type="button" onClick={() => commit({ ...position, scale: position.scale - .1 })} aria-label="Zoom out"><ZoomOut/></button>
      <input aria-label="Photo zoom" type="range" min={minScale} max={maxScale} step="0.01" value={position.scale} onChange={event => commit({ ...position, scale: Number(event.target.value) })}/>
      <button type="button" onClick={() => commit({ ...position, scale: position.scale + .1 })} aria-label="Zoom in"><ZoomIn/></button>
      <button type="button" onClick={() => commit({ x: 50, y: 50, scale: 1 })} aria-label="Reset photo position"><RotateCcw/></button>
      <button type="button" className="save" onClick={() => onSave?.(position)} aria-label="Save photo position"><Check/></button>
    </div>}
  </section>
}

export function positionedPhotoStyle(position) {
  const safe = normalize(position)
  return { objectPosition: `${safe.x}% ${safe.y}%`, transform: `scale(${safe.scale})` }
}
