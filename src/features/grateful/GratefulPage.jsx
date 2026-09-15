import { useEffect, useMemo, useState } from 'react'
import { BookHeart, CalendarDays, ChevronLeft, ChevronRight, Edit3, Heart, Image, List, Plus, Search, Star, Trash2, X } from 'lucide-react'
import GratitudeEntryForm from './GratitudeEntryForm'
import { deleteGratitude, listGratitude, saveGratitude, subscribeGratitude } from './gratitudeStore'
import './GratefulPage.css'

const modes=['Week','Month','Year','Journal']
const monthName=date=>new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(date)
const isoDate=date=>date.toISOString().slice(0,10)

export default function GratefulPage(){
  const[entries,setEntries]=useState([]),[mode,setMode]=useState('Month'),[anchor,setAnchor]=useState(new Date('2026-09-06T12:00:00')),[search,setSearch]=useState(''),[filter,setFilter]=useState('All'),[drawer,setDrawer]=useState(null),[detail,setDetail]=useState(null),[deleting,setDeleting]=useState(null),[loading,setLoading]=useState(true)
  async function refresh(){setLoading(true);setEntries(await listGratitude());setLoading(false)}
  useEffect(()=>{refresh();return subscribeGratitude(setEntries)},[])
  async function save(entry,files){await saveGratitude(entry,files);setDrawer(null);await refresh()}
  async function remove(){await deleteGratitude(deleting);setDeleting(null);setDetail(null);await refresh()}

  const visible=useMemo(()=>entries.filter(entry=>{const q=search.toLowerCase();const matchesSearch=!q||(entry.title||'').toLowerCase().includes(q)||entry.body.toLowerCase().includes(q);const matchesFilter=filter==='All'||(filter==='Photos'&&entry.photos?.length)||(filter==='Favorites'&&entry.favorite)||(filter==='No photos'&&!entry.photos?.length);return matchesSearch&&matchesFilter}),[entries,search,filter])
  const byDate=useMemo(()=>Object.groupBy?Object.groupBy(visible,e=>e.entry_date):visible.reduce((a,e)=>((a[e.entry_date]??=[]).push(e),a),{}),[visible])
  function move(delta){const d=new Date(anchor);if(mode==='Week')d.setDate(d.getDate()+7*delta);else if(mode==='Year')d.setFullYear(d.getFullYear()+delta);else d.setMonth(d.getMonth()+delta);setAnchor(d)}
  function calendarDays(){const first=new Date(anchor.getFullYear(),anchor.getMonth(),1);const start=new Date(first);const monday=(first.getDay()+6)%7;start.setDate(first.getDate()-monday);return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})}

  return <section className="grateful-page">
    <div className="grateful-heading"><div><small>GRATITUDE JOURNAL</small><h2>Grateful</h2><p>Return to the moments, people, and small wins already recorded.</p></div><button className="grateful-add" onClick={()=>setDrawer({type:'add'})}><Plus size={18}/>New gratitude</button></div>
    <div className="grateful-toolbar"><div className="grateful-modes">{modes.map(item=><button className={mode===item?'selected':''} onClick={()=>setMode(item)} key={item}>{item}</button>)}</div><label className="grateful-search"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search your journal"/></label><select value={filter} onChange={event=>setFilter(event.target.value)}><option>All</option><option>Favorites</option><option>Photos</option><option>No photos</option></select></div>
    <div className="grateful-period"><button onClick={()=>move(-1)}><ChevronLeft/></button><h3>{mode==='Year'?anchor.getFullYear():monthName(anchor)}</h3><button onClick={()=>move(1)}><ChevronRight/></button></div>

    {mode==='Month'&&<div className="gratitude-calendar"><div className="weekday-row">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{calendarDays().map(day=>{const key=isoDate(day);const dayEntries=byDate[key]||[];const outside=day.getMonth()!==anchor.getMonth();return <button key={key} className={`${outside?'outside':''} ${dayEntries.length?'has-entry':''}`} onClick={()=>dayEntries[0]&&setDetail(dayEntries[0])}><b>{day.getDate()}</b><span>{dayEntries.slice(0,3).map((entry,i)=><i className={entry.favorite?'favorite':''} key={entry.id+i}>♥</i>)}</span>{dayEntries.some(e=>e.photos?.length>0)&&<Image size={12}/>}</button>})}</div></div>}

    {mode==='Week'&&<div className="gratitude-week">{Array.from({length:7},(_,i)=>{const d=new Date(anchor);const dow=(anchor.getDay()+6)%7;d.setDate(anchor.getDate()-dow+i);const rows=byDate[isoDate(d)]||[];return <article key={i}><small>{new Intl.DateTimeFormat('en-GB',{weekday:'short'}).format(d)}</small><b>{d.getDate()}</b><span>{rows.length} {rows.length===1?'entry':'entries'}</span>{rows.map(row=><button onClick={()=>setDetail(row)} key={row.id}>♥ {row.title||row.body.slice(0,20)}</button>)}</article>})}</div>}

    {mode==='Year'&&<div className="gratitude-year">{Array.from({length:12},(_,month)=><button key={month} onClick={()=>{setAnchor(new Date(anchor.getFullYear(),month,1));setMode('Month')}}><strong>{new Intl.DateTimeFormat('en-GB',{month:'short'}).format(new Date(2026,month,1))}</strong><span>{visible.filter(e=>new Date(e.entry_date+'T12:00').getFullYear()===anchor.getFullYear()&&new Date(e.entry_date+'T12:00').getMonth()===month).length}</span><small>entries</small></button>)}</div>}

    {mode==='Journal'&&<div className="gratitude-journal">{visible.length===0?<div className="gratitude-empty">No gratitude entries in this view.</div>:visible.map(entry=><article key={entry.id} onClick={()=>setDetail(entry)}><div><time>{entry.entry_date} · {entry.entry_time}</time>{entry.favorite&&<Star size={15} fill="currentColor"/>}</div><h3>{entry.title||'Gratitude note'}</h3><p>{entry.body}</p>{entry.photos?.length>0&&<span><Image size={14}/>{entry.photos.length} photo{entry.photos.length>1?'s':''}</span>}</article>)}</div>}

    {mode==='Month'&&<div className="gratitude-recent"><h3>Recent entries</h3>{loading?<p>Loading journal…</p>:visible.slice(0,6).map(entry=><article key={entry.id} onClick={()=>setDetail(entry)}><div className="gratitude-card-icon"><Heart fill="currentColor"/></div><div><small>{entry.entry_date} · {entry.entry_time}</small><h4>{entry.title||'Gratitude note'}</h4><p>{entry.body}</p></div><span className={`sync-${entry.sync_status||'local'}`}>{entry.sync_status||'local'}</span></article>)}</div>}

    {drawer&&<div className="gratitude-layer"><button className="gratitude-backdrop" onClick={()=>setDrawer(null)}/><aside className="gratitude-drawer"><div className="gratitude-drawer-head"><div><small>{drawer.type==='edit'?'EDIT GRATITUDE':'ADD GRATITUDE'}</small><h2>{drawer.type==='edit'?'Update this memory':'Capture the thought'}</h2></div><button onClick={()=>setDrawer(null)}><X/></button></div><GratitudeEntryForm entry={drawer.entry} onCancel={()=>setDrawer(null)} onSave={save}/></aside></div>}

    {detail&&<div className="gratitude-layer"><button className="gratitude-backdrop" onClick={()=>setDetail(null)}/><article className="gratitude-detail"><button className="close" onClick={()=>setDetail(null)}><X/></button><small>{detail.entry_date} · {detail.entry_time}</small><h2>{detail.title||'Gratitude note'}</h2><p>{detail.body}</p><div className="gratitude-detail-actions"><button onClick={()=>setDrawer({type:'edit',entry:detail})}><Edit3/>Edit</button><button className="danger" onClick={()=>setDeleting(detail)}><Trash2/>Delete</button></div></article></div>}

    {deleting&&<div className="gratitude-layer"><button className="gratitude-backdrop" onClick={()=>setDeleting(null)}/><section className="gratitude-delete"><Trash2/><h2>Delete this entry?</h2><p>The note will be removed from Grateful, My Life, and Log History on every synced device.</p><div><button onClick={()=>setDeleting(null)}>Cancel</button><button className="danger" onClick={remove}>Delete entry</button></div></section></div>}
  </section>
}
