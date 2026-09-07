import { useEffect, useState } from 'react'
import { Camera, ImagePlus, Star, Trash2, X } from 'lucide-react'

const today=()=>new Date().toISOString().slice(0,10)
const nowTime=()=>new Date().toTimeString().slice(0,5)

export default function GratitudeEntryForm({entry,onCancel,onSave}){
  const[title,setTitle]=useState(entry?.title||'')
  const[body,setBody]=useState(entry?.body||'')
  const[date,setDate]=useState(entry?.entry_date||today())
  const[time,setTime]=useState(entry?.entry_time||nowTime())
  const[favorite,setFavorite]=useState(!!entry?.favorite)
  const[files,setFiles]=useState([])
  const[previews,setPreviews]=useState([])

  useEffect(()=>{const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(URL.revokeObjectURL)},[files])
  function submit(event){event.preventDefault();if(!body.trim())return;onSave({...entry,title:title.trim(),body:body.trim(),entry_date:date,entry_time:time,favorite},files)}
  return <form className="gratitude-form" onSubmit={submit}>
    <div className="gratitude-form-top"><button type="button" className={`gratitude-favorite ${favorite?'is-on':''}`} onClick={()=>setFavorite(!favorite)}><Star size={17} fill={favorite?'currentColor':'none'}/>{favorite?'Favorite':'Add to favorites'}</button></div>
    <label>Title <span>Optional</span><input value={title} onChange={event=>setTitle(event.target.value)} placeholder="A short title"/></label>
    <label>What are you grateful for?<textarea value={body} onChange={event=>setBody(event.target.value)} placeholder="Capture the thought before it disappears..." autoFocus/></label>
    <div className="gratitude-date-row"><label>Date<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label>Time<input type="time" value={time} onChange={event=>setTime(event.target.value)}/></label></div>
    <label className="gratitude-upload"><ImagePlus size={18}/><span>Add photographs</span><small>JPEG, PNG, HEIC or WebP</small><input type="file" accept="image/*,.heic,.heif" multiple onChange={event=>setFiles(Array.from(event.target.files||[]))}/></label>
    {previews.length>0&&<div className="gratitude-photo-previews">{previews.map((src,index)=><figure key={src}><img src={src}/><button type="button" onClick={()=>setFiles(files.filter((_,i)=>i!==index))}><X size={14}/></button></figure>)}</div>}
    <div className="gratitude-form-actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button type="submit" className="primary"><Camera size={17}/>{entry?'Save changes':'Save gratitude'}</button></div>
  </form>
}
