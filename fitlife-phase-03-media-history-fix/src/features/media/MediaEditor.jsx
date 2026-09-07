import { ImagePlus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { compressImageToDataUrl } from './imagePersistence'

export default function MediaEditor({ existing = [], positionX = 50, positionY = 50, onChange }) {
  const [photos, setPhotos] = useState(existing.filter(photo => photo?.preview || photo?.url || photo?.signed_url || photo?.data_url))
  const [featured, setFeatured] = useState(0)
  const [x, setX] = useState(positionX)
  const [y, setY] = useState(positionY)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    onChange?.({ photos, featured, positionX: Number(x), positionY: Number(y) })
  }, [photos, featured, x, y])

  async function addFiles(fileList) {
    setBusy(true)
    const additions = []
    for (const file of Array.from(fileList || [])) {
      try {
        const dataUrl = await compressImageToDataUrl(file)
        additions.push({ id: crypto.randomUUID(), data_url: dataUrl, preview: dataUrl, name: file.name, type: 'image/webp' })
      } catch (error) {
        console.error('Unable to process image', error)
      }
    }
    setPhotos(current => [...current, ...additions])
    setBusy(false)
  }

  const source = photo => photo.signed_url || photo.url || photo.data_url || photo.preview
  return <div className="media-editor">
    <label className="media-upload"><ImagePlus/><span>{busy ? 'Preparing photographs…' : 'Add photographs'}</span><small>Images are compressed before saving</small><input type="file" accept="image/*,.heic,.heif" multiple disabled={busy} onChange={event => addFiles(event.target.files)}/></label>
    {photos.length > 0 && <>
      <div className="media-thumbnails">{photos.map((photo,index)=><figure className={featured===index?'featured':''} key={photo.id||index}><img src={source(photo)} onError={event=>{event.currentTarget.style.display='none'}}/><button type="button" className="media-feature" onClick={()=>setFeatured(index)} title="Use as featured photo"><Star fill={featured===index?'currentColor':'none'}/></button><button type="button" className="media-remove" onClick={()=>{const next=photos.filter((_,i)=>i!==index);setPhotos(next);setFeatured(Math.min(featured,Math.max(0,next.length-1)))}}><Trash2/></button></figure>)}</div>
      <div className="media-position-preview"><img src={source(photos[featured])} style={{objectPosition:`${x}% ${y}%`}}/></div>
      <label className="media-slider">Horizontal photo position<input type="range" min="0" max="100" value={x} onChange={event=>setX(event.target.value)}/></label>
      <label className="media-slider">Vertical photo position<input type="range" min="0" max="100" value={y} onChange={event=>setY(event.target.value)}/></label>
    </>}
  </div>
}
