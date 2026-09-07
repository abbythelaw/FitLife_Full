import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'

export default function MediaCarousel({ photos = [], fallbackClass = 'media-fallback', positionX = 50, positionY = 50 }) {
  const [index, setIndex] = useState(0)
  const photo = photos[index]
  if (!photo) return <div className={`media-carousel ${fallbackClass}`}><ImageIcon size={38}/></div>
  return <div className="media-carousel">
    <img src={photo.preview || photo.url || photo.path} style={{ objectPosition: `${positionX}% ${positionY}%` }} />
    {photos.length > 1 && <><button className="media-prev" onClick={event => { event.stopPropagation(); setIndex((index - 1 + photos.length) % photos.length) }}><ChevronLeft/></button><button className="media-next" onClick={event => { event.stopPropagation(); setIndex((index + 1) % photos.length) }}><ChevronRight/></button><span className="media-count">{index + 1}/{photos.length}</span></>}
  </div>
}
