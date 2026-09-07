import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { isDisplayablePhotoSource } from './imagePersistence'

export default function MediaCarousel({ photos = [], fallbackClass = 'media-fallback', positionX = 50, positionY = 50 }) {
  const valid = useMemo(() => photos.filter(photo => isDisplayablePhotoSource(photo?.signed_url || photo?.url || photo?.data_url || photo?.preview)), [photos])
  const [index, setIndex] = useState(0)
  const photo = valid[Math.min(index, Math.max(0, valid.length - 1))]
  const source = photo && (photo.signed_url || photo.url || photo.data_url || photo.preview)
  if (!source) return <div className={`media-carousel ${fallbackClass}`}><ImageIcon size={38}/></div>
  return <div className={`media-carousel ${fallbackClass}`}><img src={source} style={{objectPosition:`${positionX}% ${positionY}%`}} onError={event=>{event.currentTarget.style.display='none'}}/>{valid.length>1&&<><button className="media-prev" onClick={event=>{event.stopPropagation();setIndex((index-1+valid.length)%valid.length)}}><ChevronLeft/></button><button className="media-next" onClick={event=>{event.stopPropagation();setIndex((index+1)%valid.length)}}><ChevronRight/></button><span className="media-count">{index+1}/{valid.length}</span></>}</div>
}
