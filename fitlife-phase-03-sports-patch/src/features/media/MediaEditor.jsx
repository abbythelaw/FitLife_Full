import { ImagePlus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function MediaEditor({ existing = [], positionX = 50, positionY = 50, onChange }) {
  const [files, setFiles] = useState([])
  const [photos, setPhotos] = useState(existing)
  const [featured, setFeatured] = useState(0)
  const [x, setX] = useState(positionX)
  const [y, setY] = useState(positionY)
  useEffect(() => { const next = files.map(file => ({ file, preview: URL.createObjectURL(file) })); setPhotos([...existing, ...next]); return () => next.forEach(item => URL.revokeObjectURL(item.preview)) }, [files])
  useEffect(() => onChange?.({ photos, files, featured, positionX: Number(x), positionY: Number(y) }), [photos, featured, x, y])
  return <div className="media-editor">
    <label className="media-upload"><ImagePlus/><span>Add photographs</span><small>Choose multiple images</small><input type="file" accept="image/*,.heic,.heif" multiple onChange={event => setFiles(Array.from(event.target.files || []))}/></label>
    {photos.length > 0 && <><div className="media-thumbnails">{photos.map((photo, index) => <figure className={featured === index ? 'featured' : ''} key={photo.id || photo.preview || index}><img src={photo.preview || photo.url || photo.path}/><button type="button" className="media-feature" onClick={() => setFeatured(index)} title="Use as featured photo"><Star fill={featured === index ? 'currentColor' : 'none'}/></button><button type="button" className="media-remove" onClick={() => { const next = photos.filter((_, i) => i !== index); setPhotos(next); setFeatured(Math.min(featured, Math.max(0, next.length - 1))) }}><Trash2/></button></figure>)}</div><div className="media-position-preview">{photos[featured] && <img src={photos[featured].preview || photos[featured].url || photos[featured].path} style={{ objectPosition: `${x}% ${y}%` }}/>}</div><label className="media-slider">Horizontal photo position<input type="range" min="0" max="100" value={x} onChange={event => setX(event.target.value)}/></label><label className="media-slider">Vertical photo position<input type="range" min="0" max="100" value={y} onChange={event => setY(event.target.value)}/></label></>}
  </div>
}
